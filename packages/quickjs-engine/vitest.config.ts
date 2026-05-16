import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
  },
  build: {
    target: "esnext",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "@glyphide/rpc-protocol",
        "@glyphide/orchestrator",
        "quickjs-emscripten",
      ],
    },
  },
});
