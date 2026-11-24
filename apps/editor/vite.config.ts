import { createRequire } from "node:module";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

/**
 * Backward compatibility transform for lucide-solid.
 * In Solid 2.0, splitProps was removed from solid-js.
 * This plugin injects a reactive splitProps shim directly into lucide-solid modules.
 */
const SOLID_JS_IMPORT_REGEX =
  /import\s*\{(?<imports>[^}]+)\}\s*from\s*['"]solid-js['"]/u;

function lucideSolidCompatPlugin(): Plugin {
  return {
    name: "lucide-solid-compat",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("lucide-solid") && code.includes("splitProps")) {
        const shim = `
function splitProps(props, descriptors) {
  const local = {};
  const blocked = new Set(descriptors);
  for (const key of descriptors) {
    Object.defineProperty(local, key, {
      get() { return props[key]; },
      enumerable: true,
    });
  }
  const rest = {};
  for (const key in props) {
    if (!blocked.has(key)) {
      Object.defineProperty(rest, key, {
        get() { return props[key]; },
        enumerable: true,
      });
    }
  }
  return [local, rest];
}
`;
        return {
          code: code.replace(SOLID_JS_IMPORT_REGEX, (_match, imports) => {
            const cleanImports = imports
              .split(",")
              .map((s: string) => s.trim())
              .filter((s: string) => s !== "splitProps")
              .join(", ");
            return `import { ${cleanImports} } from "solid-js";\n${shim}`;
          }),
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? "/",
  build: {
    target: "esnext",
  },
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  plugins: [
    lucideSolidCompatPlugin(),
    tailwindcss(),
    solid(),
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
            urlPattern: /\.(?:wasm|js|wasm\.map)$/u,
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
            urlPattern: /\.(?:woff2?|ttf|otf|eot)$/u,
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "solid-js/web": "@solidjs/web",
    },
  },
  server: {
    port: 3000,
  },
  worker: {
    format: "es",
  },
});
