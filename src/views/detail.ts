import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BOOKS, type Book } from "../data/books";
import { createBookMesh, REST_ROTATION } from "../bookMesh";

export interface DetailShell {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  reshuffleBtn: HTMLButtonElement;
  copy: HTMLDivElement;
}

/** Mounts the detail view's DOM only — no WebGL yet. Lets callers measure `.stage` before the scene spins up. */
export function mountDetailShell(
  container: HTMLElement,
  book: Book,
  opts: { fadeInCopy?: boolean } = {},
): DetailShell {
  container.innerHTML = `
    <div class="stage" id="stage">
      <canvas id="scene"></canvas>
      <div class="stage-hint">drag to tilt</div>
    </div>
    <div class="copy${opts.fadeInCopy ? " copy-hidden" : ""}" id="copy">
      <p class="kicker">Craft Press &middot; No. ${String(
        BOOKS.findIndex((b) => b.slug === book.slug) + 1,
      ).padStart(2, "0")}</p>
      <h1>${escapeHtml(book.title)}</h1>
      <p class="byline">${escapeHtml(book.author)}</p>
      <hr />
      <p>
        This cover is generated, not scanned: a seeded flow-field pattern,
        a foil-stamped title with its own bump and metalness layers, and a
        real 3D book mesh lit with image-based reflections. Drag it, or
        reshuffle for a different take on the same title.
      </p>
      <p class="fineprint">
        Title and author as listed on Stripe Press &mdash; the artwork
        itself is an original procedural interpretation, not the real cover.
      </p>
      <button id="regenerate" class="btn">Reshuffle cover</button>
    </div>
  `;

  return {
    stage: container.querySelector("#stage") as HTMLDivElement,
    canvas: container.querySelector("#scene") as HTMLCanvasElement,
    reshuffleBtn: container.querySelector("#regenerate") as HTMLButtonElement,
    copy: container.querySelector("#copy") as HTMLDivElement,
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

/** Convenience: mount + boot in one call, for direct loads / back-forward nav with no flight animation. */
export function renderDetail(container: HTMLElement, book: Book): () => void {
  const shell = mountDetailShell(container, book);
  return initDetailScene(shell, book);
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
