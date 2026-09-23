# Prototyping Workbench — Research Findings

**Saved at:** `research/prototyping-workbench.md`
**Why here:** No existing `notes/`, `research/`, or `docs/` convention was found at the repo root of `craft` (checked via `ls`), so a new `research/` directory was created for this and future research files.

Researched 2026-09-23. All claims below are sourced from primary sources (official docs/repos/pricing pages, direct fetches of the actual blog post and repo) — see inline links.

---

## 1. Destroy Today: "Building the Open Standard website with Stripe"

Source: [destroytoday.com/blog/building-the-open-standard-website-with-stripe](https://destroytoday.com/blog/building-the-open-standard-website-with-stripe)

- **The project:** "Open Standard" — a stablecoin/global money-movement initiative with partners including American Express, Mastercard, and VISA. This is a marketing/landing page, not Stripe's own product site.
- **Stripe's role:** Stripe was the **client**, not the infra. The author (Jonnie Hallman, Destroy Today) is a former Stripe staff design engineer, hired back as an external contractor; Stripe's internal Brand Studio collaborated on direction. So "with Stripe" in the title means "built for Stripe," not "built on Stripe's payments stack."
- **Stack/workflow:**
  - Vanilla HTML/CSS/JS — no framework named.
  - SVG for complex animated graphics; CSS masks and scroll-driven animation.
  - Design collaboration: motion designer (Pete Henderson) produced reference animations that the author then implemented in code.
  - Built with **ProtoPen**, the author's own custom prototyping environment, self-described as "the lovechild between Indexhibit and Codepen, but using local, vanilla files" — i.e., a personal flat-file, no-build sandbox for quickly wiring up vanilla HTML/CSS/JS experiments. This is a direct, named link between Destroy Today's practice and Indexhibit's philosophy.
  - "Reusable composables" let a desktop sticky-scroll sequence decompose into standalone mobile animations without a rebuild.
- **Clever/fragile bits:** The coin→globe transition required converting a concave SVG mask into a convex one mid-transition ("vertically scaled circles union'd to rectangles"); a gradient system samples pixel colors from rotating gradients and assigns them to individual dots via nested SVG masks. Technically impressive but bespoke, hand-tuned, single-purpose code — not something built for reuse across many sites.
- **Related posts:** [destroytoday.com/blog](https://destroytoday.com/blog) lists process posts like "My design workflow" (2017), "Building components in a sandbox" (2016), and older Ruby/Sinatra/Vue tooling posts — these describe an evolving personal practice, not a packaged toolkit for others. The blog itself is effectively Hallman's own prototyping/workbench journal.

**Takeaway:** This is a single, highly bespoke marketing-site build, not a repeatable system. The one transferable idea is **ProtoPen** — an unpublished personal tool, explicitly Indexhibit-inspired, for fast vanilla-file prototyping. There's no public repo or product to adopt directly.

---

## 2. Indexhibit

- **What it is:** "An archetypal portfolio CMS for everybody" — a PHP-based flat-file-adjacent CMS purpose-built for image/text/video exhibition-style portfolios. [github.com/Indexhibit/indexhibit](https://github.com/Indexhibit/indexhibit), [indexhibit.org](https://www.indexhibit.org), [indexhibit.org/about](https://www.indexhibit.org/about/)
- **Origin:** Founded **2006** by Jeffery Vaska and Daniel Eatock ([indexhibit.org/about](https://www.indexhibit.org/about/)); trademark held by the same two. Philosophy stated on the about page: "honesty, earnestness and diy," deliberately avoiding unnecessary tech complexity so that "academics, researchers, students, collectors" can control how their work appears, with no tracking or data-selling.
- **Architecture:** Classic PHP app — `index.php` entry point, `.htaccess` for routing, and two key directories: `ndxzsite` (the live/public site output) and `ndxzstudio` (the admin/editing interface — the ".ndxz-studio" back end referenced in Indexhibit lore). Content is authored through this web-based admin, not markdown/git — it's a self-hosted, database-backed (or flat-file, historically SQLite/MySQL depending on version) CMS requiring a PHP hosting environment, the opposite of a modern static/serverless deploy.
- **Maintenance status — verified via GitHub API** (`gh api repos/Indexhibit/indexhibit`, run 2026-09-23):
  - Repo created (migrated to GitHub): 2016-06-07
  - **Last commit / last push: 2024-03-27** (commit message: "Update v2.1.1.php — Upgrade change")
  - **Releases: 0** (no tagged GitHub Releases exist)
  - **Open issues: 12** (per live API; a separate scrape of the repo page showed 9 open issues + 3 open PRs — numbers drift slightly by fetch method/time, but both confirm a small, slow-moving backlog)
  - Stars 367, forks 73, watchers 51, no license file detected via API (`license: null`)
  - Verdict: **dormant/legacy, not actively maintained** as of September 2026 — over 2.5 years with no commits, zero formal releases, a small unresolved issue queue, and no signs of a roadmap or CI. It is downloadable and technically runnable, but not a living project.
- **Cultural significance:** The project explicitly markets itself to "academics, researchers, students, collectors," and its own about page and forum ([forum.indexhibit.org](https://forum.indexhibit.org/)) show a still-active support community of individual users. A targeted search found tangible but thin evidence of continued relevance: an active Indexhibit-specific support forum, a community workshop ("Indexhibit Workshop: Create Your Own Online Portfolio," [Ada X](https://www.ada-x.org/en/activities/indexhibit-workshop-create-online-portfolio/)), and a WordPress theme ("Inxhibit," [inxhibit.com](https://www.inxhibit.com/)) explicitly built to imitate its aesthetic — evidence the "Indexhibit look" (bare-bones list-and-detail exhibition layout) is a recognized genre in design circles. I could not find strong recent (2024–2026) editorial coverage or academic articles specifically crediting Indexhibit's historical role in art/design-school portfolio culture; the reputation appears to live mostly in practitioner folklore (e.g., Destroy Today's own ProtoPen reference above) rather than documented press. Treat the "art-school staple" reputation as plausible and partially evidenced, not conclusively proven from what's fetchable today.

---

## 3. Assessment: is either "the best way" today?

**No, not as literal recipes — but each contributes an idea worth keeping.**

- **Destroy Today's approach** is a bespoke, hand-built animation showcase requiring senior front-end skill and no reusable scaffolding of its own; it's an *outcome* of good practice (a fast personal sandbox tool), not a transferable process. Its real lesson is the value of a **personal, no-build, flat-file prototyping environment** — which is squarely what a "workbench" should be.
- **Indexhibit** solves a real, narrow problem (rapid exhibition-style portfolio publishing with zero design decisions) but is a 2006-era self-hosted PHP CMS: it needs PHP hosting, database/file admin, and manual security upkeep, with the repo effectively dormant since March 2024. For someone who already lives in a modern JS/Vercel toolchain, adopting Indexhibit itself means taking on hosting/ops burden and unmaintained-dependency risk for a UX modern static-site tooling replicates in an afternoon (a list of projects, a detail template, minimal chrome).
- **Verdict for a repeatable "crank out many small sites" workbench:** modern static-site generators + git-based content + a zero-ops deploy target (Vercel/Netlify/Cloudflare Pages) beat both on setup speed, maintenance burden, and flexibility. What's worth borrowing conceptually from both: (a) Indexhibit's minimal, constraint-driven list→detail exhibition template as a *design pattern*, not its codebase; (b) Destroy Today's ProtoPen model of a personal, frictionless, file-based sandbox as the shape of a "workbench."

---

## 4. Survey of comparable/adjacent tools

**Static site generators/frameworks**
- **Astro** — [astro.build](https://astro.build): "JavaScript web framework optimized for building fast, content-driven websites," server-first rendering, MIT licensed, free/open source, funded by sponsorships. Current version at fetch time: **Astro 7.3**. Strong fit for content-driven one-off sites with islands of interactivity.
- **Eleventy (11ty)** — [11ty.dev](https://www.11ty.dev): "a simpler static site generator," Node ≥18, current stable **v3.1.6** (v4 alpha in progress). No framework lock-in — supports Markdown/Nunjucks/Liquid/WebC/JS templates. Free/MIT, no telemetry. Notably fast (claims 1.93s for 4,000 markdown files vs. Astro 22.9s and Gatsby 29.05s in their own benchmark). Used by NASA, CERN, W3C, Google. Best fit for truly minimal, no-JS-required exhibition pages.
- **Next.js** — [nextjs.org](https://nextjs.org): current stable **16.3.6**, MIT licensed, maintained by Vercel, `npx create-next-app@latest` scaffolds instantly. Already the stack this `craft` repo itself uses — natural default if 3D/interactive work is involved, as in this repo's book-flight demos.
- **SvelteKit** — part of [svelte.dev](https://svelte.dev), MIT licensed, has a static-adapter for pure static export. Good alternative if he prefers Svelte's terser component model.

**No-CMS / flat-file / git-based content**
- **Decap CMS** (formerly Netlify CMS) — [decapcms.org](https://decapcms.org): open-source, MIT, git-backed CMS — content is stored as files in the repo itself ("not locked to any provider's database"), edited through a web UI with draft/review/publish workflow, and works with Hugo/Next.js/Gatsby/Jekyll etc. EU community-maintained (no corporate owner); 19.3k GitHub stars; a "Decap Turbo" paid-support tier exists but the core is free. This is the closest modern equivalent to Indexhibit's admin-driven authoring, minus the PHP/hosting burden — content lives in git, not a database.
- Plain Markdown+frontmatter (no CMS UI at all) is the simplest option and is what most SSGs above assume by default.

**Deployment platforms**
- **Vercel** — [vercel.com/pricing](https://vercel.com/pricing): Hobby tier is **$0/mo**, "the perfect starting place for your web app or personal project." Includes 1M edge requests/mo, 100GB fast data transfer/mo, 1M function invocations/mo, subject to a fair-use policy; no ability to buy extra usage on Hobby. No explicit per-account project-count cap surfaced on the pricing page. **This repo (`craft`) already has Vercel skills installed, so Vercel is the natural default deploy target** for a workbench with zero extra setup.
- **Netlify** — [netlify.com/pricing](https://www.netlify.com/pricing/): Free tier uses a "300 credit" model (their newer usage-credit pricing) covering git/AI/API deploys with unlimited deploy previews, custom domains + SSL, functions, blob storage, and basic firewall/rate-limiting — exact bandwidth/build-minute caps aren't broken out on the marketing page itself (would need the docs for hard numbers).
- **Cloudflare Pages** — [developers.cloudflare.com/pages/platform/limits](https://developers.cloudflare.com/pages/platform/limits/): Free tier allows **up to 100 projects/account**, 500 builds/month (1 concurrent), 20,000 files per project, 25MiB max asset size, 20-minute build timeout, up to 100 custom domains per project — no stated bandwidth cap. The **100-projects** allowance makes it the most explicitly generous option for "many small sites."
- **GitHub Pages** — [pages.github.com](https://pages.github.com): free, one user/org site plus unlimited project sites, deploy is literally `git push`; no bandwidth/build-minute figures published on the marketing page (GitHub's docs state soft bandwidth guidance elsewhere). Simplest possible option for pure static HTML with zero build step.

**Digital garden / personal wiki tooling**
- **Obsidian Publish** — [obsidian.md/publish](https://obsidian.md/publish): **$8/mo (annual) or $10/mo (monthly), per site**, includes 4GB hosting, custom domain, themes. Good for a connected-notes "garden" but a recurring per-site cost is a poor fit for "many one-off sites."
- **Quartz** — [quartz.jzhao.xyz](https://quartz.jzhao.xyz): free, open-source static-site generator purpose-built for turning Markdown notes into a digital garden (full-text search, graph view, wikilinks, LaTeX). Actively maintained — version 5.0.0, last updated 2026-09-20 (day before this research), requires Node 22. This is the stronger fit vs. Obsidian Publish if he wants a "garden of small projects" index page with zero recurring cost.

**Spirit-successors to Indexhibit**
- No strong, actively maintained direct successor was found. Search turned up only: the still-active Indexhibit support forum ([forum.indexhibit.org](https://forum.indexhibit.org/)), a community workshop still teaching it in 2024-ish programming ([Ada X](https://www.ada-x.org/en/activities/indexhibit-workshop-create-online-portfolio/)), and "Inxhibit," a WordPress theme explicitly imitating its look ([inxhibit.com](https://www.inxhibit.com/)) rather than a real architectural successor. Being honest per the brief: **I did not find a credible modern (2024–2026) tool that inherits Indexhibit's exact niche** (self-hosted, admin-authored, exhibition-list CMS). The niche today is effectively filled piecemeal by static-site generators + a minimal custom template, not by a single named product.

**Template/boilerplate-repo approaches**
- **Vercel template gallery** — [vercel.com/templates](https://vercel.com/templates): 500+ one-click-deploy templates spanning Next.js/React/Vue/Svelte/Astro, various CMS and DB integrations; deploying one provisions infra automatically. This is a ready-made "pick a template, deploy" flow he could just point at.
- **degit** — [github.com/Rich-Harris/degit](https://github.com/Rich-Harris/degit): CLI that clones a repo as a tarball (no `.git` history) for fast scaffolding — `degit user/repo my-new-project` — supports `degit.json` for post-clone actions. 7.9k stars, 463 commits, Node ≥20, no deprecation notices visible — actively usable. This is the classic mechanism behind a personal "starter kit" pattern: keep one template repo, `degit` it into a new folder per project, ship.
- `create-*` scaffolding tools (e.g. `create-next-app`, `create-astro`) are the framework-native equivalent, one level less customizable than a personal degit'd template but zero-maintenance.

---

## 5. Concrete recommendations for Matt's workbench

**Option A — Minimal flat-file, Indexhibit-in-spirit, zero-CMS**
Personal template repo (Eleventy or plain Astro, content-collections mode) + Markdown/frontmatter per project, no CMS UI at all — edit files directly, `git push` to deploy. Pair with `degit` to spin a fresh instance per idea (`degit mattwhalley/site-template my-new-idea`). Deploy target: **Vercel** (already set up in this environment) or **Cloudflare Pages** (best free-tier project count: 100 projects/account) if he expects to accumulate dozens of live micro-sites simultaneously.
*Tradeoff:* fastest to start, but he re-derives the "one clean list-and-detail template" himself once, then reuses it — this is the direct modern equivalent of what Indexhibit gave for free, without the PHP/hosting tax.

**Option B — ProtoPen-style local sandbox, no build step at all**
A single folder of self-contained vanilla HTML/CSS/JS files (Destroy Today's actual practice) with a tiny static server for local preview, deployed as-is to Netlify/Vercel/GitHub Pages per idea. No framework, no dependencies, maximum flexibility for weird one-off interaction/animation work (WebGL, canvas, SVG hacks) — closest fit if the project is closer to a design/motion experiment than a content site.
*Tradeoff:* zero abstraction means zero reuse of layout/nav/typography scaffolding across projects — good for truly bespoke pieces, bad if most projects share a similar shell.

**Option C — Astro content-collections starter with Decap CMS bolted on**
Astro (fast build, content-first, MIT) + Decap CMS for a lightweight admin UI when he wants to publish without touching files directly, all still git-backed. One template repo, one `astro.config` per clone, deploy to Vercel by default.
*Tradeoff:* more moving parts than A or B, but gives a real "publish from a form" experience close to what Indexhibit's admin offered, without self-hosting a database.

**Option D — Just lean on the Vercel template gallery + a personal fork**
Pick (or fork into his own account) one strong Next.js/Astro template from [vercel.com/templates](https://vercel.com/templates), strip it to a bare skeleton, and treat that fork as the canonical "workbench" starting point — one-click deploy is already wired in. Lowest setup effort of all four, at the cost of inheriting someone else's opinions about structure.

**Recommendation:** Start with **Option A** (Eleventy or Astro + Markdown + degit + Vercel), since it directly mirrors what made Indexhibit and ProtoPen valuable — near-zero friction from idea to published page — without their respective costs (PHP hosting/staleness, or zero reusable scaffolding). Keep **Option B** in the back pocket specifically for animation/interaction-heavy pieces where a framework would get in the way.
