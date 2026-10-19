import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  // Workers are loaded on the first import. Prebundle their dependencies now
  // so Vite cannot discover a new dependency and reload away the open project.
  optimizeDeps: { include: ["fflate", "yaml", "zod"] },
});
