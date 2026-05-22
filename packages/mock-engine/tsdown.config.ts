import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/**/*.ts",
    "worker/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!worker/**/*.spec.ts",
    "!worker/**/*.test.ts",
  ],
  format: ["esm"],
  unbundle: true,
  dts: true,
  clean: true,
  outDir: "dist",
});
