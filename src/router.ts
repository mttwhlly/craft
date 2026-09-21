import { findBook } from "./data/books";
import { renderHome } from "./views/home";
import { renderDetail } from "./views/detail";

type Cleanup = (() => void) | void;

export function initRouter(view: HTMLElement, backLink: HTMLAnchorElement) {
  let cleanup: Cleanup;

  function resolve() {
    cleanup?.();
    cleanup = undefined;

    const hash = location.hash.replace(/^#/, "");
    const bookMatch = hash.match(/^\/book\/([^/]+)/);

    if (bookMatch) {
      const book = findBook(bookMatch[1]);
      if (book) {
        backLink.hidden = false;
        view.className = "layout";
        cleanup = renderDetail(view, book);
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
