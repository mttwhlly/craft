import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Book } from "../data/books";
import { createBookMesh, BOOK_DIMS, REST_ROTATION } from "../bookMesh";

const DURATION = 780;
// The X tilt never leaves REST_ROTATION.x: any larger tilt turns the top
// (pages) face toward the camera — even a moderate tilt lets a visible white
// wedge of it leak into view, which reads as the book flashing open to its
// page edge instead of swinging smoothly from spine to cover. The "reads as
// a flat spine bar" start pose instead comes from squashing the mesh's own
// height via non-uniform scale (see startExtents/scale below), which can't
// expose a face that a rotation change would. Y starts at 0 — dead-on to the
// cover, like the shelf's flat spine bars — and opens to REST_ROTATION.y
// over the course of the flight.
const START_ROTATION_X = REST_ROTATION.x;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Flies a book mesh, in a fixed full-viewport overlay, from `originRect`
 * (the clicked shelf spine) to `targetRect` (the detail view's `.stage`).
 * Both this scene's camera and the detail scene's camera share the same
 * fov/position/no-lookAt setup, so the math below (screen->world on the
 * z=0 plane, and scale = targetRect.height / window.innerHeight) lands
 * the mesh exactly where the live detail scene will pick it up — no pop.
 */
export function flyBookToStage(book: Book, originRect: DOMRect, targetRect: DOMRect): Promise<void> {
  return new Promise((resolve) => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const canvas = document.createElement("canvas");
    canvas.className = "flight-canvas";
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.set(0, 0.1, 7.2);
    // matrixWorld is normally refreshed during a render pass; we need it
    // correct *before* the first render for the screen<->world math below.
    camera.updateMatrixWorld(true);

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

    const { mesh, disposeAll } = createBookMesh(book, book.seed);
    scene.add(mesh);

    function screenToWorld(px: number, py: number): THREE.Vector3 {
      const ndcX = (px / w) * 2 - 1;
      const ndcY = -(py / h) * 2 + 1;
      const point = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
      const dir = point.sub(camera.position).normalize();
      const dist = (0 - camera.position.z) / dir.z;
      return camera.position.clone().add(dir.multiplyScalar(dist));
    }

    /**
     * Projected pixel width/height of the mesh's screen-space bounding box, at
     * scale 1, for fitting the start size. Measured across all 8 box corners
     * (not just a mid-line) because perspective makes the near/far edges
     * noticeably wider or narrower on screen than a flat measurement would.
     */
    function projectedExtentsAt(
      pos: THREE.Vector3,
      rot: { x: number; y: number },
    ): { w: number; h: number } {
      mesh.position.copy(pos);
      mesh.rotation.set(rot.x, rot.y, 0);
      mesh.scale.setScalar(1);
      mesh.updateMatrixWorld(true);
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const corner = new THREE.Vector3(
              (sx * BOOK_DIMS.width) / 2,
              (sy * BOOK_DIMS.height) / 2,
              (sz * BOOK_DIMS.depth) / 2,
            )
              .applyMatrix4(mesh.matrixWorld)
              .project(camera);
            minX = Math.min(minX, corner.x);
            maxX = Math.max(maxX, corner.x);
            minY = Math.min(minY, corner.y);
            maxY = Math.max(maxY, corner.y);
          }
        }
      }
      return { w: ((maxX - minX) / 2) * w, h: ((maxY - minY) / 2) * h };
    }

    const startPos = screenToWorld(
      originRect.left + originRect.width / 2,
      originRect.top + originRect.height / 2,
    );
    const endPos = screenToWorld(
      targetRect.left + targetRect.width / 2,
      targetRect.top + targetRect.height / 2,
    );

    // Fit width and height independently against the (typically wide, short)
    // origin rect — the mesh starts squashed on Y to match that flat aspect,
    // then un-squashes back to uniform scale as it flies. This is what reads
    // as "a flat spine bar" at the start, without ever tilting the box (see
    // the note above on why tilting is the wrong tool for that job).
    const startExtents = projectedExtentsAt(startPos, { x: START_ROTATION_X, y: 0 });
    const startScaleX = (originRect.width * 0.96) / startExtents.w;
    const startScaleY = (originRect.height * 0.96) / startExtents.h;
    // Same camera fov/position/z-plane in both scenes, so matching physical
    // pixel height only needs the ratio of the two canvases' viewport heights.
    const endScale = targetRect.height / h;

    const startTime = performance.now();

    function frame(now: number) {
      const t = Math.min(1, (now - startTime) / DURATION);
      const e = easeInOutCubic(t);

      const pos = startPos.clone().lerp(endPos, e);
      const rotY = THREE.MathUtils.lerp(0, REST_ROTATION.y, e);
      const scaleX = THREE.MathUtils.lerp(startScaleX, endScale, e);
      const scaleY = THREE.MathUtils.lerp(startScaleY, endScale, e);

      mesh.position.copy(pos);
      mesh.rotation.set(START_ROTATION_X, rotY, 0);
      mesh.scale.set(scaleX, scaleY, scaleX);

      renderer.render(scene, camera);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        disposeAll();
        envTex.dispose();
        pmrem.dispose();
        renderer.dispose();
        canvas.remove();
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}
