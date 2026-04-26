import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// After you move off Lovable, set these to YOUR Supabase project (Settings → API),
// or leave empty and always build with `.env` so you never point at the wrong project.
// URL + anon key are not secret in the client; they are safe to commit if you use fallbacks.
const FALLBACK_SUPABASE_URL = "https://exnfwgygwdrtrmlrichj.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v8_9PqDeliI-VIZefIVA2w_HOyfDC4H";
const FALLBACK_SUPABASE_PROJECT_ID = "exnfwgygwdrtrmlrichj";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Force the app to point at YOUR Supabase project, ignoring the Lovable Cloud .env values.
  // Remove these overrides (use `env.VITE_* || FALLBACK_*` instead) if you ever want to go back to Cloud.
  const supabaseUrl = FALLBACK_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = FALLBACK_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseProjectId = FALLBACK_SUPABASE_PROJECT_ID || env.VITE_SUPABASE_PROJECT_ID;

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
