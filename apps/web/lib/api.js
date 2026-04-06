async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "content-type": "application/json"
    },
    ...options
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

export function getWorkspace() {
  return request("/api/workspace", { method: "GET" });
}

export function resetWorkspace() {
  return request("/api/workspace/reset", { method: "POST" });
}

export function updateTaskStatus(taskId, status, actor = "operator") {
  return request(`/api/tasks/${taskId}/status`, {
    method: "POST",
    body: JSON.stringify({ status, actor })
  });
}

export function assignTask(taskId, assignee, actor = "operator") {
  return request(`/api/tasks/${taskId}/assignments`, {
    method: "POST",
    body: JSON.stringify({ assignee, actor })
  });
}

export function decideApproval(approvalId, status, actor = "human") {
  return request(`/api/approvals/${approvalId}/decision`, {
    method: "POST",
    body: JSON.stringify({ status, actor })
  });
}

export function createRun(taskId, agentId, summary) {
  return request("/api/runs", {
    method: "POST",
    body: JSON.stringify({ taskId, agentId, summary })
  });
}

export function createArtifact(taskId, kind, title, summary, uri = "#") {
  return request("/api/artifacts", {
    method: "POST",
    body: JSON.stringify({ taskId, kind, title, summary, uri })
  });
}

