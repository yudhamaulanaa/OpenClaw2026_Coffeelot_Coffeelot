import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["coffeelot.app", "www.coffeelot.app", "app.coffeelot.app"],
  },
  preview: {
    allowedHosts: ["coffeelot.app", "www.coffeelot.app", "app.coffeelot.app"],
  },
});
