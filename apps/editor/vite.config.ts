import { createRequire } from "node:module";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solidPlugin from "vite-plugin-solid";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? "/",
  build: {
    target: "esnext",
  },
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  plugins: [
    tailwindcss(),
    solidPlugin(),
    VitePWA({
      devOptions: {
        enabled: process.env.VITE_SW_DEV === "true",
      },
      injectRegister: "auto",
      manifest: {
        background_color: "#fdfefb",
        categories: ["developer"],
        description:
          "Browser-based code editor for JavaScript and Python with sandboxed WebAssembly execution.",
        display: "standalone",
        id: "com.pkcarreno.glyphide",
        name: "Glyphide",
        orientation: "portrait",
        short_name: "Glyphide",
        theme_color: "#fdfefb",
      },
      pwaAssets: {
        config: true,
        includeHtmlHeadLinks: true,
        injectThemeColor: false,
        overrideManifestIcons: true,
      },
      registerType: "prompt",
      strategies: "generateSW",
      workbox: {
        runtimeCaching: [
          {
            handler: "CacheFirst",
            options: {
              cacheName: "engine-bundles",
              expiration: {
                maxAgeSeconds: 30 * 24 * 60 * 60,
                maxEntries: 50,
              },
            },
            urlPattern: /\.(?:wasm|js|wasm\.map)$/,
          },
          {
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: {
                maxAgeSeconds: 365 * 24 * 60 * 60,
                maxEntries: 20,
              },
            },
            urlPattern: /\.(?:woff2?|ttf|otf|eot)$/,
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  worker: {
    format: "es",
  },
});
