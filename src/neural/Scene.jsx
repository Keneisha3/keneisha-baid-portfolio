/* One building, two movements — a fixed full-screen canvas behind the page.
   The whole experience happens inside the Sponza palazzo (© Crytek, CC BY 3.0):
     0.00–0.34  the sculpture room — the first bay of the building. The bust
                cracks open with veins of light; the camera zooms into a fissure.
     0.34–1.00  everything else — the camera continues down the palazzo past
                the rest of the collection, or roams freely on request.       */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Center, ContactShadows, PointerLockControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { JOURNEY, walkT } from "./journey";

const GALLERY = new THREE.Color("#f2efe8"); // warm daylight
const STONE_DARK = new THREE.Color("#e9e3d7"); // deeper in the building
const VEIN = new THREE.Color("#ffb36b"); // light inside the cracks
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const ramp = (p, a, b) => ease(clamp01((p - a) / (b - a)));

function seeded(s) {
  let x = s;
  return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
}

/* ---------- world layout ---------- */
const HALL_X = 240; // the building lives here, away from origin
const HALL_DIMS = { len: 44, halfW: 3.4, ready: false }; // measured on load
const SR = () => HALL_DIMS.len / 2 - 6; // the sculpture room: first bay's z
const PLINTH_H = 0.5;

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

/* ---------- the marble bust, cracking open on its plinth ---------- */
const BUST_SCALE = 2.9;

function Bust({ scrollRef, position }) {
  const { scene } = useGLTF("/models/bust/marble_bust_01_1k.gltf");
  const mats = useRef([]);
  const shaders = useRef([]);
  const crackTex = useMemo(() => makeCrackTexture(), []);

  useEffect(() => {
    mats.current = [];
    shaders.current = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;
      // per-triangle centroids so spatial cells can drift apart as rigid shards
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
      o.material.emissiveIntensity = 0.12;
      o.material.side = THREE.DoubleSide;
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
    const glow = 0.12 + ramp(p, 0.03, 0.26) * (2.2 + 0.35 * Math.sin(clock.elapsedTime * 1.7));
    mats.current.forEach((m) => (m.emissiveIntensity = glow));
    const br = ramp(p, 0.14, 0.34);
    shaders.current.forEach((s) => (s.uniforms.uBreak.value = br));
  });

  return (
    <group position={position}>
      {/* the plinth it stands on */}
      <mesh position={[0, PLINTH_H / 2, 0]}>
        <cylinderGeometry args={[0.85, 0.95, PLINTH_H, 26]} />
        <meshStandardMaterial color="#d8d1c2" roughness={0.8} />
      </mesh>
      <Center position={[0, PLINTH_H + 0.64, 0]}>
        <primitive object={scene} scale={BUST_SCALE} />
      </Center>
    </group>
  );
}

/* ---------- the fissure mouth: light pouring out as it opens ---------- */
function FissureGlow({ scrollRef, position }) {
  const light = useRef();
  useFrame(({ clock }) => {
    const p = scrollRef.current;
    const open = ramp(p, 0.16, 0.32);
    if (light.current) light.current.intensity = open * (14 + Math.sin(clock.elapsedTime * 5) * 2.5);
  });
  return <pointLight ref={light} position={position} intensity={0} color="#ffb36b" distance={2.5} />;
}

/* ---------- dust motes drifting in the room's light ---------- */
function Motes({ center = [0, 0, 0], count = 180 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 8;
      a[i * 3 + 1] = Math.random() * 5;
      a[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return a;
  }, [count]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.01;
  });
  return (
    <points ref={ref} position={center}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.014} color="#b9ac94" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

/* ---------- a scanned model, normalised and grounded ---------- */
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

