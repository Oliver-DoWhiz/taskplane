import {
  assignTask,
  createArtifact,
  createRun,
  decideApproval,
  getWorkspace,
  resetWorkspace,
  updateTaskStatus
} from "./lib/api.js";
import { renderDashboard } from "./lib/render.js";

const targets = {
  mission: document.getElementById("mission"),
  northStar: document.getElementById("north-star"),
  healthScore: document.getElementById("health-score"),
  healthCopy: document.getElementById("health-copy"),
  metrics: document.getElementById("metrics"),
  laneBoard: document.getElementById("lane-board"),
  taskDetail: document.getElementById("task-detail"),
  approvals: document.getElementById("approvals"),
  artifacts: document.getElementById("artifacts"),
  agents: document.getElementById("agents"),
  timeline: document.getElementById("timeline")
};

const state = {
  workspace: null,
  selectedTaskId: null
};

function selectedTask() {
  return (
    state.workspace.tasks.find((task) => task.id === state.selectedTaskId) || state.workspace.tasks[0]
  );
}

function refreshView() {
  renderDashboard(targets, state);
}

async function loadWorkspace(preserveSelection = true) {
  state.workspace = await getWorkspace();

  if (!preserveSelection || !state.workspace.tasks.some((task) => task.id === state.selectedTaskId)) {
    state.selectedTaskId = state.workspace.tasks[0]?.id || null;
  }

  refreshView();
}

async function perform(action) {
  const task = selectedTask();
  if (!task) {
    return;
  }

  if (action.startsWith("status:")) {
    await updateTaskStatus(task.id, action.split(":")[1]);
  } else if (action.startsWith("assign:")) {
    await assignTask(task.id, action.split(":")[1], "planner");
  } else if (action.startsWith("run:")) {
    const agentId = action.split(":")[1];
    await createRun(task.id, agentId, `Focused ${agentId} pass on ${task.title}.`);
  } else if (action.startsWith("artifact:")) {
    const kind = action.split(":")[1];
    await createArtifact(
      task.id,
      kind,
      `${task.title} checkpoint`,
      `Operator-published ${kind} artifact for ${task.title}.`
    );
  }

  await loadWorkspace(true);
}

document.getElementById("refresh-button").addEventListener("click", () => {
  loadWorkspace(true).catch(console.error);
});

document.getElementById("reset-button").addEventListener("click", async () => {
  await resetWorkspace();
  await loadWorkspace(false);
});

document.addEventListener("click", async (event) => {
  const taskCard = event.target.closest("[data-task-id]");
  if (taskCard) {
    state.selectedTaskId = taskCard.getAttribute("data-task-id");
    refreshView();
    return;
  }

  const taskAction = event.target.closest("[data-action]");
  if (taskAction) {
    await perform(taskAction.getAttribute("data-action"));
    return;
  }

  const approvalAction = event.target.closest("[data-approval-action]");
  if (approvalAction) {
    const approvalId = approvalAction.getAttribute("data-approval-id");
    const status = approvalAction.getAttribute("data-approval-action") === "approve" ? "approved" : "rejected";
    await decideApproval(approvalId, status);
    await loadWorkspace(true);
  }
});

loadWorkspace(false).catch((error) => {
  console.error(error);
  targets.mission.textContent = "Taskplane could not load the workspace snapshot.";
});
