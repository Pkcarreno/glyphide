import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    "src/**/*.ts",
    "worker/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!worker/**/*.spec.ts",
    "!worker/**/*.test.ts",
  ],
  format: ["esm"],
  outDir: "dist",
  unbundle: true,
});