/* A painted plate — the artwork inside a wall frame, drawn on canvas. */
function makePlateTexture({ num, title, sub }) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 640;
  const g = c.getContext("2d");
  // linen ground
  g.fillStyle = "#f4eee0";
  g.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 640; i += 3) {
    g.fillStyle = i % 6 ? "rgba(120,100,70,0.03)" : "rgba(255,255,255,0.05)";
    g.fillRect(0, i, 512, 1);
  }
  // gilt keyline
  g.strokeStyle = "#b08a4a";
  g.lineWidth = 3;
  g.strokeRect(26, 26, 460, 588);
  g.strokeStyle = "rgba(176,138,74,0.5)";
  g.lineWidth = 1;
  g.strokeRect(38, 38, 436, 564);
  // catalogue number
  g.fillStyle = "#a4622e";
  g.font = "600 26px 'IBM Plex Mono', monospace";
  g.textAlign = "center";
  g.fillText(num, 256, 120);
  // title, wrapped
  g.fillStyle = "#241f18";
  g.font = "500 44px Fraunces, Georgia, serif";
  const words = String(title).split(" ");
  let line = "", lines = [];
  for (const w of words) {
    if (g.measureText(line + " " + w).width > 380 && line) {
      lines.push(line);
      line = w;
    } else line = line ? line + " " + w : w;
  }
  lines.push(line);
  lines.slice(0, 4).forEach((l, i) => g.fillText(l, 256, 230 + i * 56));
  // motif
  g.strokeStyle = "#a4622e";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(176, 470);
  g.lineTo(336, 470);
  g.stroke();
  g.beginPath();
  g.arc(256, 470, 6, 0, Math.PI * 2);
  g.fillStyle = "#a4622e";
  g.fill();
  // subtitle
  g.fillStyle = "#6b6459";
  g.font = "500 20px 'IBM Plex Mono', monospace";
  const sub2 = String(sub).slice(0, 40);
  g.fillText(sub2.toUpperCase(), 256, 530);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* A framed painting on the wall: scanned frame + painted plate. */
function WallPainting({ frameUrl, plate, position, rotationY, height = 1.7 }) {
  const { scene } = useGLTF(frameUrl);
  const obj = useMemo(() => scene.clone(true), [scene]);
  const s = useMemo(() => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    return height / (size.y || 1);
  }, [obj, height]);
  const tex = useMemo(() => makePlateTexture(plate), [plate]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Center>
        <primitive object={obj} scale={s} />
      </Center>
      {/* the artwork, sitting just proud of the wall inside the frame */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[height * 0.62, height * 0.78]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
    </group>
  );
}

/* Wall-hung version: centred on its own middle so it can hang at eye height. */
function WallFrame({ url, height = 1.4, position, rotationY = 0 }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => scene.clone(true), [scene]);
  const s = useMemo(() => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    return height / (size.y || 1);
  }, [obj, height]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Center>
        <primitive object={obj} scale={s} />
      </Center>
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

/* plate copy for the eleven paintings */
import { PROJECTS, EXPERIENCE } from "../data/portfolio";
const PLATES = [
  ...PROJECTS.map((p, i) => ({
    num: "MEM." + String(i + 1).padStart(2, "0"),
    title: p.title,
    sub: p.tech?.slice(0, 2).join(" · ") || "",
  })),
  ...[...EXPERIENCE].reverse().map((e, i) => ({
    num: "ACQ." + String(i + 1).padStart(2, "0"),
    title: e.role,
    sub: e.company + " — " + e.period,
  })),
];

