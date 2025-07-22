import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), cssInjectedByJsPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    // 100 MB
    assetsInlineLimit: 100 * 1024 * 1024,

    lib: {
      entry: path.resolve(__dirname, "src/prod-entry.tsx"),
      name: "TezoroLendingWidget",
      // fileName: (format) => `widget.${format}.js`,
      fileName: () => "widget.js",
      formats: ["umd"],
    },

    sourcemap: false,
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
    },
  },
  define: {
    // https://github.com/vitejs/vite/issues/1973
    "process.env": {},
  },
});
