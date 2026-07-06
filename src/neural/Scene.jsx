/* The mind, in two movements — a fixed full-screen canvas behind the page.
   Scroll progress (0..1, via ref) drives the camera and the light:
     0.00–0.34  a white gallery. The bust cracks open with veins of light;
                the camera zooms straight into one fissure.
     0.34–1.00  inside the sculpture: the ideas themselves, a luminous
                cluster, while the DOM sections scroll over it.            */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Center, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

const GALLERY = new THREE.Color("#f2efe8"); // warm gallery white
const STONE_DARK = new THREE.Color("#e9e3d7"); // inside the marble — still light
const VEIN = new THREE.Color("#ffb36b"); // light inside the cracks
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const ramp = (p, a, b) => ease(clamp01((p - a) / (b - a)));

function seeded(s) {
  let x = s;
  return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
}

/* ---------- procedural crack texture: dense, branching, deep ---------- */
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
      a += (rand() - 0.5) * 1.1;
      px += Math.cos(a) * (len / steps);
      py += Math.sin(a) * (len / steps);
      g.lineTo(px, py);
    }
    g.strokeStyle = "rgba(255,205,150,1)";
    g.lineWidth = w;
    g.shadowColor = "rgba(255,170,90,0.95)";
    g.shadowBlur = 10;
    g.stroke();
    if (rand() < 0.9) branch(px, py, a + (rand() - 0.5) * 1.7, len * 0.64, Math.max(1.2, w * 0.72), depth - 1);
    if (rand() < 0.65)
      branch((x0 + px) / 2, (y0 + py) / 2, a + (rand() > 0.5 ? 1 : -1) * (0.8 + rand() * 0.9), len * 0.52, Math.max(1.2, w * 0.7), depth - 1);
  };
  for (let i = 0; i < 20; i++) branch(rand() * 1024, rand() * 1024, rand() * Math.PI * 2, 190 + rand() * 260, 4.5, 5);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* ---------- the marble bust, cracking open ---------- */
const BUST_SCALE = 3.25;
const FISSURE = new THREE.Vector3(0.0, 1.12, 0.02); // dead center of the head

