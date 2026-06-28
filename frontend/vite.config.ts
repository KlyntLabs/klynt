import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    process.env.ANALYZE === "true" &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "dist/stats.html",
      }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5174,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://lvh.me:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router-dom)/.test(id)) {
            return "vendor";
          }
          if (/node_modules\/(react-hook-form|zod|@hookform\/resolvers)/.test(id)) {
            return "forms";
          }
          if (/node_modules\/(i18next|react-i18next)/.test(id)) {
            return "i18n";
          }
          if (/node_modules\/@tanstack\/react-query/.test(id)) {
            return "query";
          }
        },
      },
    },
  },
});
