import { defineConfig } from "vitest/config";

// Unit tests only (no app build). Kept separate from vite.config.ts so the app config is untouched.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
  },
});
