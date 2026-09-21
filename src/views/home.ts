import { BOOKS } from "../data/books";
import { generateSpineBar } from "../cover";

export function renderHome(container: HTMLElement): () => void {
  container.innerHTML = `
    <div class="shelf-intro">
      <p class="kicker">Craft Press</p>
      <h1>A shelf, rendered</h1>
      <p class="byline">
        Twenty real titles, twenty procedural covers &mdash; click any spine
        for a draggable 3D book.
      </p>
    </div>
    <div class="shelf-wrap">
      <nav class="tick-nav" id="tick-nav" aria-hidden="true"></nav>
      <ol class="shelf" id="shelf"></ol>
    </div>
  `;

  const shelf = container.querySelector("#shelf") as HTMLOListElement;
  const tickNav = container.querySelector("#tick-nav") as HTMLElement;

  const items: HTMLLIElement[] = [];
  const ticks: HTMLSpanElement[] = [];

  BOOKS.forEach((book) => {
    const li = document.createElement("li");
    li.className = "spine";

    const link = document.createElement("a");
    link.href = `#/book/${book.slug}`;
    link.className = "spine-link";
    link.setAttribute("aria-label", `${book.title} by ${book.author}`);

    const { canvas, accent } = generateSpineBar(book.seed, book.title, book.author);
    canvas.className = "spine-canvas";
    link.style.setProperty("--accent", accent);
    link.appendChild(canvas);

    li.appendChild(link);
    shelf.appendChild(li);
    items.push(li);

    const tick = document.createElement("span");
    tick.className = "tick";
    tickNav.appendChild(tick);
    ticks.push(tick);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const idx = items.indexOf(entry.target as HTMLLIElement);
        if (idx === -1) continue;
        ticks[idx].classList.toggle("tick-active", entry.isIntersecting);
      }
    },
    { threshold: 0.5 },
  );
  items.forEach((el) => observer.observe(el));

  return function dispose() {
    observer.disconnect();
  };
}
