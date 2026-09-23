import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Book } from "./books";
import { createBookMesh, REST_ROTATION } from "./bookMesh";

export interface DetailShell {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  reshuffleBtn: HTMLButtonElement;
  copy: HTMLElement;
}

/** Reads the detail page's already-rendered markup (Astro owns the HTML/copy templating). */
export function queryDetailShell(root: ParentNode = document): DetailShell {
  return {
    stage: root.querySelector("#stage") as HTMLDivElement,
    canvas: root.querySelector("#scene") as HTMLCanvasElement,
    reshuffleBtn: root.querySelector("#regenerate") as HTMLButtonElement,
    copy: root.querySelector("#copy") as HTMLElement,
  };
}

/** Fades in a shell's copy panel (used after a flight animation hands off to the live scene). */
export function revealCopy(copy: HTMLElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => copy.classList.remove("copy-hidden"));
  });
}

/** Boots the three.js scene into an already-mounted shell. Returns a dispose function. */
export function initDetailScene(shell: DetailShell, book: Book): () => void {
  const { stage, canvas, reshuffleBtn } = shell;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.1, 7.2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const key = new THREE.DirectionalLight(0xfff2df, 2.4);
  key.position.set(3, 4, 5);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9db4ff, 0.5);
  fill.position.set(-4, -1, 3);
  scene.add(fill);

  scene.add(new THREE.AmbientLight(0x404050, 0.6));

  let seed = book.seed;
  const { mesh: book3d, reshuffle, disposeAll, accent: initialAccent } = createBookMesh(book, seed);
  scene.add(book3d);

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velX = 0;
  let velY = 0;
  const rotation = { x: REST_ROTATION.x, y: REST_ROTATION.y };
  const targetRotation = { x: REST_ROTATION.x, y: REST_ROTATION.y };
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

  function onReshuffle() {
    seed = Math.floor(Math.random() * 1_000_000);
    const accent = reshuffle(seed);
    stage.style.setProperty("--accent", accent);
  }
  reshuffleBtn.addEventListener("click", onReshuffle);
  stage.style.setProperty("--accent", initialAccent);

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

  let rafId = 0;
  function animate() {
    rafId = requestAnimationFrame(animate);

    if (!dragging) {
      velX *= 0.92;
      velY *= 0.92;
      targetRotation.y += velX;
      targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + velY, -0.6, 0.6);
      idleT += 0.004;
      targetRotation.y = THREE.MathUtils.lerp(
        targetRotation.y,
        REST_ROTATION.y + Math.sin(idleT) * 0.12,
        0.01,
      );
      targetRotation.x = THREE.MathUtils.lerp(targetRotation.x, REST_ROTATION.x, 0.01);
    }

    rotation.x = THREE.MathUtils.lerp(rotation.x, targetRotation.x, 0.12);
    rotation.y = THREE.MathUtils.lerp(rotation.y, targetRotation.y, 0.12);
    book3d.rotation.x = rotation.x;
    book3d.rotation.y = rotation.y;

    renderer.render(scene, camera);
  }
  animate();

  return function dispose() {
    cancelAnimationFrame(rafId);
    ro.disconnect();
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", pointerUp);
    reshuffleBtn.removeEventListener("click", onReshuffle);
    disposeAll();
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}
