import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.spec.ts"],
    exclude: ["src/security/**"],
    passWithNoTests: true,
  },
});