/* ---------- the building and everything in it ---------- */
function Building({ scrollRef }) {
  const { scene } = useGLTF("/models/sponza/Sponza_c.gltf");
  const [ready, setReady] = useState(false);

  // centre the palazzo, floor at y=0, long axis down Z
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    HALL_DIMS.len = size.x * 0.88;
    HALL_DIMS.halfW = Math.max(2.8, size.z * 0.22);
    HALL_DIMS.ready = true;
    return { y: -box.min.y, cx: center.x, cz: center.z };
  }, [scene]);
  useEffect(() => {
    setReady(true);
    window.dispatchEvent(new Event("kb:loaded"));
  }, [fit]);

  const marble = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e6e0d2", roughness: 0.62 }),
    []
  );

  const L = HALL_DIMS.len;
  const sr = SR(); // sculpture room z
  const walkStart = sr - 5;
  const walkEnd = -L / 2 + 4;
  const zAt = (f) => walkStart - f * (walkStart - walkEnd);

  // the rest of the collection, past the sculpture room
  const shows = useMemo(
    () => [
      { url: "/models/gothic_statue/gothic_statue_1k.gltf", h: 1.7, x: -2.6, z: zAt(0.08), r: 0.5, ped: 0.55 },
      { url: "/models/antique_ceramic_vase_01/antique_ceramic_vase_01_1k.gltf", h: 0.85, x: 2.6, z: zAt(0.22), r: -0.3, ped: 1.05 },
      { url: "/models/horse_statue_01/horse_statue_01_1k.gltf", h: 1.05, x: -2.6, z: zAt(0.38), r: 0.9, ped: 0.95 },
      { url: "/models/antique_ceramic_vase_01/antique_ceramic_vase_01_1k.gltf", h: 0.85, x: 2.6, z: zAt(0.54), r: 2.2, ped: 1.05 },
      { url: "/models/gothic_statue/gothic_statue_1k.gltf", h: 1.7, x: -2.6, z: zAt(0.7), r: -2.4, ped: 0.55 },
      { url: "/models/horse_statue_01/horse_statue_01_1k.gltf", h: 1.05, x: 2.6, z: zAt(0.86), r: 1.7, ped: 0.95 },
    ],
    [ready] // eslint-disable-line
  );

  // the sculpture room's silent companions (plain marble busts)
  const companions = [
    { x: -2.7, z: sr + 1.8, r: 0.7, s: 1.9 },
    { x: 2.7, z: sr + 1.2, r: -0.9, s: 2.1 },
    { x: -2.7, z: sr - 2.4, r: 1.6, s: 2.0 },
    { x: 2.7, z: sr - 3.0, r: -2.2, s: 1.8 },
  ];

  // scanned frames hung along the walk
  const frameW = HALL_DIMS.halfW + 1.05;
  const frames = [
    { url: "/models/fancy_picture_frame_01/fancy_picture_frame_01_1k.gltf", x: -frameW, z: zAt(0.15), r: Math.PI / 2 },
    { url: "/models/hanging_picture_frame_02/hanging_picture_frame_02_1k.gltf", x: frameW, z: zAt(0.3), r: -Math.PI / 2 },
    { url: "/models/hanging_picture_frame_02/hanging_picture_frame_02_1k.gltf", x: -frameW, z: zAt(0.48), r: Math.PI / 2 },
    { url: "/models/fancy_picture_frame_01/fancy_picture_frame_01_1k.gltf", x: frameW, z: zAt(0.62), r: -Math.PI / 2 },
    { url: "/models/fancy_picture_frame_01/fancy_picture_frame_01_1k.gltf", x: -frameW, z: zAt(0.8), r: Math.PI / 2 },
  ];

  return (
    <group position={[HALL_X, 0, 0]}>
      {/* the palazzo itself */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <primitive object={scene} position={[-fit.cx, fit.y, -fit.cz]} />
      </group>

      {/* THE SCULPTURE ROOM — first bay of the building */}
      <Bust scrollRef={scrollRef} position={[0, 0, sr]} />
      <FissureGlow scrollRef={scrollRef} position={[0, PLINTH_H + 1.12, sr + 0.05]} />
      <Motes center={[0, 0, sr]} />
      <ContactShadows position={[0, 0.02, sr]} opacity={0.35} scale={9} blur={2.4} far={4} color="#3a352c" />
      {companions.map((c, i) => (
        <group key={`c${i}`} position={[c.x, 0, c.z]} rotation={[0, c.r, 0]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.5, 0.58, 0.9, 20]} />
            <meshStandardMaterial color="#dcd5c6" roughness={0.85} />
          </mesh>
          <group position={[0, 0.9, 0]}>
            <Exhibit
              url="/models/bust/marble_bust_01_1k.gltf"
              height={0.62 * c.s}
              position={[0, 0, 0]}
              material={marble}
            />
          </group>
        </group>
      ))}
      {/* a museum spot on the centrepiece */}
      <spotLight position={[2.2, 5.4, sr + 2.4]} angle={0.5} penumbra={0.85} intensity={20} color="#fff2df" target-position={[0, 1.4, sr]} />

      {/* EVERYTHING ELSE — the rest of the palazzo */}
      {[0.15, 0.5, 0.85].map((f) => (
        <pointLight key={f} position={[0, 4.2, zAt(f)]} intensity={3} color="#ffe6bf" distance={14} />
      ))}
      <hemisphereLight args={["#fff8ec", "#b9ae98", 0.5]} />

      {[0.3, 0.68].map((f) => (
        <Exhibit
          key={`b${f}`}
          url="/models/painted_wooden_bench/painted_wooden_bench_1k.gltf"
          height={0.85}
          position={[0, 0, zAt(f)]}
          rotationY={Math.PI / 2}
        />
      ))}

      {shows.map((s, i) => (
        <Pedestal key={i} position={[s.x, 0, s.z]} h={s.ped}>
          <Exhibit url={s.url} height={s.h} position={[0, 0, 0]} rotationY={s.r} />
        </Pedestal>
      ))}

      {/* the scanned frames on the walls (decor between stations) */}
      {frames.map((f, i) => (
        <WallFrame key={`f${i}`} url={f.url} height={1.45} position={[f.x, 3.4, f.z]} rotationY={f.r} />
      ))}

      {/* THE COLLECTION — eleven paintings, one per project and per room */}
      {Array.from({ length: JOURNEY.stations }).map((_, i) => {
        const tt = (i + 0.5) / JOURNEY.stations;
        const z = walkStart - tt * (walkStart - walkEnd);
        const left = i % 2 === 0;
        return (
          <WallPainting
            key={`st${i}`}
            frameUrl={
              i % 3 === 0
                ? "/models/fancy_picture_frame_01/fancy_picture_frame_01_1k.gltf"
                : "/models/hanging_picture_frame_02/hanging_picture_frame_02_1k.gltf"
            }
            plate={PLATES[i] || { num: "—", title: "…", sub: "" }}
            position={[left ? -frameW : frameW, 1.85, z]}
            rotationY={left ? Math.PI / 2 : -Math.PI / 2}
          />
        );
      })}
    </group>
  );
}

