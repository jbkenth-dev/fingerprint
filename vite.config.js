import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev proxy: forward /api/* to Apache served project at http://localhost/fingerprint/api/*
export default defineConfig(({ command, mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Vite will send requests from the dev server to your PHP backend
      // Example: fetch('/api/users.php') -> http://localhost/fingerprint/api/users.php
      "/api": {
        target: "http://localhost",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/fingerprint/api"),
      },
    },
  },
}));
