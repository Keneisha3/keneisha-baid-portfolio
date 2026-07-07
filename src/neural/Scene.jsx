/* The mind, in two movements — a fixed full-screen canvas behind the page.
   Scroll progress (0..1, via ref) drives the camera and the light:
     0.00–0.34  a white gallery. The bust cracks open with veins of light;
                the camera zooms straight into one fissure.
     0.34–1.00  deeper inside the museum: a long exhibition hall the camera
                walks through while the DOM sections scroll over it.       */
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

/* ---------- the rest of the collection: statues receding into the hall ----------
   The same CC0 bust, re-dressed in plain marble (no cracks, no shatter) and
   placed on pedestals at varied angles — an old museum wing in the fog. */
const HALL_STATUES = [
  { p: [-3.4, 0, -3.0], s: 2.0, r: 0.7 },
  { p: [3.6, 0, -3.8], s: 2.3, r: -0.8 },
  { p: [-5.2, 0, -7.2], s: 2.6, r: 1.4 },
  { p: [5.4, 0, -7.8], s: 2.4, r: -2.0 },
  { p: [-2.0, 0, -11.0], s: 2.8, r: 2.6 },
  { p: [2.4, 0, -12.0], s: 2.6, r: 0.3 },
];

function HallStatues() {
  const { scene } = useGLTF("/models/bust/marble_bust_01_1k.gltf");
  const marble = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e6e0d2", roughness: 0.62 }),
    []
  );
  const clones = useMemo(
    () =>
      HALL_STATUES.map((d) => {
        const c = scene.clone(true);
        c.traverse((o) => {
          if (o.isMesh) o.material = marble;
        });
        return { obj: c, ...d };
      }),
    [scene, marble]
  );
  return (
    <group>
      {clones.map((c, i) => (
        <group key={i} position={c.p} rotation={[0, c.r, 0]}>
          {/* pedestal */}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.5, 0.58, 0.9, 20]} />
            <meshStandardMaterial color="#dcd5c6" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.94, 0]}>
            <boxGeometry args={[1.0, 0.08, 1.0]} />
            <meshStandardMaterial color="#e4ddcf" roughness={0.8} />
          </mesh>
          <Center position={[0, 0.98 + 0.3 * c.s, 0]}>
            <primitive object={c.obj} scale={c.s} />
          </Center>
        </group>
      ))}
      {/* the hall floor, catching the statues' presence */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.63, -6]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#eceadf" roughness={0.9} />
      </mesh>
    </group>
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

/* ---------- inside the stone: a long exhibition hall at x=240 ----------
   After the statue breaks you are not in a void — you are deeper in the
   museum. A real gallery: floor, walls, skylights, chandeliers, and
   pedestals carrying scanned sculptures (all CC0, Poly Haven). The camera
   simply walks forward as the page scrolls. */
const HALL_X = 240;
const HALL_LEN = 64;

/* Loads a scanned model, normalises it to a target height, grounds it at y=0. */
function Exhibit({ url, height = 1.2, position, rotationY = 0, material = null }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    if (material) c.traverse((o) => { if (o.isMesh) o.material = material; });
    return c;
  }, [scene, material]);
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = height / (size.y || 1);
    return { s, y: -box.min.y * s };
  }, [obj, height]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={obj} scale={fit.s} position={[0, fit.y, 0]} />
    </group>
  );
}

function Pedestal({ position, h = 1.0, children }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[0.9, h, 0.9]} />
        <meshStandardMaterial color="#ddd6c7" roughness={0.85} />
      </mesh>
      <mesh position={[0, h + 0.03, 0]}>
        <boxGeometry args={[1.0, 0.06, 1.0]} />
        <meshStandardMaterial color="#e6dfd0" roughness={0.8} />
      </mesh>
      <group position={[0, h + 0.06, 0]}>{children}</group>
    </group>
  );
}

