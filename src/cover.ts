import * as THREE from "three";

/**
 * Procedural cover art. Nothing here touches a real Stripe Press asset —
 * every pattern is generated at runtime from a random seed, in the spirit
 * of the flow-field marbling and foil-stamped titling their covers use.
 */

const PALETTES: { base: [string, string]; accent: string; ink: string }[] = [
  { base: ["#1f2d3d", "#2c4356"], accent: "#d9b26a", ink: "#f2ead9" },
  { base: ["#5c1f2e", "#7a2a3d"], accent: "#e8c97a", ink: "#f4e9d8" },
  { base: ["#2f3b2a", "#3f4f38"], accent: "#c9a24b", ink: "#efe7cf" },
  { base: ["#26232f", "#382f45"], accent: "#cba360", ink: "#efe9dd" },
  { base: ["#8a5a2e", "#a97438"], accent: "#f6e2b0", ink: "#2b1c0d" },
];

// Simple deterministic PRNG so a given seed always reproduces the same cover.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawFlowField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  palette: (typeof PALETTES)[number],
) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, palette.base[0]);
  grad.addColorStop(1, palette.base[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const strands = 46;
  for (let s = 0; s < strands; s++) {
    const startX = rand() * w;
    const startY = rand() * h;
    const phase = rand() * Math.PI * 2;
    const freq = 0.004 + rand() * 0.006;
    const amp = 40 + rand() * 90;
    const lightness = rand();
    ctx.strokeStyle =
      lightness > 0.72
        ? hexAlpha(palette.accent, 0.16 + rand() * 0.14)
        : hexAlpha(palette.ink, 0.05 + rand() * 0.06);
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    let x = startX;
    let y = startY;
    ctx.moveTo(x, y);
    const steps = 60;
    for (let i = 0; i < steps; i++) {
      const angle = Math.sin(y * freq + phase) * Math.PI + Math.cos(x * freq * 0.6) * 0.6;
      x += Math.cos(angle) * amp * 0.06;
      y += Math.sin(angle) * amp * 0.06 + h / steps;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Soft vignette so the edges read as cloth/board rather than flat print.
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function hexAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface CoverResult {
  colorCanvas: HTMLCanvasElement;
  bumpCanvas: HTMLCanvasElement;
  metalnessCanvas: HTMLCanvasElement;
  spineCanvas: HTMLCanvasElement;
  accent: string;
}

export function generateCover(
  seed: number,
  title: string,
  byline: string,
  w = 1024,
  h = 1400,
): CoverResult {
  const rand = mulberry32(seed);
  const palette = PALETTES[Math.floor(rand() * PALETTES.length) % PALETTES.length];

  // --- front face color layer ---
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = w;
  colorCanvas.height = h;
  const ctx = colorCanvas.getContext("2d")!;
  drawFlowField(ctx, w, h, rand, palette);

  // Foil title block, drawn once and reused (mirrored) for the bump + metal masks.
  const titleSize = w * 0.085;
  const bylineSize = w * 0.032;
  const marginX = w * 0.12;
  const maxWidth = w - marginX * 2;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = palette.accent;
  ctx.font = `500 ${titleSize}px Georgia, serif`;
  const lines = wrapLines(ctx, title, maxWidth);
  const lineHeight = titleSize * 1.12;
  const titleBlockHeight = lines.length * lineHeight;
  const titleTop = h * 0.62;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = titleSize * 0.06;
  ctx.shadowOffsetY = titleSize * 0.03;
  lines.forEach((l, i) => {
    ctx.fillText(l, marginX, titleTop + i * lineHeight);
  });
  ctx.restore();

  ctx.font = `italic 400 ${bylineSize}px Georgia, serif`;
  ctx.fillStyle = hexAlpha(palette.ink, 0.85);
  ctx.fillText(byline, marginX, titleTop + titleBlockHeight + bylineSize * 1.4);

  // Rule above the title, a recurring Stripe-Press-style motif reinterpreted here.
  ctx.strokeStyle = hexAlpha(palette.accent, 0.8);
  ctx.lineWidth = w * 0.003;
  ctx.beginPath();
  ctx.moveTo(marginX, titleTop - lineHeight * 0.7);
  ctx.lineTo(marginX + w * 0.14, titleTop - lineHeight * 0.7);
  ctx.stroke();

  // --- bump layer: grayscale copy that raises the foil text slightly ---
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = w;
  bumpCanvas.height = h;
  const bctx = bumpCanvas.getContext("2d")!;
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, w, h);
  bctx.fillStyle = "#ffffff";
  bctx.font = `500 ${titleSize}px Georgia, serif`;
  lines.forEach((l, i) => bctx.fillText(l, marginX, titleTop + i * lineHeight));
  bctx.font = `italic 400 ${bylineSize}px Georgia, serif`;
  lines.length && bctx.fillText(byline, marginX, titleTop + titleBlockHeight + bylineSize * 1.4);

  // --- metalness mask: pure black except the foil text, which is white ---
  const metalnessCanvas = document.createElement("canvas");
  metalnessCanvas.width = w;
  metalnessCanvas.height = h;
  const mctx = metalnessCanvas.getContext("2d")!;
  mctx.fillStyle = "#000000";
  mctx.fillRect(0, 0, w, h);
  mctx.fillStyle = "#ffffff";
  mctx.font = `500 ${titleSize}px Georgia, serif`;
  lines.forEach((l, i) => mctx.fillText(l, marginX, titleTop + i * lineHeight));
  mctx.fillStyle = "#dddddd";
  mctx.strokeStyle = "#ffffff";
  mctx.lineWidth = w * 0.003;
  mctx.beginPath();
  mctx.moveTo(marginX, titleTop - lineHeight * 0.7);
  mctx.lineTo(marginX + w * 0.14, titleTop - lineHeight * 0.7);
  mctx.stroke();

  // --- spine face: same palette, vertical title ---
  const spineCanvas = document.createElement("canvas");
  spineCanvas.width = 220;
  spineCanvas.height = h;
  const sctx = spineCanvas.getContext("2d")!;
  drawFlowField(sctx, spineCanvas.width, h, mulberry32(seed + 1), palette);
  sctx.save();
  sctx.translate(spineCanvas.width / 2, h / 2);
  sctx.rotate(Math.PI / 2);
  sctx.textAlign = "center";
  sctx.fillStyle = palette.accent;
  sctx.font = `500 ${spineCanvas.width * 0.22}px Georgia, serif`;
  sctx.fillText(title, 0, spineCanvas.width * 0.08);
  sctx.restore();

  return { colorCanvas, bumpCanvas, metalnessCanvas, spineCanvas, accent: palette.accent };
}

/** The short horizontal "spine" bar used on the shelf/home view. */
export function generateSpineBar(
  seed: number,
  title: string,
  author: string,
  w = 1000,
  h = 120,
): { canvas: HTMLCanvasElement; accent: string } {
  const rand = mulberry32(seed);
  const palette = PALETTES[Math.floor(rand() * PALETTES.length) % PALETTES.length];

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  drawFlowField(ctx, w, h, rand, palette);

  const authorSize = h * 0.16;
  const titleSize = h * 0.22;
  const marginX = w * 0.045;

  ctx.textBaseline = "middle";
  ctx.font = `italic 400 ${authorSize}px Georgia, serif`;
  ctx.fillStyle = hexAlpha(palette.ink, 0.88);
  ctx.fillText(author, marginX, h * 0.52, w * 0.3);

  ctx.font = `500 ${titleSize}px Georgia, serif`;
  ctx.fillStyle = palette.accent;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = titleSize * 0.08;
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, w / 2 - titleWidth / 2, h * 0.52);
  ctx.restore();

  return { canvas, accent: palette.accent };
}

export function pagesTexture(w = 256, h = 1400): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#efe6d2";
  ctx.fillRect(0, 0, w, h);
  const lines = 90;
  for (let i = 0; i < lines; i++) {
    const y = (i / lines) * h + (Math.random() - 0.5) * 2;
    ctx.strokeStyle = `rgba(120,105,80,${0.08 + Math.random() * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  return c;
}

export function toTexture(canvas: HTMLCanvasElement, isData = false): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isData ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
