import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Conditions } from "./types";

const SEGMENTS = 160;
const SIZE = 24;
const GRAVITY = 9.81;

// Literal 3D ocean surface, fixed cinematic camera (this is meant to sit
// above a report as a banner, not be orbited). Two summed sine components
// stand in for a real Gerstner/JONSWAP wave field; amplitude/wavelength/
// speed are driven by height, period, and swell direction.
function OceanSurface({ conditions }: { conditions: Conditions }) {
  const conditionsRef = useRef(conditions);
  conditionsRef.current = conditions;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(
        new Float32Array(geo.attributes.position.count * 3),
        3,
      ),
    );
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const { heightM, periodS, directionDeg } = conditionsRef.current;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const color = geometry.attributes.color as THREE.BufferAttribute;

    const rad = (directionDeg * Math.PI) / 180;
    const dirX = Math.sin(rad);
    const dirY = Math.cos(rad);

    const wavelength = Math.max(
      2,
      ((GRAVITY * periodS * periodS) / (2 * Math.PI)) * 0.05,
    );
    const k = (2 * Math.PI) / wavelength;
    const speed = Math.sqrt(GRAVITY / k);
    const amp = Math.min(heightM * 0.22, 1.6);

    const rad2 = rad + 0.9;
    const dir2X = Math.sin(rad2);
    const dir2Y = Math.cos(rad2);
    const k2 = k * 1.7;
    const amp2 = amp * 0.35;

    const base = new THREE.Color("#3a6ea5");
    const foam = new THREE.Color("#eef3f6");
    const tmp = new THREE.Color();

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const phase1 = k * (x * dirX + y * dirY) - speed * k * t;
      const phase2 = k2 * (x * dir2X + y * dir2Y) - speed * k2 * t * 1.3;
      const z = Math.sin(phase1) * amp + Math.sin(phase2) * amp2;
      position.setZ(i, z);

      const crest = Math.max(0, (z / (amp + amp2) - 0.78) * 4.5);
      tmp.copy(base).lerp(foam, THREE.MathUtils.clamp(crest, 0, 1));
      color.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        vertexColors
        roughness={0.55}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function CameraAim() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0, -6);
  }, [camera]);
  return null;
}

export default function VariantB({ conditions }: { conditions: Conditions }) {
  return (
    <div className="wp-stage wp-stage-b">
      <Canvas camera={{ position: [0, 2.4, 9], fov: 55 }}>
        <color attach="background" args={["#0b1220"]} />
        <fog attach="fog" args={["#0b1220", 8, 26]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 8, 4]} intensity={0.9} color="#ffe9c7" />
        <directionalLight
          position={[-6, 4, -4]}
          intensity={0.25}
          color="#7fb2d9"
        />
        <CameraAim />
        <OceanSurface conditions={conditions} />
      </Canvas>
      <div className="wp-caption">
        A literal ocean surface &mdash; height, period, and swell direction
        drive real displacement and a foam highlight at the crests.
      </div>
    </div>
  );
}
