# craft

A personal workbench for prototyping small, conceptual, single-purpose web
projects — one idea per route, plain files, fast to ship.

Built on [Astro](https://astro.build): static by default, no client-side JS
unless a page actually needs it, and framework-agnostic if a given idea
wants React/Vue/Svelte/etc.

## Structure

- `src/pages/` — one route per project. `src/pages/books/` is the first one:
  a 3D bookshelf with procedural covers (three.js).
- `src/content/projects/*.md` — one entry per project, used to render the
  workbench index at `/`. Not required for a project to exist (you can add
  a route under `src/pages/` without an index entry), but add one so it
  shows up on the front page.
- `src/lib/` — shared logic that isn't page markup (currently just the
  bookshelf project's three.js/canvas code).
- `src/layouts/Base.astro` — shared chrome (topbar, footer, fonts, global
  styles). Pass `mainClass` to control the `<main>` layout and `back` to
  show a "← back" link.

## Adding a new project

1. Add a folder under `src/pages/your-idea/` (or a single
   `src/pages/your-idea.astro`) — that's the route.
2. Wrap it in `Base` for the shared chrome, or skip `Base` entirely for
   something that wants a totally different shell.
3. Add `src/content/projects/your-idea.md` with `title`, `description`,
   `href`, and `date` frontmatter so it's listed at `/`.

Reach for a UI framework only when a project actually needs it —
`npx astro add react` (or vue/svelte/solid) installs and wires up the
integration without touching anything else already on the site.

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Start the dev server at `localhost:4321` |
| `npm run build` | Type-check (`astro check`) and build the static site to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run check` | Type-check only |

## Deploying

`astro.config.mjs` is set to `output: "static"` — the whole site builds to
plain HTML/CSS/JS in `dist/`, deployable anywhere (Vercel, Netlify,
Cloudflare Pages, GitHub Pages). Point your host at this repo and it just
works; no server runtime required unless a future project opts into one.
