import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// PROTOTYPE — throwaway shell for exploring a wave animation. Wire up
// whatever displacement/shading approach is being tested directly in
// WaveMesh below; nothing here is meant to survive past the design pass.

const SEGMENTS = 120;
const SIZE = 12;

function WaveMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const position = geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z =
        Math.sin(x * 0.6 + t) * 0.4 + Math.cos(y * 0.5 + t * 0.8) * 0.3;
      position.setZ(i, z);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.6, 0, 0]}>
      <meshStandardMaterial
        color="#3a6ea5"
        wireframe={false}
        side={THREE.DoubleSide}
        flatShading
      />
    </mesh>
  );
}

export default function WaveLab() {
  return (
    <Canvas camera={{ position: [0, 4, 10], fov: 50 }}>
      <color attach="background" args={["#0b0f14"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <WaveMesh />
      <OrbitControls />
    </Canvas>
  );
}
