import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WorkspaceError,
  assignTask,
  createArtifact,
  createRun,
  decideApproval,
  loadWorkspace,
  resetWorkspace,
  updateTaskStatus
} from "../../../packages/core/src/store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../../web");
const dataFile = path.resolve(__dirname, "../../../data/demo-workspace.json");
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

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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

  try {
    if (requestUrl.pathname === "/api/workspace" && req.method === "GET") {
      sendJson(res, 200, await loadWorkspace(dataFile));
      return;
    }

    if (requestUrl.pathname === "/api/workspace/reset" && req.method === "POST") {
      sendJson(res, 200, await resetWorkspace(dataFile));
      return;
    }

    const taskStatusMatch = requestUrl.pathname.match(/^\/api\/tasks\/([^/]+)\/status$/);
    if (taskStatusMatch && req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(
        res,
        200,
        await updateTaskStatus(dataFile, taskStatusMatch[1], body.status, body.actor)
      );
      return;
    }

    const taskAssignmentMatch = requestUrl.pathname.match(/^\/api\/tasks\/([^/]+)\/assignments$/);
    if (taskAssignmentMatch && req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(
        res,
        200,
        await assignTask(dataFile, taskAssignmentMatch[1], body.assignee, body.actor)
      );
      return;
    }

    const approvalDecisionMatch = requestUrl.pathname.match(
      /^\/api\/approvals\/([^/]+)\/decision$/
    );
    if (approvalDecisionMatch && req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(
        res,
        200,
        await decideApproval(dataFile, approvalDecisionMatch[1], body.status, body.actor)
      );
      return;
    }

    if (requestUrl.pathname === "/api/artifacts" && req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(res, 201, await createArtifact(dataFile, body));
      return;
    }

    if (requestUrl.pathname === "/api/runs" && req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(res, 201, await createRun(dataFile, body));
      return;
    }

    await serveStatic(res, requestUrl.pathname);
  } catch (error) {
    if (error instanceof WorkspaceError) {
      sendJson(res, error.statusCode, { error: error.message });
      return;
    }

    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: "Invalid JSON payload." });
      return;
    }

    console.error(error);
    sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(port, () => {
  console.log(`taskplane listening on http://localhost:${port}`);
});
