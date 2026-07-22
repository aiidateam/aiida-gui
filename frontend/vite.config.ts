import react from "@vitejs/plugin-react";

import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 3000,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/plugins": "http://127.0.0.1:8000",
      "/react-shim.js": "http://127.0.0.1:8000",
      "/react-jsx-runtime-shim.js": "http://127.0.0.1:8000",
      "/react-router-dom-shim.js": "http://127.0.0.1:8000",
      "/use-sync-external-store-shim.js": "http://127.0.0.1:8000",
    },
  },
  build: {
    outDir: "build",
    assetsDir: "static",
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("rete") ||
            id.includes("three") ||
            id.includes("weas")
          ) {
            return "graph";
          }

          if (
            id.includes("chart.js") ||
            id.includes("react-chartjs-2") ||
            id.includes("d3")
          ) {
            return "analytics";
          }

          return undefined;
        },
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
