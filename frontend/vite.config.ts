import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()], server: { port: 5173 },
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes("/node_modules/firebase/")) return "firebase";
    if (id.includes("/node_modules/@tanstack/")) return "query";
    if (id.includes("/node_modules/framer-motion/")) return "motion";
    if (/\/node_modules\/(react|react-dom|react-router|react-router-dom)\//.test(id)) return "react-vendor";
  } } } },
});
