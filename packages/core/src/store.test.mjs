import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assignTask,
  createArtifact,
  createRun,
  loadWorkspace,
  resetWorkspace,
  updateTaskStatus
} from "./store.mjs";

async function withWorkspaceFile() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "taskplane-"));
  return path.join(directory, "workspace.json");
}

test("updateTaskStatus persists the new state and emits an event", async () => {
  const workspaceFile = await withWorkspaceFile();
  await resetWorkspace(workspaceFile);

  await updateTaskStatus(workspaceFile, "task-2", "in_review", "planner");
  const workspace = await loadWorkspace(workspaceFile);

  assert.equal(workspace.tasks.find((task) => task.id === "task-2").status, "in_review");
  assert.match(workspace.events[0].message, /Moved Implement workflow API to in_review/);
});

test("assignTask and createArtifact enrich the workspace snapshot", async () => {
  const workspaceFile = await withWorkspaceFile();
  await resetWorkspace(workspaceFile);

  await assignTask(workspaceFile, "task-3", "builder", "planner");
  await createArtifact(workspaceFile, {
    taskId: "task-3",
    kind: "patch",
    title: "Release patch",
    summary: "Candidate patch for final approval.",
    actor: "builder"
  });

  const workspace = await loadWorkspace(workspaceFile);

  assert.ok(workspace.tasks.find((task) => task.id === "task-3").assignees.includes("builder"));
  assert.equal(workspace.artifacts[0].title, "Release patch");
});

test("createRun adds an execution record and marks the task running", async () => {
  const workspaceFile = await withWorkspaceFile();
  await resetWorkspace(workspaceFile);

  await createRun(workspaceFile, {
    taskId: "task-1",
    agentId: "reviewer",
    summary: "Double-check the control-plane invariants."
  });

  const workspace = await loadWorkspace(workspaceFile);

  assert.equal(workspace.runs[0].agentId, "reviewer");
  assert.equal(workspace.tasks.find((task) => task.id === "task-1").status, "running");
});

test("concurrent mutations leave the workspace in a readable state", async () => {
  const workspaceFile = await withWorkspaceFile();
  await resetWorkspace(workspaceFile);

  await Promise.all([
    updateTaskStatus(workspaceFile, "task-2", "in_review", "planner"),
    assignTask(workspaceFile, "task-3", "builder", "planner"),
    createArtifact(workspaceFile, {
      taskId: "task-2",
      kind: "report",
      title: "API checkpoint",
      summary: "Checkpoint after concurrent mutations."
    })
  ]);

  const workspace = await loadWorkspace(workspaceFile);

  assert.ok(workspace.events.length >= 3);
  assert.equal(typeof workspace.healthScore, "number");
});