/* ---------- free roam: pointer-lock walking inside the palazzo ---------- */
const WALK = { locked: false };

function WalkControls() {
  const controls = useRef();
  const keys = useRef({});
  const { camera } = useThree();

  useEffect(() => {
    const down = (e) => (keys.current[e.code] = true);
    const up = (e) => (keys.current[e.code] = false);
    const want = () => controls.current && controls.current.lock();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("kb:walk", want);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("kb:walk", want);
    };
  }, []);

  useFrame((_, delta) => {
    if (!WALK.locked) return;
    const k = keys.current;
    const speed = (k.ShiftLeft || k.ShiftRight ? 4.6 : 2.6) * Math.min(delta, 0.05);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    if (k.KeyW || k.ArrowUp) camera.position.addScaledVector(fwd, speed);
    if (k.KeyS || k.ArrowDown) camera.position.addScaledVector(fwd, -speed);
    if (k.KeyA || k.ArrowLeft) camera.position.addScaledVector(right, -speed);
    if (k.KeyD || k.ArrowRight) camera.position.addScaledVector(right, speed);
    const L = HALL_DIMS.len;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, HALL_X - HALL_DIMS.halfW, HALL_X + HALL_DIMS.halfW);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -L / 2 + 1.5, L / 2 - 1.5);
    camera.position.y = 1.6;
  });

  return (
    <PointerLockControls
      ref={controls}
      selector="#kb-walk-anchor"
      onLock={() => {
        WALK.locked = true;
        window.dispatchEvent(new Event("kb:lock"));
      }}
      onUnlock={() => {
        WALK.locked = false;
        window.dispatchEvent(new Event("kb:unlock"));
      }}
    />
  );
}

