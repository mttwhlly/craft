import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Book } from "../data/books";
import { createBookMesh, BOOK_DIMS, REST_ROTATION } from "../bookMesh";

const DURATION = 780;
// Steep tilt so the book reads as a thin, wide bar at the start — matching
// the shelf's foreshortened "looking down at a stack" spine bars — before
// rotating up into the resting 3/4 view that shows the front cover. Y starts
// at 0 (not REST_ROTATION.y): combining a large X tilt with *any* nonzero Y
// produces an apparent diagonal roll under Euler composition, so the yaw is
// introduced gradually as the tilt eases off, not held constant through it.
const START_ROTATION = { x: 1.3, y: 0 };

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
     * Projected pixel width of the mesh's full width, at scale 1, for fitting
     * the start size. Width (not height) is the stable dimension to fit
     * against here: at a steep X tilt the projected height collapses toward
     * zero, which would blow up a height-based scale fit.
     */
    function projectedWidthAt(pos: THREE.Vector3, rot: { x: number; y: number }): number {
      mesh.position.copy(pos);
      mesh.rotation.set(rot.x, rot.y, 0);
      mesh.scale.setScalar(1);
      mesh.updateMatrixWorld(true);
      const left = new THREE.Vector3(-BOOK_DIMS.width / 2, 0, 0)
        .applyMatrix4(mesh.matrixWorld)
        .project(camera);
      const right = new THREE.Vector3(BOOK_DIMS.width / 2, 0, 0)
        .applyMatrix4(mesh.matrixWorld)
        .project(camera);
      return (Math.abs(right.x - left.x) / 2) * w;
    }

    const startPos = screenToWorld(
      originRect.left + originRect.width / 2,
      originRect.top + originRect.height / 2,
    );
    const endPos = screenToWorld(
      targetRect.left + targetRect.width / 2,
      targetRect.top + targetRect.height / 2,
    );

    const startRefWidth = projectedWidthAt(startPos, START_ROTATION);
    const startScale = (originRect.width * 0.96) / startRefWidth;
    // Same camera fov/position/z-plane in both scenes, so matching physical
    // pixel height only needs the ratio of the two canvases' viewport heights.
    const endScale = targetRect.height / h;

    const startTime = performance.now();

    function frame(now: number) {
      const t = Math.min(1, (now - startTime) / DURATION);
      const e = easeInOutCubic(t);

      const pos = startPos.clone().lerp(endPos, e);
      const rotX = THREE.MathUtils.lerp(START_ROTATION.x, REST_ROTATION.x, e);
      const rotY = THREE.MathUtils.lerp(START_ROTATION.y, REST_ROTATION.y, e);
      const scale = THREE.MathUtils.lerp(startScale, endScale, e);

      mesh.position.copy(pos);
      mesh.rotation.set(rotX, rotY, 0);
      mesh.scale.setScalar(scale);

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
