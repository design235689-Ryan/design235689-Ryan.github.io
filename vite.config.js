import { defineConfig } from "vite";

// Treat the repo-root `assets/` folder as Vite "public" assets.
// This makes `/models/...` URLs available on both dev server and GitHub Pages.
export default defineConfig({
  publicDir: "assets"
});

