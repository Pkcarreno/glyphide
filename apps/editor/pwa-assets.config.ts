import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

/**
 * External configuration for `@vite-pwa/assets-generator`.
 *
 * Single source of truth for PWA assets: a `favicon.svg` is rasterized into
 * every icon the manifest and HTML <head> need at build/dev time.
 *
 * Kept external (instead of inline in `vite.config.ts`) so the dev server can
 * watch the SVG and re-rasterize on change, and so the same config is
 * reusable by the `pwa-assets-generate` CLI script.
 */
export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  images: "public/favicon.svg",
  preset: {
    ...minimal2023Preset,
  },
});
