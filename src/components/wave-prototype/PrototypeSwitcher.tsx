import { useEffect } from "react";

interface VariantMeta {
  key: string;
  name: string;
}

export default function PrototypeSwitcher({
  variants,
  activeIndex,
  onChange,
}: {
  variants: readonly VariantMeta[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;
      if (e.key === "ArrowLeft") {
        onChange((activeIndex - 1 + variants.length) % variants.length);
      } else if (e.key === "ArrowRight") {
        onChange((activeIndex + 1) % variants.length);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, variants.length, onChange]);

  if (import.meta.env.PROD) return null;

  const active = variants[activeIndex];

  return (
    <div className="wp-switcher">
      <button
        type="button"
        aria-label="Previous variant"
        onClick={() =>
          onChange((activeIndex - 1 + variants.length) % variants.length)
        }
      >
        &larr;
      </button>
      <span className="wp-switcher-label">
        {active.key} &middot; {active.name}
      </span>
      <button
        type="button"
        aria-label="Next variant"
        onClick={() => onChange((activeIndex + 1) % variants.length)}
      >
        &rarr;
      </button>
    </div>
  );
}
