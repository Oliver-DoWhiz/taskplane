import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedWorkspace } from "../../../packages/core/src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../../web");
const port = Number(process.env.PORT || 8787);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": contentTypes[".json"] });
  res.end(JSON.stringify(payload, null, 2));
}

async function serveStatic(res, urlPath) {
  const cleanedPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.resolve(webRoot, `.${cleanedPath}`);

  if (!filePath.startsWith(webRoot)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    const extension = path.extname(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[extension] || "application/octet-stream"
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("missing url");
    return;
  }

  const requestUrl = new URL(req.url, `http://localhost:${port}`);

  if (requestUrl.pathname === "/health") {
    sendJson(res, 200, { ok: true, service: "taskplane-api" });
    return;
  }

  if (requestUrl.pathname === "/api/workspace") {
    sendJson(res, 200, seedWorkspace());
    return;
  }

  await serveStatic(res, requestUrl.pathname);
});

server.listen(port, () => {
  console.log(`taskplane listening on http://localhost:${port}`);
});

