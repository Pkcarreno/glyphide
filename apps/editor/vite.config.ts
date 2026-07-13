import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    tailwindcss(),
    solidPlugin(),
    VitePWA({
      registerType: "prompt",
      strategies: "generateSW",
      devOptions: {
        enabled: process.env.VITE_SW_DEV === "true",
      },
      injectRegister: "auto",
      manifest: {
        name: "Glyphide — Code Editor in Your Browser",
        short_name: "Glyphide",
        display: "standalone",
        theme_color: "#fdfefb",
        background_color: "#fdfefb",
        categories: ["developer"],
      },
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
        includeHtmlHeadLinks: true,
        injectThemeColor: false,
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\.(?:wasm|js|wasm\.map)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "engine-bundles",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.(?:woff2?|ttf|otf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
  worker: {
    format: "es",
  },
});