function GalleryHall() {
  const marble = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e6e0d2", roughness: 0.62 }),
    []
  );
  // exhibits alternating down the hall
  const shows = [
    { url: "/models/gothic_statue/gothic_statue_1k.gltf", h: 1.7, x: -3.6, z: -6, r: 0.5, ped: 0.55 },
    { url: "/models/antique_ceramic_vase_01/antique_ceramic_vase_01_1k.gltf", h: 0.85, x: 3.6, z: -12, r: -0.3, ped: 1.05 },
    { url: "/models/horse_statue_01/horse_statue_01_1k.gltf", h: 1.05, x: -3.6, z: -20, r: 0.9, ped: 0.95 },
    { url: "/models/bust/marble_bust_01_1k.gltf", h: 1.5, x: 3.6, z: -27, r: -0.6, ped: 0.7, marble: true },
    { url: "/models/antique_ceramic_vase_01/antique_ceramic_vase_01_1k.gltf", h: 0.85, x: -3.6, z: -35, r: 2.2, ped: 1.05 },
    { url: "/models/gothic_statue/gothic_statue_1k.gltf", h: 1.7, x: 3.6, z: -43, r: -2.4, ped: 0.55 },
    { url: "/models/horse_statue_01/horse_statue_01_1k.gltf", h: 1.05, x: -3.6, z: -51, r: 1.7, ped: 0.95 },
  ];
  return (
    <group position={[HALL_X, 0, 0]}>
      {/* architecture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -HALL_LEN / 2 + 4]}>
        <planeGeometry args={[13, HALL_LEN + 16]} />
        <meshStandardMaterial color="#e9e2d3" roughness={0.9} />
      </mesh>
      {[-6.2, 6.2].map((wx) => (
        <mesh key={wx} position={[wx, 3, -HALL_LEN / 2 + 4]} rotation={[0, wx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <planeGeometry args={[HALL_LEN + 16, 6]} />
          <meshStandardMaterial color="#f3efe5" roughness={0.95} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6, -HALL_LEN / 2 + 4]}>
        <planeGeometry args={[13, HALL_LEN + 16]} />
        <meshStandardMaterial color="#f6f2e9" roughness={0.95} />
      </mesh>
      {/* skylight strips */}
      {[-4, -18, -32, -46].map((sz) => (
        <mesh key={sz} rotation={[Math.PI / 2, 0, 0]} position={[0, 5.98, sz]}>
          <planeGeometry args={[8, 5]} />
          <meshBasicMaterial color="#fffdf4" toneMapped={false} />
        </mesh>
      ))}
      {/* far wall closing the hall */}
      <mesh position={[0, 3, -HALL_LEN - 4]}>
        <planeGeometry args={[13, 6]} />
        <meshStandardMaterial color="#efe9db" roughness={0.95} />
      </mesh>

      {/* chandeliers */}
      {[-10, -28, -46].map((cz) => (
        <group key={cz} position={[0, 4.4, cz]}>
          <Exhibit url="/models/Chandelier_03/Chandelier_03_1k.gltf" height={1.5} position={[0, 0, 0]} />
          <pointLight position={[0, -0.2, 0]} intensity={2.2} color="#ffe6bf" distance={9} />
        </group>
      ))}

      {/* gallery benches down the centre */}
      {[-16, -38].map((bz) => (
        <Exhibit
          key={bz}
          url="/models/painted_wooden_bench/painted_wooden_bench_1k.gltf"
          height={0.85}
          position={[0, 0, bz]}
          rotationY={Math.PI / 2}
        />
      ))}

      {/* the exhibits */}
      {shows.map((s, i) => (
        <Pedestal key={i} position={[s.x, 0, s.z]} h={s.ped}>
          <Exhibit url={s.url} height={s.h} position={[0, 0, 0]} rotationY={s.r} material={s.marble ? marble : null} />
        </Pedestal>
      ))}
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
      // Movement II: walking the deeper gallery, one room at a time
      const t = clamp01((p - 0.34) / 0.66);
      const z = 4 - t * (HALL_LEN - 6);
      const bob = Math.sin(t * 46) * 0.025; // footsteps
      camera.position.set(
        HALL_X + Math.sin(t * 5) * 0.3 + pointer.x * 0.2,
        1.55 + bob + pointer.y * 0.12,
        z
      );
      camera.lookAt(HALL_X + pointer.x * 0.5, 1.35 + pointer.y * 0.2, z - 6);
      camera.fov = 52;
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
      <HallStatues />
      <FissureGlow scrollRef={scrollRef} />
      <Motes />
      <ContactShadows position={[0, -0.62, 0]} opacity={0.4} scale={8} blur={2.6} far={3} color="#3a352c" />

      <GalleryHall />
      <Director scrollRef={scrollRef} />

      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.3} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload("/models/bust/marble_bust_01_1k.gltf");
useGLTF.preload("/models/gothic_statue/gothic_statue_1k.gltf");
useGLTF.preload("/models/horse_statue_01/horse_statue_01_1k.gltf");
useGLTF.preload("/models/antique_ceramic_vase_01/antique_ceramic_vase_01_1k.gltf");
useGLTF.preload("/models/Chandelier_03/Chandelier_03_1k.gltf");
useGLTF.preload("/models/painted_wooden_bench/painted_wooden_bench_1k.gltf");
