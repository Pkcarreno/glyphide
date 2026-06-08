import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
  },
  build: {
    target: "esnext",
    lib: {
      entry: "src/micropython-adapter.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "@glyphide/rpc-protocol",
        "@glyphide/orchestrator",
        "@micropython/micropython-webassembly-pyscript/micropython.mjs",
      ],
    },
  },
});
