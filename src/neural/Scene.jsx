/* The 3D "artificial mind" — a fixed full-screen canvas behind the page.
   Scroll progress (0..1, passed via ref to avoid re-renders) drives the camera:
     0.00–0.30  the bust in darkness, copper wires pulsing; camera pushes in
     0.30–0.52  inside the cable: a copper-stranded tunnel flight
     0.52–1.00  the neural cluster; slow drift while DOM sections scroll  */
import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

const COPPER = new THREE.Color("#ff8c3b");
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t); // smoothstep

// small seeded RNG so the wire layout is identical on every visit
function seeded(s) {
  let x = s;
  return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
}

/* ---------- the marble bust (CC0, Poly Haven "marble_bust_01") ---------- */
const BUST_SCALE = 3.25;
const CROWN_Y = 1.52; // approx top of the head at this scale

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
    <Center position={[0, 0.72, 0]}>
      <primitive object={scene} scale={BUST_SCALE} />
    </Center>
  );
}

/* ---------- a dense bundle of copper wires erupting from the crown ---------- */
function makeWireCurves() {
  const rand = seeded(7);
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const curves = [];

  // the dedicated entry wire we dive into (arcs up and back)
  curves.push(
    new THREE.CatmullRomCurve3([
      v(0.02, CROWN_Y + 0.04, -0.04),
      v(0.28, CROWN_Y + 0.55, -0.5),
      v(0.9, CROWN_Y + 0.95, -1.6),
      v(1.8, CROWN_Y + 1.3, -3.6),
    ])
  );

  // seventeen more, spraying out of the crown in all directions
  for (let i = 0; i < 17; i++) {
    const th = rand() * Math.PI * 2;
    const sr = 0.03 + rand() * 0.13; // start radius on the crown
    const sx = Math.cos(th) * sr;
    const sz = Math.sin(th) * sr;
    const sy = CROWN_Y - 0.06 + rand() * 0.12;
    const lift = 0.35 + rand() * 0.9; // how high the wire arcs
    const reach = 2.4 + rand() * 2.2; // how far out it lands
    const dth = th + (rand() - 0.5) * 1.1; // drift direction
    const droop = rand() * 1.6; // sag at the far end
    curves.push(
      new THREE.CatmullRomCurve3([
        v(sx, sy, sz),
        v(sx + Math.cos(dth) * 0.35, sy + lift, sz + Math.sin(dth) * 0.35),
        v(Math.cos(dth) * (reach * 0.55), sy + lift * 1.15, Math.sin(dth) * (reach * 0.55)),
        v(Math.cos(dth) * reach, sy + lift - droop, Math.sin(dth) * reach),
      ])
    );
  }
  return curves;
}

function Wires({ curves }) {
  const pulses = useRef([]);
  const rand = useMemo(() => seeded(21), []);
  const geoms = useMemo(
    () =>
      curves.map(
        (c, i) =>
          new THREE.TubeGeometry(c, 56, i === 0 ? 0.022 : 0.011 + (i % 4) * 0.004, 6, false)
      ),
    [curves]
  );
  const pulseMeta = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, i) => ({
        curve: i % curves.length,
        offset: rand(),
        speed: 0.08 + rand() * 0.1,
      })),
    [curves, rand]
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pulses.current.forEach((m, i) => {
      if (!m) return;
      const meta = pulseMeta[i];
      const u = (t * meta.speed + meta.offset) % 1;
      curves[meta.curve].getPointAt(u, m.position);
      m.scale.setScalar(0.7 + 0.5 * Math.sin(t * 3 + i));
    });
  });
  return (
    <group>
      {geoms.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            color="#8a4b1f"
            emissive={COPPER}
            emissiveIntensity={i === 0 ? 0.5 : 0.28}
            roughness={0.32}
            metalness={0.95}
          />
        </mesh>
      ))}
      {/* data pulses travelling along the copper */}
      {pulseMeta.map((_, i) => (
        <mesh key={`p${i}`} ref={(el) => (pulses.current[i] = el)}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshBasicMaterial color="#ffcf9e" toneMapped={false} />
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
      a[i * 3 + 1] = Math.random() * 5.5 - 0.5;
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
      <pointsMaterial size={0.02} color="#e8c9a8" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

/* ---------- the tunnel: inside the copper cable, at x=120 ---------- */
const TUNNEL_X = 120;
const TUNNEL_LEN = 60;

function Tunnel() {
  const group = useRef();

  // long copper strands spiralling gently down the cable interior
  const strands = useMemo(() => {
    const rand = seeded(99);
    return Array.from({ length: 12 }).map(() => {
      const baseTh = rand() * Math.PI * 2;
      const r = 1.0 + rand() * 0.3;
      const twist = (rand() - 0.5) * 2.2; // total helix rotation over the length
      const pts = [];
      for (let s = 0; s <= 10; s++) {
        const f = s / 10;
        const th = baseTh + twist * f;
        pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 2 - f * (TUNNEL_LEN + 4)));
      }
      return new THREE.CatmullRomCurve3(pts);
    });
  }, []);
  const strandGeoms = useMemo(
    () => strands.map((c) => new THREE.TubeGeometry(c, 80, 0.03, 6, false)),
    [strands]
  );

  const rings = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        z: -(i / 30) * TUNNEL_LEN,
        r: 1.28 + Math.sin(i * 1.7) * 0.08,
      })),
    []
  );
  const streaks = useMemo(() => {
    const n = 300;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const rr = 0.4 + Math.random() * 0.55;
      a[i * 3] = Math.cos(th) * rr;
      a[i * 3 + 1] = Math.sin(th) * rr;
      a[i * 3 + 2] = -Math.random() * TUNNEL_LEN;
    }
    return a;
  }, []);

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = clock.elapsedTime * 0.04;
  });

  return (
    <group ref={group} position={[TUNNEL_X, 0, 0]}>
      {strandGeoms.map((g, i) => (
        <mesh key={`s${i}`} geometry={g}>
          <meshStandardMaterial
            color="#8a4b1f"
            emissive={COPPER}
            emissiveIntensity={0.5}
            metalness={0.95}
            roughness={0.35}
          />
        </mesh>
      ))}
      {rings.map((r, i) => (
        <mesh key={i} position={[0, 0, r.z]} rotation={[0, 0, i * 0.4]}>
          <torusGeometry args={[r.r, 0.014, 6, 40]} />
          <meshBasicMaterial color="#ffb070" toneMapped={false} transparent opacity={0.55} />
        </mesh>
      ))}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={300} array={streaks} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.03} color="#ffe0bd" transparent opacity={0.85} sizeAttenuation />
      </points>
      {/* light source travelling with the camera keeps the copper lit */}
      <pointLight position={[0, 0, -8]} intensity={6} color="#ffb070" distance={20} />
      {/* dark cable wall */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -TUNNEL_LEN / 2]}>
        <cylinderGeometry args={[1.7, 1.7, TUNNEL_LEN + 20, 24, 1, true]} />
        <meshStandardMaterial color="#070503" side={THREE.BackSide} roughness={1} />
      </mesh>
    </group>
  );
}

