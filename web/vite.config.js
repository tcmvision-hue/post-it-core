import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import apiApp from "./server/api.mjs";

const apiMiddlewarePlugin = {
  name: "post-this-api-middleware",
  configureServer(server) {
    server.middlewares.use(apiApp);
  },
};

export default defineConfig({
  plugins: [react(), apiMiddlewarePlugin],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        download: resolve(__dirname, "download/index.html"),
      },
    },
  },
  server: {
    allowedHosts: true,
  },
});
