import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [tailwindcss(), solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
