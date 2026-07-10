/* A single marble bust on a plain gallery-white ground. As the hero scrolls,
   veins of light spread through the stone and it breaks apart. Nothing else —
   the projects and experience live in normal scrolling sections below. */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Center, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

const VEIN = new THREE.Color("#ffb36b");
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const ramp = (p, a, b) => ease(clamp01((p - a) / (b - a)));

function seeded(s) {
  let x = s;
  return () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
}

/* branching crack texture painted once */
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

const BUST_SCALE = 3.15;

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
      o.material.emissiveIntensity = 0.1;
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
              `  transformed += (dir * (0.55 + 0.45*h) + jit * 0.9) * uBreak * 0.55;\n` +
              `}`
          );
        shaders.current.push(shader);
      };
      o.material.needsUpdate = true;
      mats.current.push(o.material);
    });
  }, [scene, crackTex]);

  useFrame(({ clock }) => {
    const p = scrollRef.current; // 0..1 across the hero only
    const glow = 0.1 + ramp(p, 0.05, 0.5) * (2.4 + 0.35 * Math.sin(clock.elapsedTime * 1.7));
    mats.current.forEach((m) => (m.emissiveIntensity = glow));
    // break apart across the back half of the hero scroll
    shaders.current.forEach((s) => (s.uniforms.uBreak.value = ramp(p, 0.4, 1.0)));
  });

  return (
    <Center position={[0, 0.35, 0]}>
      <primitive object={scene} scale={BUST_SCALE} />
    </Center>
  );
}

/* a slow turntable + parallax so the marble feels alive before it breaks */
function Rig({ scrollRef, children }) {
  const g = useRef();
  const { pointer } = useThree();
  useFrame(() => {
    if (!g.current) return;
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, pointer.x * 0.25, 0.06);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, -pointer.y * 0.12, 0.06);
  });
  return <group ref={g}>{children}</group>;
}

export default function NeuralCanvas({ scrollRef }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.7, 4.4], fov: 44 }}
      style={{ position: "fixed", inset: 0, background: "#f2efe8" }}
    >
      <fog attach="fog" args={["#f2efe8", 7, 15]} />
      <hemisphereLight args={["#ffffff", "#d8d0c0", 0.85]} />
      <directionalLight position={[3, 5, 3]} intensity={2.2} color="#fff6e8" castShadow />
      <directionalLight position={[-4, 2, -2]} intensity={0.5} color="#dfe8f0" />

      <Rig scrollRef={scrollRef}>
        <Bust scrollRef={scrollRef} />
      </Rig>
      <ContactShadows position={[0, -1.15, 0]} opacity={0.4} scale={7} blur={2.6} far={3} color="#3a352c" />

      <EffectComposer>
        <Bloom intensity={0.75} luminanceThreshold={0.7} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.42} />
      </EffectComposer>
    </Canvas>
  );
}

useGLTF.preload("/models/bust/marble_bust_01_1k.gltf");
