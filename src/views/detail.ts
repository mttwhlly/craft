import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BOOKS, type Book } from "../data/books";
import { generateCover, pagesTexture, toTexture } from "../cover";

const DIMS = { width: 2.6, height: 3.4, depth: 0.46 };

export function renderDetail(container: HTMLElement, book: Book): () => void {
  container.innerHTML = `
    <div class="stage" id="stage">
      <canvas id="scene"></canvas>
      <div class="stage-hint">drag to tilt</div>
    </div>
    <div class="copy">
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

  const stage = container.querySelector("#stage") as HTMLDivElement;
  const canvas = container.querySelector("#scene") as HTMLCanvasElement;
  const reshuffleBtn = container.querySelector("#regenerate") as HTMLButtonElement;

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
  const pagesCanvas = pagesTexture();
  const pagesTex = toTexture(pagesCanvas, true);
  pagesTex.rotation = Math.PI / 2;

  const disposables: { dispose: () => void }[] = [];

  function buildMaterials(currentSeed: number) {
    const cover = generateCover(currentSeed, book.title, book.author);
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

    disposables.push(
      colorTex,
      bumpTex,
      metalTex,
      spineTex,
      frontMat,
      backMat,
      spineMat,
      pageMat,
    );

    return { frontMat, backMat, spineMat, pageMat, accent: cover.accent };
  }

  const geometry = new THREE.BoxGeometry(DIMS.width, DIMS.height, DIMS.depth, 1, 1, 1);
  let materials = buildMaterials(seed);
  const book3d = new THREE.Mesh(geometry, [
    materials.pageMat,
    materials.spineMat,
    materials.pageMat,
    materials.pageMat,
    materials.frontMat,
    materials.backMat,
  ]);
  book3d.rotation.y = -0.55;
  book3d.rotation.x = 0.06;
  scene.add(book3d);

  function applyMaterials() {
    book3d.material = [
      materials.pageMat,
      materials.spineMat,
      materials.pageMat,
      materials.pageMat,
      materials.frontMat,
      materials.backMat,
    ];
  }

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

  function onReshuffle() {
    seed = Math.floor(Math.random() * 1_000_000);
    materials = buildMaterials(seed);
    applyMaterials();
    stage.style.setProperty("--accent", materials.accent);
  }
  reshuffleBtn.addEventListener("click", onReshuffle);
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
        baseRotation.y + Math.sin(idleT) * 0.12,
        0.01,
      );
      targetRotation.x = THREE.MathUtils.lerp(targetRotation.x, baseRotation.x, 0.01);
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
    geometry.dispose();
    disposables.forEach((d) => d.dispose());
    envTex.dispose();
    pmrem.dispose();
    pagesTex.dispose();
    renderer.dispose();
  };
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
