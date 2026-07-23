import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
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
    target: "esnext",
  },
  test: {
    include: ["src/**/*.spec.ts"],
  },
});
