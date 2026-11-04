import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    target: "es2022",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router-dom")
            ) {
              return "vendor-react";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("axios")) {
              return "vendor-axios";
            }
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://veggofresh.in',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
