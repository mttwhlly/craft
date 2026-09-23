import { useEffect, useState } from "react";
import ConditionsControls from "./wave-prototype/ConditionsControls";
import PrototypeSwitcher from "./wave-prototype/PrototypeSwitcher";
import VariantA from "./wave-prototype/VariantA";
import VariantB from "./wave-prototype/VariantB";
import VariantC from "./wave-prototype/VariantC";
import VariantD from "./wave-prototype/VariantD";
import VariantE from "./wave-prototype/VariantE";
import type { Conditions } from "./wave-prototype/types";
import "./wave-prototype/wave-prototype.css";

// PROTOTYPE — three structurally different takes on turning a surf report's
// conditions (height/period/swell direction) into an ambient animation for
// swells.surf. Switch with ?variant=A|B|C or the bottom bar; drag the
// sliders to see how each responds to different conditions. Throwaway: once
// one direction wins, fold it into the real app and move this folder to a
// branch — see the prototype skill.

const VARIANTS = [
  { key: "A", name: "Swell arcs over map" },
  { key: "B", name: "Realistic ocean surface" },
  { key: "C", name: "Animated cross-section" },
  { key: "D", name: "Beach eye-level view" },
  { key: "E", name: "Longitudinal wave (top to bottom)" },
] as const;

type VariantKey = (typeof VARIANTS)[number]["key"];

function readVariant(): VariantKey {
  if (typeof window === "undefined") return "A";
  const v = new URLSearchParams(window.location.search).get("variant");
  return VARIANTS.some((variant) => variant.key === v)
    ? (v as VariantKey)
    : "A";
}

export default function WaveLab() {
  const [variant, setVariant] = useState<VariantKey>(readVariant);
  const [conditions, setConditions] = useState<Conditions>({
    heightM: 1.8,
    periodS: 12,
    directionDeg: 225,
  });

  useEffect(() => {
    const onPopState = () => setVariant(readVariant());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goTo = (key: VariantKey) => {
    setVariant(key);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", key);
    window.history.replaceState({}, "", url);
  };

  const activeIndex = VARIANTS.findIndex((v) => v.key === variant);

  return (
    <div className="wp-root">
      <ConditionsControls conditions={conditions} onChange={setConditions} />
      {variant === "A" && <VariantA conditions={conditions} />}
      {variant === "B" && <VariantB conditions={conditions} />}
      {variant === "C" && <VariantC conditions={conditions} />}
      {variant === "D" && <VariantD conditions={conditions} />}
      {variant === "E" && <VariantE conditions={conditions} />}
      <PrototypeSwitcher
        variants={VARIANTS}
        activeIndex={activeIndex}
        onChange={(i) => goTo(VARIANTS[i].key)}
      />
    </div>
  );
}
