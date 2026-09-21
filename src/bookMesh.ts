import * as THREE from "three";
import type { Book } from "./data/books";
import { generateCover, pagesTexture, toTexture } from "./cover";

export const BOOK_DIMS = { width: 2.6, height: 3.4, depth: 0.46 };
export const REST_ROTATION = { x: 0.06, y: -0.55 };

export interface BookMeshHandle {
  mesh: THREE.Mesh;
  /** Regenerate the cover with a new seed, returning its accent color. */
  reshuffle(seed: number): string;
  accent: string;
  disposeAll(): void;
}

/** Builds the shared multi-material book box used by both the detail view and the shelf-to-book flight. */
export function createBookMesh(book: Book, seed: number): BookMeshHandle {
  const disposables: { dispose: () => void }[] = [];
  const pagesCanvas = pagesTexture();
  const pagesTex = toTexture(pagesCanvas, true);
  pagesTex.rotation = Math.PI / 2;
  disposables.push(pagesTex);

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

    disposables.push(colorTex, bumpTex, metalTex, spineTex, frontMat, backMat, spineMat, pageMat);

    return { frontMat, backMat, spineMat, pageMat, accent: cover.accent };
  }

  const geometry = new THREE.BoxGeometry(
    BOOK_DIMS.width,
    BOOK_DIMS.height,
    BOOK_DIMS.depth,
    1,
    1,
    1,
  );
  let materials = buildMaterials(seed);
  const mesh = new THREE.Mesh(geometry, [
    materials.pageMat,
    materials.spineMat,
    materials.pageMat,
    materials.pageMat,
    materials.frontMat,
    materials.backMat,
  ]);
  mesh.rotation.y = REST_ROTATION.y;
  mesh.rotation.x = REST_ROTATION.x;

  const handle: BookMeshHandle = {
    mesh,
    accent: materials.accent,
    reshuffle(newSeed: number) {
      materials = buildMaterials(newSeed);
      mesh.material = [
        materials.pageMat,
        materials.spineMat,
        materials.pageMat,
        materials.pageMat,
        materials.frontMat,
        materials.backMat,
      ];
      handle.accent = materials.accent;
      return materials.accent;
    },
    disposeAll() {
      geometry.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };

  return handle;
}
