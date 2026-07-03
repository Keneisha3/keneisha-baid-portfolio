/* The 3D "artificial mind" — a fixed full-screen canvas behind the page.
   Scroll progress (0..1, passed via ref to avoid re-renders) drives the camera:
     0.00–0.30  the bust in darkness, wires pulsing; camera pushes in
     0.30–0.52  inside the cable: tunnel flight
     0.52–1.00  the neural cluster; slow drift while DOM sections scroll  */
import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

const SYNAPSE = new THREE.Color("#37d6f5"); // electric cyan
const COPPER = new THREE.Color("#d98a4a"); // warm copper glow
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t); // smoothstep

/* ---------- the marble bust (CC0, Poly Haven "marble_bust_01") ---------- */
function Bust() {
  const { scene } = useGLTF("/models/bust/marble_bust_01_1k.gltf");
  useMemo(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.material.roughness = 0.55;
        o.material.envMapIntensity = 0.4;
      }
    });
  }, [scene]);
  return (
    <Center position={[0, 0.62, 0]}>
      <primitive object={scene} scale={2.6} />
    </Center>
  );
}

/* ---------- glowing neural wires emerging from the head ---------- */
function makeWireCurves() {
  // Hand-tuned curves that start around the crown and arc outward.
  const defs = [
    [[0.05, 1.18, 0.02], [0.5, 1.7, 0.3], [1.4, 1.9, 0.6], [2.8, 1.4, 1.2]],
    [[-0.08, 1.16, 0.05], [-0.6, 1.75, 0.2], [-1.6, 1.8, -0.4], [-3.0, 1.1, -1.0]],
    [[0.0, 1.2, -0.05], [0.2, 1.9, -0.6], [0.8, 2.4, -1.6], [1.6, 2.9, -3.2]],
    [[-0.04, 1.14, 0.1], [-0.3, 1.6, 0.8], [-0.9, 1.5, 1.9], [-2.0, 1.0, 3.2]],
    [[0.09, 1.1, -0.02], [0.8, 1.35, -0.35], [1.9, 1.1, -0.9], [3.4, 0.6, -1.6]],
    [[-0.06, 1.08, -0.08], [-0.7, 1.2, -0.7], [-1.7, 0.8, -1.5], [-3.0, 0.2, -2.6]],
  ];
  return defs.map(
    (pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))
  );
}

