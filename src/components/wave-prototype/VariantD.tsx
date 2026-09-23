import { useFrame, useThree, Canvas } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";
import type { Conditions } from "./types";

const GRAVITY = 9.81;
const OCEAN_WIDTH = 640;
const OCEAN_DEPTH = 360;
const WIDTH_SEGMENTS = 300;
const DEPTH_SEGMENTS = 190;
const NEAR_BIAS = 2.3; // >1 packs vertex resolution toward the camera

// Horizon band sits ~58-64% down this gradient — FOG_COLOR is sampled from
// that band so the far edge of the ocean mesh dissolves into the sky
// instead of showing a hard geometry edge.
const FOG_COLOR = "#8a7358";

function makeSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#0a1420");
  grad.addColorStop(0.42, "#16273a");
  grad.addColorStop(0.56, "#3c4a5c");
  grad.addColorStop(0.6, "#8a7358");
  grad.addColorStop(0.66, "#c99a5e");
  grad.addColorStop(0.72, "#17324a");
  grad.addColorStop(1, "#0c2032");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return new THREE.CanvasTexture(canvas);
}

// Procedural tangent-space normal map for Water's ripple shading — a sum of
// a handful of angled sine wavelets with analytically-exact slopes, so no
// external texture asset is needed. Tiles seamlessly because every
// frequency is an integer multiple of a full turn across the canvas.
function makeWaterNormalTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const wavelets = [
    { freq: 3, angle: 0.4, amp: 2.0 },
    { freq: 5, angle: 2.1, amp: 1.3 },
    { freq: 9, angle: 4.0, amp: 0.8 },
    { freq: 17, angle: 1.1, amp: 0.4 },
    { freq: 29, angle: 3.3, amp: 0.2 },
  ];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dHdx = 0;
      let dHdy = 0;
      for (const w of wavelets) {
        const kx = (Math.cos(w.angle) * w.freq * Math.PI * 2) / size;
        const ky = (Math.sin(w.angle) * w.freq * Math.PI * 2) / size;
        const slope = w.amp * Math.cos(kx * x + ky * y);
        dHdx += slope * kx;
        dHdy += slope * ky;
      }
      const nx = -dHdx;
      const ny = -dHdy;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const i = (y * size + x) * 4;
      image.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      image.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      image.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Builds the ocean plane with depth resolution biased toward the camera
// (see NEAR_BIAS): close swell reads with real detail, distant rows
// compress the way perspective already compresses them. Returns the rest
// (x, y) of every vertex alongside the geometry — Gerstner displacement is
// a function of REST position, not the previous frame's displaced position,
// so we need a stable copy that never gets overwritten.
function makeOceanGeometry() {
  const geo = new THREE.PlaneGeometry(
    OCEAN_WIDTH,
    OCEAN_DEPTH,
    WIDTH_SEGMENTS,
    DEPTH_SEGMENTS,
  );
  const position = geo.attributes.position as THREE.BufferAttribute;
  const baseX = new Float32Array(position.count);
  const baseY = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const t = (y + OCEAN_DEPTH / 2) / OCEAN_DEPTH; // 0 = near camera, 1 = far
    const biased = Math.pow(t, NEAR_BIAS);
    const biasedY = -OCEAN_DEPTH / 2 + biased * OCEAN_DEPTH;
    position.setY(i, biasedY);
    baseX[i] = position.getX(i);
    baseY[i] = biasedY;
  }
  return { geo, baseX, baseY };
}

