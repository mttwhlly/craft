import { useEffect, useRef } from "react";
import type { Conditions } from "./types";

// Simple longitudinal-wave diagram: a grid of dots displaced along the
// direction of travel (default straight down, top to bottom), bunching into
// compression bands and spreading into rarefactions as the pattern moves —
// the classic "slinky" wave picture rather than a transverse ocean profile.
// The canvas itself is drawn flat; the tilt is a CSS 3D transform on its
// wrapper so it reads like a set rolling toward you across tilted-back water.
export default function VariantE({ conditions }: { conditions: Conditions }) {
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

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#1c1a24");
      bg.addColorStop(1, "#151320");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 0deg = straight down (top to bottom); increasing degrees rotates
      // the direction of travel clockwise, same dial as the other variants.
      const angle = (directionDeg * Math.PI) / 180;
      const dx = Math.sin(angle);
      const dy = Math.cos(angle);

      const wavelength = Math.max(60, periodS * 26) * dpr;
      const k = (2 * Math.PI) / wavelength;
      // Real swell periods (6-20s) read as a near-freeze on screen, so the
      // sim runs several times faster than the literal period — tuned to
      // roughly match how sets look rolling in when you watch from the
      // beach, not a literal-seconds playback of the period value.
      const SPEED_SCALE = 4.5;
      const omega = (2 * Math.PI * SPEED_SCALE) / periodS;

      const spacing = 28 * dpr;
      const ampPx = Math.min((heightM / 6) * spacing * 0.85, spacing * 0.85);

      const cols = Math.ceil(w / spacing) + 2;
      const rows = Math.ceil(h / spacing) + 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x0 = col * spacing;
          const y0 = row * spacing;
          const s = x0 * dx + y0 * dy;
          const phase = k * s - omega * t;
          const disp = ampPx * Math.sin(phase);
          const x = x0 + disp * dx;
          const y = y0 + disp * dy;
          if (x < -spacing || x > w + spacing || y < -spacing || y > h + spacing)
            continue;

          const compression = (1 + Math.cos(phase)) / 2; // 0 = spread, 1 = bunched
          const radius = (1.4 + compression * 2.2) * dpr;
          const brightness = 0.35 + compression * 0.5;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(203, 163, 96, ${brightness.toFixed(2)})`;
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="wp-stage wp-stage-e">
      <div className="wp-tilt-wrap">
        <div className="wp-tilt">
          <canvas ref={canvasRef} className="wp-canvas" />
        </div>
      </div>
      <div className="wp-readout">
        <span
          className="wp-readout-arrow"
          style={{ transform: `rotate(${conditions.directionDeg}deg)` }}
        />
        <span className="wp-readout-text">
          {conditions.directionDeg}&deg; &middot; {conditions.periodS.toFixed(1)}s
          period
        </span>
      </div>
      <div className="wp-caption">
        A longitudinal wave diagram, tilted back into the distance like a set
        watched from the beach &mdash; dots bunch into compression bands and
        spread into rarefactions as the pattern rolls toward you.
      </div>
    </div>
  );
}
