import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedWorkspace } from "./index.mjs";

const fileQueues = new Map();

export class WorkspaceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "WorkspaceError";
    this.statusCode = statusCode;
  }
}

function nowIso() {
  return new Date().toISOString();
}

async function ensureParentDirectory(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writeWorkspaceFile(filePath, workspace) {
  await ensureParentDirectory(filePath);
  await writeFile(filePath, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
}

async function readWorkspaceFile(filePath) {
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents);
}

function queueFileOperation(filePath, operation) {
  const previousOperation = fileQueues.get(filePath) || Promise.resolve();
  const nextOperation = previousOperation.catch(() => undefined).then(operation);

  fileQueues.set(
    filePath,
    nextOperation.finally(() => {
      if (fileQueues.get(filePath) === nextOperation) {
        fileQueues.delete(filePath);
      }
    })
  );

  return nextOperation;
}

async function readWorkspaceOrSeed(filePath) {
  try {
    return await readWorkspaceFile(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      const workspace = seedWorkspace();
      await writeWorkspaceFile(filePath, workspace);
      return workspace;
    }

    throw error;
  }
}

export async function saveWorkspace(filePath, workspace) {
  return queueFileOperation(filePath, async () => {
    await writeWorkspaceFile(filePath, workspace);
    return workspace;
  });
}

export async function resetWorkspace(filePath) {
  return queueFileOperation(filePath, async () => {
    const workspace = seedWorkspace();
    await writeWorkspaceFile(filePath, workspace);
    return workspace;
  });
}

export async function loadWorkspace(filePath) {
  return queueFileOperation(filePath, async () => {
    return readWorkspaceOrSeed(filePath);
  });
}

async function mutateWorkspace(filePath, mutator) {
  return queueFileOperation(filePath, async () => {
    const workspace = await readWorkspaceOrSeed(filePath);
    await mutator(workspace);
    await writeWorkspaceFile(filePath, workspace);
    return workspace;
  });
}

function findTask(workspace, taskId) {
  const task = workspace.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new WorkspaceError(`Task ${taskId} was not found.`, 404);
  }

  return task;
}

function appendEvent(workspace, taskId, actor, category, message) {
  workspace.events.unshift({
    id: randomUUID(),
    taskId,
    actor,
    category,
    message,
    createdAt: nowIso()
  });
}

export async function updateTaskStatus(filePath, taskId, status, actor = "operator") {
  return mutateWorkspace(filePath, async (workspace) => {
    const task = findTask(workspace, taskId);

    task.status = status;
    task.updatedAt = nowIso();

    appendEvent(workspace, taskId, actor, "task", `Moved ${task.title} to ${status}.`);
  });
}

export async function assignTask(filePath, taskId, assignee, actor = "operator") {
  return mutateWorkspace(filePath, async (workspace) => {
    const task = findTask(workspace, taskId);

    if (!task.assignees.includes(assignee)) {
      task.assignees.push(assignee);
    }

    task.updatedAt = nowIso();
    appendEvent(workspace, taskId, actor, "task", `Assigned ${assignee} to ${task.title}.`);
  });
}

export async function decideApproval(filePath, approvalId, status, actor = "human") {
  return mutateWorkspace(filePath, async (workspace) => {
    const approval = workspace.approvals.find((item) => item.id === approvalId);

    if (!approval) {
      throw new WorkspaceError(`Approval ${approvalId} was not found.`, 404);
    }

    approval.status = status;
    appendEvent(
      workspace,
      approval.taskId,
      actor,
      "approval",
      `${approval.title} was ${status}.`
    );
  });
}

export async function createArtifact(filePath, input) {
  return mutateWorkspace(filePath, async (workspace) => {
    const { taskId, kind, title, summary, uri = "#", actor = "builder" } = input;
    const task = findTask(workspace, taskId);

    const version =
      workspace.artifacts
        .filter((artifact) => artifact.taskId === taskId && artifact.title === title)
        .reduce((highestVersion, artifact) => Math.max(highestVersion, artifact.version), 0) + 1;

    workspace.artifacts.unshift({
      id: randomUUID(),
      taskId,
      kind,
      title,
      version,
      summary,
      uri,
      updatedAt: nowIso()
    });

    task.updatedAt = nowIso();
    appendEvent(workspace, taskId, actor, "artifact", `Published ${title} v${version}.`);
  });
}

export async function createRun(filePath, input) {
  return mutateWorkspace(filePath, async (workspace) => {
    const { taskId, agentId, summary, actor = agentId } = input;
    const task = findTask(workspace, taskId);

    workspace.runs.unshift({
      id: randomUUID(),
      taskId,
      agentId,
      status: "running",
      summary,
      startedAt: nowIso(),
      costUsd: 0
    });

    task.status = "running";
    task.updatedAt = nowIso();
    appendEvent(workspace, taskId, actor, "run", `Started a new ${agentId} run.`);
  });
}
