import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // IMPORTANT: do NOT use custom manualChunks here. Splitting React/recharts
    // by hand caused "Cannot read properties of undefined (reading 'forwardRef')"
    // in production because vendor-charts loaded before React was initialized.
    // Vite's default code-splitting respects dependency order and is safer.
    chunkSizeWarningLimit: 1200,
  },
}));
