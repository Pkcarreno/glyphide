import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.test.ts"],
  format: ["esm"],
  unbundle: true,
  dts: true,
  clean: true,
  outDir: "dist",
});