function Wires({ curves }) {
  const pulses = useRef([]);
  const geoms = useMemo(
    () => curves.map((c) => new THREE.TubeGeometry(c, 64, 0.012, 6, false)),
    [curves]
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pulses.current.forEach((m, i) => {
      if (!m) return;
      const curve = curves[Math.floor(i / 2)];
      const u = (t * 0.12 + (i * 0.37) % 1) % 1;
      curve.getPointAt(u, m.position);
      const s = 0.7 + 0.5 * Math.sin(t * 3 + i);
      m.scale.setScalar(s);
    });
  });
  return (
    <group>
      {geoms.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            color="#1a0f08"
            emissive={i % 2 ? SYNAPSE : COPPER}
            emissiveIntensity={0.55}
            roughness={0.4}
            metalness={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      {/* data pulses travelling along the wires */}
      {Array.from({ length: curves.length * 2 }).map((_, i) => (
        <mesh key={`p${i}`} ref={(el) => (pulses.current[i] = el)}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial color={i % 2 ? "#7be9ff" : "#ffc08a"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- ambient dust motes around the bust ---------- */
function Motes({ count = 260 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 12;
      a[i * 3 + 1] = Math.random() * 5 - 0.5;
      a[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return a;
  }, [count]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.012;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#9fd8e8" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

/* ---------- the tunnel (inside the cable), placed far away at x=120 ---------- */
const TUNNEL_X = 120;
const TUNNEL_LEN = 60;
function Tunnel({ scrollRef }) {
  const group = useRef();
  const ringCount = 42;
  const rings = useMemo(
    () =>
      Array.from({ length: ringCount }).map((_, i) => ({
        z: -(i / ringCount) * TUNNEL_LEN,
        r: 1.15 + Math.sin(i * 1.7) * 0.15,
        copper: i % 4 === 0,
      })),
    []
  );
  const streaks = useMemo(() => {
    const n = 320;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const rr = 0.5 + Math.random() * 0.62;
      a[i * 3] = Math.cos(th) * rr;
      a[i * 3 + 1] = Math.sin(th) * rr;
      a[i * 3 + 2] = -Math.random() * TUNNEL_LEN;
    }
    return a;
  }, []);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = clock.elapsedTime * 0.05;
  });
  return (
    <group ref={group} position={[TUNNEL_X, 0, 0]}>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, 0, r.z]} rotation={[0, 0, i * 0.35]}>
          <torusGeometry args={[r.r, 0.016, 6, 40]} />
          <meshBasicMaterial
            color={r.copper ? "#ffb070" : "#45d7f2"}
            toneMapped={false}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={320} array={streaks} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.03} color="#bdeefb" transparent opacity={0.8} sizeAttenuation />
      </points>
      {/* dark cable wall */}
      <mesh>
        <cylinderGeometry args={[1.6, 1.6, TUNNEL_LEN * 2, 24, 1, true]} />
        <meshStandardMaterial color="#05070a" side={THREE.BackSide} roughness={1} />
      </mesh>
    </group>
  );
}

/* ---------- the neural cluster (the "cyber city" of the mind), at x=240 ---------- */
const CLUSTER_X = 240;
function Cluster() {
  const group = useRef();
  const inst = useRef();
  const { nodes, linePositions } = useMemo(() => {
    const rng = (s) => {
      // small seeded RNG so the layout is stable
      let x = s;
      return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
    };
    const rand = rng(42);
    const N = 80;
    const nodes = Array.from({ length: N }).map(() => {
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      const r = 1.6 + rand() * 3.4;
      return {
        pos: new THREE.Vector3(
          r * Math.sin(ph) * Math.cos(th),
          r * Math.cos(ph) * 0.72,
          r * Math.sin(ph) * Math.sin(th)
        ),
        scale: 0.03 + rand() * 0.075,
        phase: rand() * Math.PI * 2,
        copper: rand() > 0.75,
      };
    });
    // connect each node to its 2 nearest neighbours
    const pts = [];
    nodes.forEach((n, i) => {
      const dists = nodes
        .map((m, j) => ({ j, d: n.pos.distanceTo(m.pos) }))
        .filter((e) => e.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      dists.forEach((e) => {
        pts.push(n.pos.x, n.pos.y, n.pos.z);
        pts.push(nodes[e.j].pos.x, nodes[e.j].pos.y, nodes[e.j].pos.z);
      });
    });
    return { nodes, linePositions: new Float32Array(pts) };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) group.current.rotation.y = t * 0.03;
    if (inst.current) {
      nodes.forEach((n, i) => {
        const s = n.scale * (1 + 0.35 * Math.sin(t * 1.6 + n.phase));
        dummy.position.copy(n.pos);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        inst.current.setMatrixAt(i, dummy.matrix);
      });
      inst.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group} position={[CLUSTER_X, 0, 0]}>
      <instancedMesh ref={inst} args={[null, null, nodes.length]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#5fe0f7" toneMapped={false} />
      </instancedMesh>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#1d7f96" transparent opacity={0.35} />
      </lineSegments>
      {/* the core */}
      <mesh>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial
          color="#0a0c10"
          emissive={COPPER}
          emissiveIntensity={1.4}
          wireframe
        />
      </mesh>
    </group>
  );
}

/* ---------- camera director ---------- */
function Director({ scrollRef, curves }) {
  const { camera, pointer } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.8, 0));
  const entry = useMemo(() => curves[2].getPointAt(0.04), [curves]); // the wire we dive into

  useFrame(() => {
    const p = scrollRef.current;

    if (p < 0.3) {
      // Phase 1: approach the bust, then dive at the wire
      const a = ease(clamp01(p / 0.22)); // push-in
      const d = ease(clamp01((p - 0.22) / 0.08)); // dive
      const px = THREE.MathUtils.lerp(0.0, entry.x, d) + pointer.x * 0.12 * (1 - d);
      const py = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.55, 0.95, a), entry.y, d) + pointer.y * 0.06 * (1 - d);
      const pz = THREE.MathUtils.lerp(THREE.MathUtils.lerp(4.6, 2.1, a), entry.z + 0.18, d);
      camera.position.set(px, py, pz);
      look.current.lerp(
        d > 0 ? curves[2].getPointAt(Math.min(0.25, 0.04 + d * 0.2)) : new THREE.Vector3(0, 0.85, 0),
        0.2
      );
      camera.lookAt(look.current);
      camera.fov = 46 + d * 18;
      camera.updateProjectionMatrix();
    } else if (p < 0.52) {
      // Phase 2: flying through the cable
      const t = ease(clamp01((p - 0.3) / 0.22));
      const z = -t * (TUNNEL_LEN - 6);
      const sway = Math.sin(t * 9) * 0.08;
      camera.position.set(TUNNEL_X + sway, Math.cos(t * 7) * 0.06, z);
      camera.lookAt(TUNNEL_X, 0, z - 4);
      camera.fov = 64 - t * 10;
      camera.updateProjectionMatrix();
    } else {
      // Phase 3: drifting around the neural cluster
      const t = clamp01((p - 0.52) / 0.48);
      const ang = t * 1.9 + 0.4;
      const rad = THREE.MathUtils.lerp(9.5, 6.2, ease(t));
      camera.position.set(
        CLUSTER_X + Math.sin(ang) * rad + pointer.x * 0.3,
        1.2 - t * 0.7 + pointer.y * 0.2,
        Math.cos(ang) * rad
      );
      camera.lookAt(CLUSTER_X, 0, 0);
      camera.fov = 54;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/* ---------- the exported canvas ---------- */
export default function NeuralCanvas({ scrollRef }) {
  const curves = useMemo(() => makeWireCurves(), []);
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.55, 4.6], fov: 46 }}
      style={{ position: "fixed", inset: 0, background: "#020204" }}
    >
      <fog attach="fog" args={["#020204", 6, 16]} />
      <ambientLight intensity={0.12} />
      {/* dramatic museum lighting on the bust */}
      <spotLight position={[2.5, 4, 2.5]} angle={0.5} penumbra={0.9} intensity={26} color="#fff4e0" />
      <pointLight position={[-3, 1.2, 1.5]} intensity={5} color="#37d6f5" />
      <pointLight position={[3, 0.6, -2]} intensity={4} color="#d98a4a" />

      <Bust />
      <Wires curves={curves} />
      <Motes />
      <Tunnel scrollRef={scrollRef} />
      <Cluster />
      <Director scrollRef={scrollRef} curves={curves} />

      <EffectComposer>
        <Bloom intensity={1.15} luminanceThreshold={0.25} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload("/models/bust/marble_bust_01_1k.gltf");
