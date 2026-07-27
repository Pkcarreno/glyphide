import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["@glyphide/rpc-protocol", "@glyphide/orchestrator"],
    },
    target: "esnext",
  },
  test: {
    include: ["src/**/*.spec.ts"],
  },
});
