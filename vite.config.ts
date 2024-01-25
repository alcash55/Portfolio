import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "./dist",
  },
  base: "https://alcash55.github.io/Portfolio/",
  plugins: [react()],
  server: {
    port: 3000,
    host: "localhost",
    open: true,
  },
});