function Bust({ scrollRef }) {
  const { scene } = useGLTF("/models/bust/marble_bust_01_1k.gltf");
  const mats = useRef([]);
  const shaders = useRef([]);
  const crackTex = useMemo(() => makeCrackTexture(), []);

  useEffect(() => {
    mats.current = [];
    shaders.current = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;

      // Give every triangle its own vertices + a shared centroid attribute, so
      // spatial cells of triangles can drift apart as rigid marble shards.
      if (!o.geometry.getAttribute("aCenter")) {
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        const pos = g.getAttribute("position");
        const centers = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i += 3) {
          const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
          const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
          const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
          for (let k = 0; k < 3; k++) {
            centers[(i + k) * 3] = cx;
            centers[(i + k) * 3 + 1] = cy;
            centers[(i + k) * 3 + 2] = cz;
          }
        }
        g.setAttribute("aCenter", new THREE.BufferAttribute(centers, 3));
        o.geometry = g;
      }
      o.geometry.computeBoundingBox();
      const core = new THREE.Vector3();
      o.geometry.boundingBox.getCenter(core);

      o.material.roughness = 0.5;
      o.material.emissiveMap = crackTex;
      o.material.emissive = VEIN.clone();
      o.material.emissiveIntensity = 0.12; // hairline fractures faintly visible at rest
      o.material.side = THREE.DoubleSide; // shard backs show through the gaps
      o.material.customProgramCacheKey = () => "bust-shatter";
      o.material.onBeforeCompile = (shader) => {
        shader.uniforms.uBreak = { value: 0 };
        shader.uniforms.uCells = { value: 15.0 };
        shader.uniforms.uCore = { value: core };
        shader.vertexShader =
          `attribute vec3 aCenter;\n` +
          `uniform float uBreak;\nuniform float uCells;\nuniform vec3 uCore;\n` +
          `float hsh(vec3 p){return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453);}\n` +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>\n{\n` +
              `  vec3 cell = floor(aCenter * uCells);\n` +
              `  float h = hsh(cell);\n` +
              `  vec3 dir = normalize((cell + 0.5) / uCells - uCore + vec3(1e-4));\n` +
              `  vec3 jit = vec3(hsh(cell+1.0), hsh(cell+2.0), hsh(cell+3.0)) - 0.5;\n` +
              `  transformed += (dir * (0.55 + 0.45*h) + jit * 0.9) * uBreak * 0.24;\n` +
              `}`
          );
        shaders.current.push(shader);
      };
      o.material.needsUpdate = true;
      mats.current.push(o.material);
    });
  }, [scene, crackTex]);

  useFrame(({ clock }) => {
    const p = scrollRef.current;
    // the veins brighten, then the stone physically comes apart
    const glow = 0.12 + ramp(p, 0.03, 0.26) * (2.2 + 0.35 * Math.sin(clock.elapsedTime * 1.7));
    mats.current.forEach((m) => (m.emissiveIntensity = glow));
    const br = ramp(p, 0.14, 0.34);
    shaders.current.forEach((s) => (s.uniforms.uBreak.value = br));
  });

  return (
    <Center position={[0, 0.72, 0]}>
      <primitive object={scene} scale={BUST_SCALE} />
    </Center>
  );
}

/* ---------- the fissure mouth: light pouring out as it opens ---------- */
function FissureGlow({ scrollRef }) {
  const light = useRef();
  useFrame(({ clock }) => {
    const p = scrollRef.current;
    const open = ramp(p, 0.16, 0.32);
    if (light.current) {
      light.current.intensity = open * (14 + Math.sin(clock.elapsedTime * 5) * 2.5);
    }
  });
  return <pointLight ref={light} position={FISSURE} intensity={0} color="#ffb36b" distance={2.5} />;
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

/* ---------- inside the sculpture: the ideas, a luminous cluster at x=240 ---------- */
const CLUSTER_X = 240;
function Cluster() {
  const group = useRef();
  const inst = useRef();
  const { nodes, linePositions } = useMemo(() => {
    const rand = seeded(42);
    const N = 90;
    const nodes = Array.from({ length: N }).map(() => {
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      const r = 1.4 + rand() * 3.6;
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
        <meshBasicMaterial color="#b4622e" toneMapped={false} />
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
        <lineBasicMaterial color="#9a8a6e" transparent opacity={0.5} />
      </lineSegments>
      <mesh>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#5a3a1c" emissive={VEIN} emissiveIntensity={0.6} wireframe />
      </mesh>
      {/* faint marble walls of the interior, catching the vein-light */}
      <mesh>
        <sphereGeometry args={[9, 24, 24]} />
        <meshStandardMaterial color="#efeadf" roughness={0.95} side={THREE.BackSide} />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={3} color="#ffb36b" distance={14} />
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

    // the world darkens as you pass through the stone
    const dark = ramp(p, 0.26, 0.36);
    bg.copy(GALLERY).lerp(STONE_DARK, dark);
    scene.background = bg;
    if (scene.fog) {
      scene.fog.color.copy(bg);
      scene.fog.near = THREE.MathUtils.lerp(8, 5, dark);
      scene.fog.far = THREE.MathUtils.lerp(24, 18, dark);
    }

    if (p < 0.34) {
      // Movement I: the gallery — approach, then ZOOM into the fissure
      const a = ease(clamp01(p / 0.18));
      const d = ease(clamp01((p - 0.18) / 0.16)); // long, committed zoom
      const px = THREE.MathUtils.lerp(0.0, FISSURE.x, d) + pointer.x * 0.1 * (1 - d);
      const py =
        THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.0, 1.18, a), FISSURE.y, d) +
        pointer.y * 0.05 * (1 - d);
      // all the way in — the crack fills the frame before the cut
      const pz = THREE.MathUtils.lerp(THREE.MathUtils.lerp(4.2, 2.0, a), FISSURE.z + 0.05, d);
      camera.position.set(px, py, pz);
      look.current.lerp(d > 0 ? FISSURE : new THREE.Vector3(0, 1.05, 0), 0.22);
      camera.lookAt(look.current);
      camera.fov = 44 + d * 28; // the zoom stretches as you enter
      camera.updateProjectionMatrix();
    } else {
      // Movement II: inside the sculpture, among the ideas
      const t = clamp01((p - 0.34) / 0.66);
      const ang = t * 2.1 + 0.3;
      const rad = THREE.MathUtils.lerp(1.6, 5.4, ease(t)); // born at the very middle, ideas all around
      camera.position.set(
        CLUSTER_X + Math.sin(ang) * rad + pointer.x * 0.3,
        0.35 - t * 0.15 + pointer.y * 0.15,
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
      <FissureGlow scrollRef={scrollRef} />
      <Motes />
      <ContactShadows position={[0, -0.62, 0]} opacity={0.4} scale={8} blur={2.6} far={3} color="#3a352c" />

      <Cluster />
      <Director scrollRef={scrollRef} />

      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.3} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload("/models/bust/marble_bust_01_1k.gltf");