// Real reflective/refractive water (mirrors the scene into a render target
// each frame, screen-space-distorted by a scrolling normal map, with a
// proper specular sun highlight) instead of a hand-shaded vertex-color
// surface. Large-scale swell shape is layered on top with two effects real
// sine ripples don't have, which is what makes them read as "swell rolling
// toward a beach" rather than bathwater:
//
// 1. Shoreward refraction — offshore, a wave travels along whatever compass
//    bearing the swell slider says; as it shoals toward the camera its
//    crest bends to run parallel to the shore, same as real wave
//    refraction. This is blended per-vertex by `nearness`.
// 2. Gerstner (trochoidal) displacement — vertices move horizontally along
//    the wave direction as well as vertically, producing peaked crests and
//    broad flat troughs instead of symmetric sine humps.
function OceanSurface({ conditions }: { conditions: Conditions }) {
  const conditionsRef = useRef(conditions);
  conditionsRef.current = conditions;

  const { water, baseX, baseY } = useMemo(() => {
    const { geo, baseX, baseY } = makeOceanGeometry();
    const waterNormals = makeWaterNormalTexture();
    const water = new Water(geo, {
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals,
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xfff1d0,
      waterColor: 0x0e3a58,
      distortionScale: 3,
      alpha: 1.0,
      fog: true,
    });
    water.material.uniforms.size.value = 2.2;
    return { water, baseX, baseY };
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const { heightM, periodS, directionDeg } = conditionsRef.current;

    water.material.uniforms.time.value += delta * 0.6;

    const rad = (directionDeg * Math.PI) / 180;
    water.material.uniforms.sunDirection.value
      .set(Math.sin(rad), 0.35, -Math.cos(rad))
      .normalize();

    const geometry = water.geometry;
    const position = geometry.attributes.position as THREE.BufferAttribute;

    const dirX = Math.sin(rad);
    const dirZ = Math.cos(rad);
    const wavelength = Math.max(
      10,
      ((GRAVITY * periodS * periodS) / (2 * Math.PI)) * 0.14,
    );
    const k = (2 * Math.PI) / wavelength;
    const speed = Math.sqrt(GRAVITY / k);
    const amp = 1.6 * (1 - Math.exp(-heightM * 0.28));
    // target steepness (k * Q * amp). The wave direction itself varies
    // across the field (shoreward refraction below), so neighbouring
    // vertices can pull in slightly different directions on top of their
    // own phase motion — a steepness safe for a single uniform wave train
    // can still fold the surface here. Keep well under 1.
    const steepQ = amp > 0 ? Math.min(1, 0.35 / (k * amp)) : 0;

    const rad2 = rad + 0.6;
    const dir2X = Math.sin(rad2);
    const dir2Z = Math.cos(rad2);
    const k2 = k * 2.6;
    const amp2 = amp * 0.16;
    const speed2 = Math.sqrt(GRAVITY / k2);

    for (let i = 0; i < position.count; i++) {
      const x0 = baseX[i];
      const y0 = baseY[i]; // pre-rotation local y; world z0 = -y0
      const worldZ0 = -y0;

      const nearness = THREE.MathUtils.clamp(
        (worldZ0 + OCEAN_DEPTH / 2) / OCEAN_DEPTH,
        0,
        1,
      );
      // smoothstep: bounded derivative everywhere, so the propagation
      // direction never changes abruptly between neighbouring vertices
      // (an unbounded-slope easing curve here is what was folding the
      // surface into visible creases)
      const refraction = nearness * nearness * (3 - 2 * nearness);
      let edx = THREE.MathUtils.lerp(dirX, 0, refraction);
      let edz = THREE.MathUtils.lerp(dirZ, 1, refraction);
      const elen = Math.hypot(edx, edz) || 1;
      edx /= elen;
      edz /= elen;

      const theta = k * (edx * x0 + edz * worldZ0) - speed * k * t;
      const c = Math.cos(theta);
      const s = Math.sin(theta);

      const dispX = steepQ * amp * edx * c;
      const dispZWorld = steepQ * amp * edz * c;
      const dispY = amp * s;

      const phase2 = k2 * (dir2X * x0 + dir2Z * worldZ0) - speed2 * k2 * t * 1.3;
      const chop = Math.sin(phase2) * amp2;

      position.setX(i, x0 + dispX);
      position.setY(i, y0 - dispZWorld);
      position.setZ(i, dispY + chop);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <primitive
      object={water}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, -OCEAN_DEPTH / 2 + 6]}
    />
  );
}

function Beach() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 7.5]}>
      <planeGeometry args={[OCEAN_WIDTH, 7]} />
      <meshStandardMaterial color="#cdb98e" roughness={1} />
    </mesh>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    camera.position.y = 1.6 + Math.sin(t * 0.35) * 0.02;
    camera.lookAt(0, 1.3, -80);
  });
  return null;
}

export default function VariantD({ conditions }: { conditions: Conditions }) {
  const skyTexture = useMemo(() => makeSkyTexture(), []);
  return (
    <div className="wp-stage wp-stage-d">
      <Canvas camera={{ position: [0, 1.6, 6], fov: 58, near: 0.1, far: 500 }}>
        <primitive attach="background" object={skyTexture} />
        <fogExp2 attach="fog" args={[FOG_COLOR, 0.011]} />
        <hemisphereLight args={["#a8cbe6", "#0c2e4a", 1.1]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[-40, 15, 30]} intensity={0.3} color="#7fa8c9" />
        <CameraRig />
        <Beach />
        <OceanSurface conditions={conditions} />
      </Canvas>
      <div className="wp-caption">
        Eye-level view from the beach, built on three.js's real reflective
        Water shader &mdash; height, period, and swell direction drive
        wave displacement and where the sun glints off the water.
      </div>
    </div>
  );
}
