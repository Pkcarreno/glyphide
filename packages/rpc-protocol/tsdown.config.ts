import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.test.ts"],
  format: ["esm"],
  outDir: "dist",
  unbundle: true,
});
