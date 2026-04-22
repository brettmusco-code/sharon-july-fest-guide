import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Public Supabase project values for this app. Safe to commit (URL + anon key
// are published to every browser anyway). Used as fallbacks when the build
// host doesn't inject the VITE_SUPABASE_* env vars (e.g. published web build).
const FALLBACK_SUPABASE_URL = "https://uncnkmgaoawksbfncnkm.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuY25rbWdhb2F3a3NiZm5jbmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NjEzODEsImV4cCI6MjA5MjAzNzM4MX0.m-u6QMd2F36z_btDNnOH03FlrcNdD00bsaoxbctq624";
const FALLBACK_SUPABASE_PROJECT_ID = "uncnkmgaoawksbfncnkm";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY;
  const supabaseProjectId = env.VITE_SUPABASE_PROJECT_ID || FALLBACK_SUPABASE_PROJECT_ID;

  return {
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
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
    },
    build: {
      sourcemap: mode === "development",
      target: "es2020",
      assetsInlineLimit: 4096,
    },
  };
});
