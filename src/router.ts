import { findBook } from "./data/books";
import { renderHome } from "./views/home";
import { mountDetailShell, initDetailScene, revealCopy, renderDetail } from "./views/detail";
import { flyBookToStage } from "./views/flight";

type Cleanup = (() => void) | void;

const pendingOrigins = new Map<string, DOMRect>();

/** Called by the shelf just before it navigates, so the router can fly the clicked spine into place. */
export function setPendingOrigin(slug: string, rect: DOMRect) {
  pendingOrigins.set(slug, rect);
}

export function initRouter(view: HTMLElement, backLink: HTMLAnchorElement) {
  let cleanup: Cleanup;
  let token = 0;

  async function resolve() {
    const myToken = ++token;
    cleanup?.();
    cleanup = undefined;

    const hash = location.hash.replace(/^#/, "");
    const bookMatch = hash.match(/^\/book\/([^/]+)/);

    if (bookMatch) {
      const book = findBook(bookMatch[1]);
      if (book) {
        backLink.hidden = false;
        view.className = "layout";

        const origin = pendingOrigins.get(book.slug);
        pendingOrigins.delete(book.slug);

        if (origin) {
          const shell = mountDetailShell(view, book, { fadeInCopy: true });
          const targetRect = shell.stage.getBoundingClientRect();
          await flyBookToStage(book, origin, targetRect);
          if (myToken !== token) return; // navigated away mid-flight
          cleanup = initDetailScene(shell, book);
          revealCopy(shell.copy);
        } else {
          cleanup = renderDetail(view, book);
        }

        window.scrollTo({ top: 0 });
        return;
      }
    }

    backLink.hidden = true;
    view.className = "layout layout-home";
    cleanup = renderHome(view);
    window.scrollTo({ top: 0 });
  }

  window.addEventListener("hashchange", resolve);
  resolve();
}
