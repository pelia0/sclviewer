import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function localWclfDevPlugin(): Plugin {
  const dataRoot = path.resolve("D:/wowlogsparser/data");
  return {
    name: "local-wclf-dev-middleware",
    configureServer(server) {
      server.middlewares.use("/__local_wclf/", (req, res, next) => {
        if (!req.url) return next();
        const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
        const resolved = path.resolve(dataRoot, rel);
        if (!resolved.startsWith(dataRoot + path.sep) || !fs.existsSync(resolved)) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        res.setHeader("Content-Type", "application/octet-stream");
        fs.createReadStream(resolved).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), localWclfDevPlugin()],
  test: {
    environment: "node",
    globals: true,
  },
});