/* ---------- camera + light director ---------- */
function Director({ scrollRef }) {
  const { camera, pointer, scene } = useThree();
  const look = useRef(new THREE.Vector3(HALL_X, 1.5, 0));
  const bg = useMemo(() => GALLERY.clone(), []);

  useFrame(() => {
    if (WALK.locked) return; // the visitor has the wheel
    const p = scrollRef.current;
    const sr = SR();

    // deeper into the building, slightly warmer and dimmer
    const dark = ramp(p, JOURNEY.split - 0.05, JOURNEY.split + 0.04);
    bg.copy(GALLERY).lerp(STONE_DARK, dark);
    scene.background = bg;
    if (scene.fog) {
      scene.fog.color.copy(bg);
      scene.fog.near = THREE.MathUtils.lerp(10, 7, dark);
      scene.fog.far = THREE.MathUtils.lerp(34, 26, dark);
    }

    const fissure = new THREE.Vector3(HALL_X, PLINTH_H + 1.12, sr + 0.05);

    if (p < JOURNEY.split) {
      // Movement I: the sculpture room — approach, then zoom into the fissure
      const a = ease(clamp01(p / (JOURNEY.split * 0.55)));
      const d = ease(clamp01((p - JOURNEY.split * 0.55) / (JOURNEY.split * 0.45)));
      const px = THREE.MathUtils.lerp(HALL_X + 0.15, fissure.x, d) + pointer.x * 0.1 * (1 - d);
      const py =
        THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.35, 1.55, a), fissure.y, d) +
        pointer.y * 0.05 * (1 - d);
      const pz = THREE.MathUtils.lerp(THREE.MathUtils.lerp(sr + 4.6, sr + 2.2, a), fissure.z + 0.05, d);
      camera.position.set(px, py, pz);
      look.current.lerp(d > 0 ? fissure : new THREE.Vector3(HALL_X, PLINTH_H + 1.0, sr), 0.22);
      camera.lookAt(look.current);
      camera.fov = 44 + d * 28;
      camera.updateProjectionMatrix();
    } else {
      // Movement II: strolling the rest of the palazzo
      const t = walkT(p);
      const L = HALL_DIMS.len;
      const walkStart = sr - 3;
      const walkEnd = -L / 2 + 3;
      const z = walkStart - t * (walkStart - walkEnd);
      const bob = Math.sin(t * 46) * 0.02;
      const target = new THREE.Vector3(
        HALL_X + Math.sin(t * 5) * 0.3 + pointer.x * 0.2,
        1.6 + bob + pointer.y * 0.1,
        z
      );
      camera.position.lerp(target, 0.12);
      camera.lookAt(HALL_X + pointer.x * 0.5, 1.45 + pointer.y * 0.2, z - 6);
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
      camera={{ position: [HALL_X, 1.35, 20.6], fov: 44 }}
      style={{ position: "fixed", inset: 0, background: "#f2efe8" }}
    >
      <fog attach="fog" args={["#f2efe8", 10, 34]} />
      {/* daylight falling through the atrium opening */}
      <hemisphereLight args={["#ffffff", "#cfc8ba", 0.75]} />
      <directionalLight position={[HALL_X + 4, 12, 6]} intensity={1.8} color="#fff6e8" />
      <directionalLight position={[HALL_X - 5, 8, -6]} intensity={0.5} color="#dfe8f0" />

      <Building scrollRef={scrollRef} />
      <WalkControls />
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
useGLTF.preload("/models/painted_wooden_bench/painted_wooden_bench_1k.gltf");
useGLTF.preload("/models/fancy_picture_frame_01/fancy_picture_frame_01_1k.gltf");
useGLTF.preload("/models/hanging_picture_frame_02/hanging_picture_frame_02_1k.gltf");
useGLTF.preload("/models/sponza/Sponza_c.gltf");
