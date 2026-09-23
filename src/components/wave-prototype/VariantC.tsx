import { useEffect, useRef } from "react";
import type { Conditions } from "./types";

const GRAVITY = 9.81;

// Compact animated side-profile / cross-section diagram — reads like a
// chart, cheap enough to run as a thin strip right above the report text.
export default function VariantC({ conditions }: { conditions: Conditions }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const conditionsRef = useRef(conditions);
  conditionsRef.current = conditions;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
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
      t += dt;
      const dpr = devicePixelRatio;
      const { heightM, periodS, directionDeg } = conditionsRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const midY = h * 0.55;
      const pxPerMeter = h * 0.11;
      const amp = (heightM / 2) * pxPerMeter;
      const wavelength = Math.max(60, periodS * 26) * dpr;
      const speed = (GRAVITY * periodS) / (2 * Math.PI);
      const k = (2 * Math.PI) / wavelength;
      const waveY = (x: number) => midY + Math.sin(k * x - speed * k * t) * amp;

      ctx.clearRect(0, 0, w, h);

      const sky = ctx.createLinearGradient(0, 0, 0, midY);
      sky.addColorStop(0, "#1c1a24");
      sky.addColorStop(1, "#26232f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, midY + amp + 4);

      ctx.beginPath();
      ctx.moveTo(0, midY);
      for (let x = 0; x <= w; x += 4 * dpr) {
        ctx.lineTo(x, waveY(x));
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const water = ctx.createLinearGradient(0, midY - amp, 0, h);
      water.addColorStop(0, "#3a6ea5");
      water.addColorStop(1, "#123049");
      ctx.fillStyle = water;
      ctx.fill();

      ctx.beginPath();
      for (let x = 0; x <= w; x += 4 * dpr) {
        const y = waveY(x);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#cba360";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      // height-scale ruler along the left edge
      ctx.strokeStyle = "rgba(239,233,221,0.25)";
      ctx.fillStyle = "rgba(239,233,221,0.55)";
      ctx.font = `${11 * dpr}px Inter, sans-serif`;
      for (let m = 0; m <= 4; m++) {
        const y = midY - m * pxPerMeter;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(16 * dpr, y);
        ctx.stroke();
        ctx.fillText(`${m}m`, 20 * dpr, y + 4 * dpr);
      }

      // crest-riding marker + period label
      const crestX = w * 0.7;
      const crestY = waveY(crestX);
      ctx.beginPath();
      ctx.arc(crestX, crestY, 5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "#efe9dd";
      ctx.fill();
      ctx.fillText(
        `${periodS.toFixed(1)}s period`,
        crestX + 10 * dpr,
        crestY - 10 * dpr,
      );

      // direction badge, top-right
      ctx.save();
      ctx.translate(w - 40 * dpr, 40 * dpr);
      ctx.rotate((directionDeg * Math.PI) / 180);
      ctx.beginPath();
      ctx.moveTo(0, -12 * dpr);
      ctx.lineTo(-5 * dpr, 6 * dpr);
      ctx.lineTo(5 * dpr, 6 * dpr);
      ctx.closePath();
      ctx.fillStyle = "#cba360";
      ctx.fill();
      ctx.restore();
      ctx.fillText(`${directionDeg}°`, w - 62 * dpr, 68 * dpr);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="wp-stage wp-stage-c">
      <canvas ref={canvasRef} className="wp-canvas" />
      <div className="wp-caption">
        A compact cross-section strip &mdash; reads like a chart, cheap
        enough to sit right above the report text.
      </div>
    </div>
  );
}
