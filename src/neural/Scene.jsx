/* The mind, in three movements — a fixed full-screen canvas behind the page.
   Scroll progress (0..1, via ref) drives the camera and the light:
     0.00–0.30  a white gallery. The bust develops glowing cracks; the camera
                glides toward one fissure as ink begins to escape it.
     0.30–0.52  inside the ink: a dark, flowing, abstract space.
     0.52–1.00  the ideas themselves — a drifting cluster — while the DOM
                sections scroll over the cloud.                              */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Center, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

const GALLERY = new THREE.Color("#f2efe8"); // warm gallery white
const INK = new THREE.Color("#08070a"); // the ink
const VEIN = new THREE.Color("#ffb36b"); // light inside the cracks
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const ramp = (p, a, b) => ease(clamp01((p - a) / (b - a)));

function seeded(s) {
  let x = s;
  return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
}

/* ---------- procedural crack texture (branching fissures, drawn once) ---------- */
function makeCrackTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, 1024, 1024);
  const rand = seeded(13);
  const branch = (x0, y0, ang, len, w, depth) => {
    if (depth <= 0 || len < 8) return;
    let px = x0, py = y0, a = ang;
    g.beginPath();
    g.moveTo(px, py);
    const steps = 6 + Math.floor(rand() * 6);
    for (let s = 0; s < steps; s++) {
      a += (rand() - 0.5) * 0.9;
      px += Math.cos(a) * (len / steps);
      py += Math.sin(a) * (len / steps);
      g.lineTo(px, py);
    }
    g.strokeStyle = "rgba(255,200,140,1)";
    g.lineWidth = w;
    g.shadowColor = "rgba(255,170,90,0.9)";
    g.shadowBlur = 7;
    g.stroke();
    if (rand() < 0.85) branch(px, py, a + (rand() - 0.5) * 1.6, len * 0.62, Math.max(1, w * 0.72), depth - 1);
    if (rand() < 0.55)
      branch((x0 + px) / 2, (y0 + py) / 2, a + (rand() > 0.5 ? 1 : -1) * (0.8 + rand() * 0.8), len * 0.5, Math.max(1, w * 0.7), depth - 1);
  };
  for (let i = 0; i < 12; i++) branch(rand() * 1024, rand() * 1024, rand() * Math.PI * 2, 170 + rand() * 240, 3, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ---------- soft ink-billow sprite texture ---------- */
function makeBillowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, "rgba(9,8,12,0.9)");
  grad.addColorStop(0.55, "rgba(9,8,12,0.55)");
  grad.addColorStop(1, "rgba(9,8,12,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ---------- the marble bust, developing veins of light ---------- */
const BUST_SCALE = 3.25;
const FISSURE = new THREE.Vector3(0.14, 1.34, 0.2); // where the camera enters

function Bust({ scrollRef }) {
  const { scene } = useGLTF("/models/bust/marble_bust_01_1k.gltf");
  const mats = useRef([]);
  const crackTex = useMemo(() => makeCrackTexture(), []);

  useEffect(() => {
    mats.current = [];
    scene.traverse((o) => {
      if (o.isMesh) {
        o.material.roughness = 0.5;
        o.material.emissiveMap = crackTex;
        o.material.emissive = VEIN.clone();
        o.material.emissiveIntensity = 0;
        o.material.needsUpdate = true;
        mats.current.push(o.material);
      }
    });
  }, [scene, crackTex]);

  useFrame(({ clock }) => {
    const p = scrollRef.current;
    // ideas awakening: the veins brighten as you begin to descend
    const glow = ramp(p, 0.04, 0.24) * (1.35 + 0.25 * Math.sin(clock.elapsedTime * 1.7));
    mats.current.forEach((m) => (m.emissiveIntensity = glow));
  });

  return (
    <Center position={[0, 0.72, 0]}>
      <primitive object={scene} scale={BUST_SCALE} />
    </Center>
  );
}

/* ---------- ink escaping the fissure as you approach ---------- */
function InkBurst({ scrollRef, billowTex }) {
  const group = useRef();
  const meta = useMemo(() => {
    const rand = seeded(31);
    return Array.from({ length: 12 }).map(() => ({
      dir: new THREE.Vector3(rand() - 0.3, rand() * 0.7, rand() - 0.3).normalize(),
      dist: 0.15 + rand() * 0.8,
      size: 0.5 + rand() * 1.1,
      rot: rand() * Math.PI,
    }));
  }, []);
  useFrame(({ clock }) => {
    const p = scrollRef.current;
    const d = ramp(p, 0.2, 0.32); // the escape
    if (!group.current) return;
    group.current.visible = d > 0.01;
    group.current.children.forEach((s, i) => {
      const m = meta[i];
      s.position.copy(FISSURE).addScaledVector(m.dir, m.dist * d * 2.2);
      const sc = m.size * d * (2.6 + 0.2 * Math.sin(clock.elapsedTime * 0.6 + i));
      s.scale.setScalar(sc);
      s.material.rotation = m.rot + clock.elapsedTime * 0.04;
      s.material.opacity = Math.min(1, d * 1.6);
    });
  });
  return (
    <group ref={group} visible={false}>
      {meta.map((_, i) => (
        <sprite key={i}>
          <spriteMaterial map={billowTex} transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </group>
  );
}

/* ---------- dust motes drifting in the gallery light ---------- */
function Motes({ count = 200 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 10;
      a[i * 3 + 1] = Math.random() * 5 - 0.3;
      a[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return a;
  }, [count]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.01;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.016} color="#8f887a" transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

/* ---------- inside the ink: a flowing, abstract dark space at x=120 ---------- */
const INK_X = 120;
const INK_LEN = 46;

function InkSpace({ billowTex }) {
  const group = useRef();
  const billows = useMemo(() => {
    const rand = seeded(77);
    return Array.from({ length: 44 }).map(() => ({
      pos: [
        (rand() - 0.5) * 7,
        (rand() - 0.5) * 5,
        2 - rand() * (INK_LEN + 8),
      ],
      size: 2.4 + rand() * 4.5,
      rot: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 0.05,
    }));
  }, []);
  // faint architectural ribbons flowing through the cloud
  const ribbons = useMemo(() => {
    const rand = seeded(55);
    return Array.from({ length: 4 }).map(() => {
      const pts = [];
      const ox = (rand() - 0.5) * 3;
      const oy = (rand() - 0.5) * 2;
      for (let s = 0; s <= 8; s++) {
        const f = s / 8;
        pts.push(
          new THREE.Vector3(
            ox + Math.sin(f * Math.PI * (1.5 + rand())) * 1.6,
            oy + Math.cos(f * Math.PI * (1 + rand())) * 1.2,
            2 - f * (INK_LEN + 6)
          )
        );
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.22, 6, false);
    });
  }, []);
  const glimmer = useMemo(() => {
    const n = 240;
    const a = new Float32Array(n * 3);
    const rand = seeded(88);
    for (let i = 0; i < n; i++) {
      a[i * 3] = (rand() - 0.5) * 6;
      a[i * 3 + 1] = (rand() - 0.5) * 4.5;
      a[i * 3 + 2] = 2 - rand() * INK_LEN;
    }
    return a;
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((ch, i) => {
      if (ch.isSprite) {
        const b = billows[i];
        if (b) ch.material.rotation = b.rot + t * b.spin;
      }
    });
  });

  return (
    <group ref={group} position={[INK_X, 0, 0]}>
      {billows.map((b, i) => (
        <sprite key={i} position={b.pos} scale={[b.size, b.size, 1]}>
          <spriteMaterial map={billowTex} transparent depthWrite={false} opacity={0.9} />
        </sprite>
      ))}
      {ribbons.map((g, i) => (
        <mesh key={`r${i}`} geometry={g}>
          <meshStandardMaterial
            color="#141220"
            emissive="#3a3050"
            emissiveIntensity={0.35}
            transparent
            opacity={0.5}
            roughness={0.8}
          />
        </mesh>
      ))}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={240} array={glimmer} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.025} color="#ffd9a8" transparent opacity={0.5} sizeAttenuation />
      </points>
      <pointLight position={[0, 0.5, -10]} intensity={4} color="#c9b8ff" distance={22} />
    </group>
  );
}

/* ---------- the ideas: a drifting luminous cluster at x=240 ---------- */
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
      nodes
        .map((m, j) => ({ j, d: n.pos.distanceTo(m.pos) }))
        .filter((e) => e.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach((e) => {
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
        dummy.position.copy(n.pos);
        dummy.scale.setScalar(n.scale * (1 + 0.35 * Math.sin(t * 1.6 + n.phase)));
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
        <meshBasicMaterial color="#ffcf9e" toneMapped={false} />
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
        <lineBasicMaterial color="#6e5636" transparent opacity={0.35} />
      </lineSegments>
      <mesh>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#0a0c10" emissive={VEIN} emissiveIntensity={1.3} wireframe />
      </mesh>
    </group>
  );
}

/* ---------- camera + light director ---------- */
function Director({ scrollRef }) {
  const { camera, pointer, scene } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.0, 0));
  const bg = useMemo(() => GALLERY.clone(), []);

  useFrame(() => {
    const p = scrollRef.current;

    // the world darkens as the ink takes over
    const dark = ramp(p, 0.22, 0.33);
    bg.copy(GALLERY).lerp(INK, dark);
    scene.background = bg;
    if (scene.fog) {
      scene.fog.color.copy(bg);
      scene.fog.near = THREE.MathUtils.lerp(8, 4, dark);
      scene.fog.far = THREE.MathUtils.lerp(24, 15, dark);
    }

    if (p < 0.3) {
      // Movement I: the gallery — approach, then glide into the fissure
      const a = ease(clamp01(p / 0.2));
      const d = ease(clamp01((p - 0.2) / 0.1));
      const px = THREE.MathUtils.lerp(0.0, FISSURE.x, d) + pointer.x * 0.1 * (1 - d);
      const py =
        THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.0, 1.2, a), FISSURE.y, d) +
        pointer.y * 0.05 * (1 - d);
      const pz = THREE.MathUtils.lerp(THREE.MathUtils.lerp(4.2, 2.1, a), FISSURE.z + 0.16, d);
      camera.position.set(px, py, pz);
      look.current.lerp(d > 0 ? FISSURE : new THREE.Vector3(0, 1.05, 0), 0.2);
      camera.lookAt(look.current);
      camera.fov = 44 + d * 20;
      camera.updateProjectionMatrix();
    } else if (p < 0.52) {
      // Movement II: adrift in the ink — a slow, curving glide (no straight tunnel)
      const t = ease(clamp01((p - 0.3) / 0.22));
      const z = 1 - t * (INK_LEN - 4);
      camera.position.set(
        INK_X + Math.sin(t * Math.PI * 2.2) * 0.9,
        Math.sin(t * Math.PI * 1.4) * 0.6,
        z
      );
      camera.lookAt(
        INK_X + Math.sin((t + 0.08) * Math.PI * 2.2) * 0.9,
        Math.sin((t + 0.08) * Math.PI * 1.4) * 0.6,
        z - 3
      );
      camera.fov = 58 - t * 6;
      camera.updateProjectionMatrix();
    } else {
      // Movement III: among the ideas
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
  const billowTex = useMemo(() => makeBillowTexture(), []);
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 1.0, 4.2], fov: 44 }}
      style={{ position: "fixed", inset: 0, background: "#f2efe8" }}
    >
      <fog attach="fog" args={["#f2efe8", 8, 24]} />
      {/* gallery daylight */}
      <hemisphereLight args={["#ffffff", "#cfc8ba", 0.85]} />
      <directionalLight position={[3, 5, 3]} intensity={2.1} color="#fff6e8" />
      <directionalLight position={[-4, 2, -2]} intensity={0.5} color="#dfe8f0" />

      <Bust scrollRef={scrollRef} />
      <InkBurst scrollRef={scrollRef} billowTex={billowTex} />
      <Motes />
      <ContactShadows position={[0, -0.62, 0]} opacity={0.4} scale={8} blur={2.6} far={3} color="#3a352c" />

      <InkSpace billowTex={billowTex} />
      <Cluster />
      <Director scrollRef={scrollRef} />

      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.6} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.6} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload("/models/bust/marble_bust_01_1k.gltf");
