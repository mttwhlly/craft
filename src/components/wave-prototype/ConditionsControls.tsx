import type { Conditions } from "./types";

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function compassLabel(deg: number) {
  return COMPASS[Math.round(deg / 45) % 8];
}

export default function ConditionsControls({
  conditions,
  onChange,
}: {
  conditions: Conditions;
  onChange: (next: Conditions) => void;
}) {
  const set = <K extends keyof Conditions>(key: K, value: Conditions[K]) =>
    onChange({ ...conditions, [key]: value });

  return (
    <div className="wp-controls">
      <div className="wp-controls-title">Conditions</div>
      <label className="wp-field">
        <span>Height</span>
        <input
          type="range"
          min={0.3}
          max={6}
          step={0.1}
          value={conditions.heightM}
          onChange={(e) => set("heightM", Number(e.target.value))}
        />
        <span className="wp-value">{conditions.heightM.toFixed(1)}m</span>
      </label>
      <label className="wp-field">
        <span>Period</span>
        <input
          type="range"
          min={6}
          max={20}
          step={0.5}
          value={conditions.periodS}
          onChange={(e) => set("periodS", Number(e.target.value))}
        />
        <span className="wp-value">{conditions.periodS.toFixed(1)}s</span>
      </label>
      <label className="wp-field">
        <span>Swell</span>
        <input
          type="range"
          min={0}
          max={355}
          step={5}
          value={conditions.directionDeg}
          onChange={(e) => set("directionDeg", Number(e.target.value))}
        />
        <span className="wp-value">
          {compassLabel(conditions.directionDeg)} {conditions.directionDeg}&deg;
        </span>
      </label>
    </div>
  );
}
