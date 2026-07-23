import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    target: "esnext",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
  },
});
