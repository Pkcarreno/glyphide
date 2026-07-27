import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    exclude: ["src/security/**"],
    include: ["src/**/*.spec.ts"],
    passWithNoTests: true,
  },
});
