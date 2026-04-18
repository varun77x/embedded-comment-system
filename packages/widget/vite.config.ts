import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
  build: {
    outDir: "dist",
    // Two outputs:
    // 1. The iframe app (index.html + assets)
    // 2. The embed snippet (embed.js) built as a separate IIFE
    rollupOptions: {
      input: "src/main.tsx",
    },
    target: "es2020",
  },
  server: {
    port: 5174,
  },
});
