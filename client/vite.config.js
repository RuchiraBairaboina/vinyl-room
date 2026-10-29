import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development, /api requests go to the Express server on port 5001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:5001" },
  },
});
