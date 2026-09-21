import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import "./style.css";
import { generateCover, pagesTexture, toTexture } from "./cover";

const BOOK = {
  title: "Built to Render",
  byline: "An original study",
  width: 2.6,
  height: 3.4,
  depth: 0.46,
};

const stage = document.getElementById("stage") as HTMLDivElement;
const canvas = document.getElementById("scene") as HTMLCanvasElement;
const reshuffleBtn = document.getElementById("regenerate") as HTMLButtonElement;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0.1, 7.2);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const key = new THREE.DirectionalLight(0xfff2df, 2.4);
key.position.set(3, 4, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0x9db4ff, 0.5);
fill.position.set(-4, -1, 3);
scene.add(fill);

scene.add(new THREE.AmbientLight(0x404050, 0.6));

let seed = Math.floor(Math.random() * 1_000_000);
const pages = pagesTexture();
const pagesTex = toTexture(pages, true);
pagesTex.rotation = Math.PI / 2;

function buildMaterials(currentSeed: number) {
  const cover = generateCover(currentSeed, BOOK.title, BOOK.byline);
  const colorTex = toTexture(cover.colorCanvas);
  const bumpTex = toTexture(cover.bumpCanvas, true);
  const metalTex = toTexture(cover.metalnessCanvas, true);
  const spineTex = toTexture(cover.spineCanvas);

  const frontMat = new THREE.MeshStandardMaterial({
    map: colorTex,
    bumpMap: bumpTex,
    bumpScale: 0.012,
    metalnessMap: metalTex,
    metalness: 1,
    roughness: 0.55,
  });
  const backMat = new THREE.MeshStandardMaterial({
    map: colorTex,
    roughness: 0.75,
    metalness: 0.05,
  });
  const spineMat = new THREE.MeshStandardMaterial({
    map: spineTex,
    roughness: 0.6,
    metalness: 0.3,
  });
  const pageMat = new THREE.MeshStandardMaterial({
    map: pagesTex,
    roughness: 0.95,
    metalness: 0,
  });

  return { frontMat, backMat, spineMat, pageMat, accent: cover.accent };
}

const geometry = new THREE.BoxGeometry(BOOK.width, BOOK.height, BOOK.depth, 1, 1, 1);
let materials = buildMaterials(seed);
// BoxGeometry face group order: +x right, -x left, +y top, -y bottom, +z front, -z back
const book = new THREE.Mesh(geometry, [
  materials.pageMat, // right (fore-edge)
  materials.spineMat, // left (spine)
  materials.pageMat, // top
  materials.pageMat, // bottom
  materials.frontMat, // front cover
  materials.backMat, // back cover
]);
book.rotation.y = -0.55;
book.rotation.x = 0.06;
scene.add(book);

function applyMaterials() {
  book.material = [
    materials.pageMat,
    materials.spineMat,
    materials.pageMat,
    materials.pageMat,
    materials.frontMat,
    materials.backMat,
  ];
}

// --- drag-to-tilt interaction ---
let dragging = false;
let lastX = 0;
let lastY = 0;
let velX = 0;
let velY = 0;
const baseRotation = { x: 0.06, y: -0.55 };
const rotation = { x: baseRotation.x, y: baseRotation.y };
const targetRotation = { x: baseRotation.x, y: baseRotation.y };
let idleT = 0;

function pointerDown(e: PointerEvent) {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  velX = 0;
  velY = 0;
  canvas.setPointerCapture(e.pointerId);
}

function pointerMove(e: PointerEvent) {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  velX = dx * 0.006;
  velY = dy * 0.006;
  targetRotation.y += velX;
  targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + velY, -0.6, 0.6);
}

function pointerUp(e: PointerEvent) {
  dragging = false;
  canvas.releasePointerCapture(e.pointerId);
}

canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerUp);

reshuffleBtn.addEventListener("click", () => {
  seed = Math.floor(Math.random() * 1_000_000);
  materials = buildMaterials(seed);
  applyMaterials();
  stage.style.setProperty("--accent", materials.accent);
});
stage.style.setProperty("--accent", materials.accent);

function resize() {
  const rect = stage.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const ro = new ResizeObserver(resize);
ro.observe(stage);
resize();

function animate() {
  requestAnimationFrame(animate);

  if (!dragging) {
    // gentle momentum decay, then settle back toward a pleasant resting angle
    velX *= 0.92;
    velY *= 0.92;
    targetRotation.y += velX;
    targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + velY, -0.6, 0.6);
    idleT += 0.004;
    targetRotation.y = THREE.MathUtils.lerp(
      targetRotation.y,
      baseRotation.y + Math.sin(idleT) * 0.12,
      0.01,
    );
    targetRotation.x = THREE.MathUtils.lerp(targetRotation.x, baseRotation.x, 0.01);
  }

  rotation.x = THREE.MathUtils.lerp(rotation.x, targetRotation.x, 0.12);
  rotation.y = THREE.MathUtils.lerp(rotation.y, targetRotation.y, 0.12);
  book.rotation.x = rotation.x;
  book.rotation.y = rotation.y;

  renderer.render(scene, camera);
}

animate();
