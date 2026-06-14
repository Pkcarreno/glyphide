import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      isolate: false,
      setupFiles: ["./src/setup-tests.ts"],
    },
  })
);
