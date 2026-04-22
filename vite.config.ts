import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Capacitor (native iOS/Android) needs relative paths; web hosting needs absolute "/".
  // Set CAPACITOR_BUILD=1 before `vite build` when building for native.
  base: process.env.CAPACITOR_BUILD ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    sourcemap: mode === "development",
    target: "es2020",
    assetsInlineLimit: 4096,
  },
}));
