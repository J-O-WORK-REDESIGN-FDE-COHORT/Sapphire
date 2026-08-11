import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@apollo/client'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  resolve: {
    dedupe: ["@assistant-ui/core", "@assistant-ui/store", "@assistant-ui/tap"],
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  envDir: path.resolve(__dirname), // Look for .env files in project root
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy GraphQL requests to BFF during development
      '/graphql': {
        target: process.env.VITE_BFF_API_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
      // Proxy auth endpoints to BFF (if BFF handles any auth endpoints)
      '/auth': {
        target: process.env.VITE_BFF_API_URL?.replace('/graphql', '') || 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
});

// Made with Bob
