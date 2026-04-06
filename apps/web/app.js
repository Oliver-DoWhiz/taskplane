async function loadWorkspace() {
  const response = await fetch("/api/workspace");
  if (!response.ok) {
    throw new Error(`workspace request failed: ${response.status}`);
  }

  return response.json();
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

async function boot() {
  const workspace = await loadWorkspace();

  setText("north-star", workspace.northStar);
  setText("health-score", workspace.healthScore);
  setText("task-count", workspace.tasks.length);
  setText("run-count", workspace.runs.length);
  setText("approval-count", workspace.approvals.length);
  setText("artifact-count", workspace.artifacts.length);
  setText("mission", workspace.mission);
}

boot().catch((error) => {
  console.error(error);
  setText("mission", "Taskplane could not load the workspace snapshot.");
});
