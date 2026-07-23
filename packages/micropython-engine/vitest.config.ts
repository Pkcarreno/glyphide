import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
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
    target: "esnext",
  },
  test: {
    include: ["src/**/*.spec.ts"],
  },
});
