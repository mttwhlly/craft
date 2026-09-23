import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Each entry here is one project on the workbench index. A project doesn't
// have to be markdown-driven — this collection is just the index listing;
// the project itself can be a fully custom Astro route (see src/pages/books).
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    href: z.string(),
    date: z.coerce.date(),
  }),
});

export const collections = { projects };
