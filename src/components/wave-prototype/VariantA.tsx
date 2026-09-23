import { useEffect, useRef } from "react";
import type { Conditions } from "./types";

const GRAVITY = 9.81;

// Top-down data-diagram: swell arcs sweeping toward a stylized coastline.
// Tests the "over a map" placement idea. Direction/period/height feed the
// arc geometry approximately — this is about the feel, not oceanographic
// accuracy.
export default function VariantA({ conditions }: { conditions: Conditions }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const conditionsRef = useRef(conditions);
  conditionsRef.current = conditions;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let phase = 0;
    let last = performance.now();

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { heightM, periodS, directionDeg } = conditionsRef.current;
      const dpr = devicePixelRatio;
      const w = canvas.width;
      const h = canvas.height;

      const speed = (GRAVITY * periodS) / (2 * Math.PI);
      const wavelengthPx = Math.max(28, periodS * 9) * dpr;
      phase = (phase + dt * speed * 2.4 * dpr) % wavelengthPx;

      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0d2436");
      bg.addColorStop(1, "#123049");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // coastline landmass, bottom-right corner
      ctx.fillStyle = "#1c1a24";
      ctx.beginPath();
      ctx.moveTo(w, h * 0.55);
      ctx.bezierCurveTo(w * 0.78, h * 0.5, w * 0.7, h * 0.75, w * 0.62, h * 0.8);
      ctx.bezierCurveTo(w * 0.55, h * 0.85, w * 0.5, h, w * 0.5, h);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // arcs converge from the direction the swell is coming FROM, centered
      // just outside the canvas so they sweep across it toward the coast
      const rad = (directionDeg * Math.PI) / 180;
      const dirX = Math.sin(rad);
      const dirY = -Math.cos(rad);
      const diag = Math.hypot(w, h);
      const cx = w / 2 - dirX * diag * 0.6;
      const cy = h / 2 - dirY * diag * 0.6;

      // rings only ever occupy the band of distances that actually reaches
      // the canvas from this off-screen origin, so pick that band directly
      let minDist = Infinity;
      let maxDist = 0;
      for (const [px, py] of [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ]) {
        const d = Math.hypot(px - cx, py - cy);
        minDist = Math.min(minDist, d);
        maxDist = Math.max(maxDist, d);
      }

      const startRing = Math.floor(minDist / wavelengthPx) - 1;
      const endRing = Math.ceil(maxDist / wavelengthPx) + 1;
      const bandSpan = maxDist - minDist || 1;

      for (let i = startRing; i <= endRing; i++) {
        const r = phase + i * wavelengthPx;
        if (r < minDist - wavelengthPx || r > maxDist + wavelengthPx) continue;
        const fade = 1 - Math.min(1, Math.max(0, (r - minDist) / bandSpan));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(203, 163, 96, ${
          0.1 + fade * 0.4 * Math.min(heightM / 3, 1.4)
        })`;
        ctx.lineWidth = (1 + heightM * 0.6) * dpr;
        ctx.stroke();
      }

      // compass badge, top-left
      ctx.save();
      ctx.translate(w * 0.14, h * 0.16);
      ctx.strokeStyle = "#efe9dd";
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, 22 * dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.rotate(rad);
      ctx.beginPath();
      ctx.moveTo(0, -16 * dpr);
      ctx.lineTo(-6 * dpr, 6 * dpr);
      ctx.lineTo(6 * dpr, 6 * dpr);
      ctx.closePath();
      ctx.fillStyle = "#cba360";
      ctx.fill();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="wp-stage wp-stage-a">
      <canvas ref={canvasRef} className="wp-canvas" />
      <div className="wp-caption">
        Swell arcs sweeping toward the coast from the report's swell
        direction &mdash; a data-diagram over a map.
      </div>
    </div>
  );
}
