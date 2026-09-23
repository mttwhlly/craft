import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static output: every "project" in this workbench is a set of plain
// pre-rendered pages. React is opted into per-page via client:only islands
// (e.g. the wave lab), so most pages stay framework-free.
export default defineConfig({
  output: "static",
  integrations: [react()],
});