/* ---------- the neural cluster (memories live here), at x=240 ---------- */
const CLUSTER_X = 240;
function Cluster() {
  const group = useRef();
  const inst = useRef();
  const { nodes, linePositions } = useMemo(() => {
    const rand = seeded(42);
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
      };
    });
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
      {/* the core — the central processor */}
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
  const look = useRef(new THREE.Vector3(0, 1.0, 0));
  const entry = useMemo(() => curves[0].getPointAt(0.05), [curves]);

  useFrame(() => {
    const p = scrollRef.current;

    if (p < 0.3) {
      // Phase 1: approach the bust (framed large), then dive at the entry wire
      const a = ease(clamp01(p / 0.22));
      const d = ease(clamp01((p - 0.22) / 0.08));
      const px = THREE.MathUtils.lerp(0.0, entry.x, d) + pointer.x * 0.12 * (1 - d);
      const py =
        THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.95, 1.25, a), entry.y, d) +
        pointer.y * 0.06 * (1 - d);
      const pz = THREE.MathUtils.lerp(THREE.MathUtils.lerp(4.1, 2.0, a), entry.z + 0.18, d);
      camera.position.set(px, py, pz);
      look.current.lerp(
        d > 0
          ? curves[0].getPointAt(Math.min(0.3, 0.05 + d * 0.22))
          : new THREE.Vector3(0, 1.05, 0),
        0.2
      );
      camera.lookAt(look.current);
      camera.fov = 46 + d * 18;
      camera.updateProjectionMatrix();
    } else if (p < 0.52) {
      // Phase 2: flying through the copper cable
      const t = ease(clamp01((p - 0.3) / 0.22));
      const z = -t * (TUNNEL_LEN - 6);
      const sway = Math.sin(t * 9) * 0.07;
      camera.position.set(TUNNEL_X + sway, Math.cos(t * 7) * 0.05, z);
      camera.lookAt(TUNNEL_X, 0, z - 4);
      camera.fov = 64 - t * 10;
      camera.updateProjectionMatrix();
    } else {
      // Phase 3: drifting around the neural cluster toward the core
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
      camera={{ position: [0, 0.95, 4.1], fov: 46 }}
      style={{ position: "fixed", inset: 0, background: "#020204" }}
    >
      <fog attach="fog" args={["#020204", 6, 17]} />
      <ambientLight intensity={0.12} />
      {/* dramatic museum lighting on the bust */}
      <spotLight position={[2.5, 4.5, 2.5]} angle={0.55} penumbra={0.9} intensity={30} color="#fff4e0" />
      <pointLight position={[-3, 1.6, 1.5]} intensity={4} color="#7fb7c9" />
      <pointLight position={[3, 1.0, -2]} intensity={6} color="#d98a4a" />

      <Bust />
      <Wires curves={curves} />
      <Motes />
      <Tunnel />
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
