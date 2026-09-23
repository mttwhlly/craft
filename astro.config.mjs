import { defineConfig } from "astro/config";

// Static output: every "project" in this workbench is a set of plain
// pre-rendered pages. Add a framework (`npx astro add react` etc.) or an
// `output: "server"` adapter later, per-project, if a given idea needs it.
export default defineConfig({
  output: "static",
});
