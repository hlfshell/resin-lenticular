import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig({
  ...config,
  testMatch: "editor.spec.ts",
  use: { ...config.use, baseURL: "http://127.0.0.1:4175" },
  webServer: {
    command: "npm run dev -- --force --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
  },
});
