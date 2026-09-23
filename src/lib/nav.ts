// Astro's ClientRouter swaps the DOM in place rather than reloading the
// document, so this module stays live (and this Map keeps its entries)
// across a shelf -> detail navigation — exactly what the flight animation
// needs: capture the clicked spine's rect *before* navigating away, then
// read it back once the detail page's markup has swapped in.
interface PendingOrigin {
  rect: DOMRect;
  scrollY: number;
}

const pendingOrigins = new Map<string, PendingOrigin>();

export function setPendingOrigin(slug: string, rect: DOMRect) {
  pendingOrigins.set(slug, { rect, scrollY: window.scrollY });
}

/**
 * Returns the origin rect re-expressed in the current scroll frame. Swapping
 * to the (usually much shorter) detail page can force the browser to clamp
 * scrollY before this runs, which would otherwise shift where "the spine's
 * position" appears relative to the new viewport. Adjusting by the scroll
 * delta keeps the flight anchored to the spine's true on-screen position.
 */
export function takePendingOrigin(slug: string): DOMRect | undefined {
  const pending = pendingOrigins.get(slug);
  pendingOrigins.delete(slug);
  if (!pending) return undefined;

  const scrollDelta = pending.scrollY - window.scrollY;
  return new DOMRect(
    pending.rect.left,
    pending.rect.top + scrollDelta,
    pending.rect.width,
    pending.rect.height,
  );
}

/** Wires a shelf spine link so a plain click captures its origin rect and hands off to the client router. */
export function wireSpineLink(link: HTMLAnchorElement, slug: string) {
  link.addEventListener("click", async (e) => {
    // Let modified clicks (new tab, etc.) behave normally — only intercept a plain click.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    setPendingOrigin(slug, link.getBoundingClientRect());
    const { navigate } = await import("astro:transitions/client");
    navigate(link.href);
  });
}
