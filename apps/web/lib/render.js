const laneOrder = ["plan", "build", "review", "ship"];
const statusLabels = {
  draft: "Draft",
  planned: "Planned",
  running: "Running",
  blocked: "Blocked",
  in_review: "In Review",
  done: "Done"
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatWhen(value) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function metricCard(label, value, tone = "neutral") {
  return `
    <article class="metric-card ${tone}">
      <p>${escapeHtml(label)}</p>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderMetrics(workspace) {
  const doneTasks = workspace.tasks.filter((task) => task.status === "done").length;
  const pendingApprovals = workspace.approvals.filter(
    (approval) => approval.status === "pending"
  ).length;
  const activeRuns = workspace.runs.filter((run) => run.status === "running").length;

  return [
    metricCard("Tasks", workspace.tasks.length, "warm"),
    metricCard("Done", doneTasks, "cool"),
    metricCard("Active runs", activeRuns, "neutral"),
    metricCard("Pending approvals", pendingApprovals, pendingApprovals ? "alert" : "cool")
  ].join("");
}

function renderTaskCard(task, selectedTaskId) {
  const selectedClass = task.id === selectedTaskId ? " selected" : "";
  const dependencies = task.dependsOn.length
    ? `<p class="task-meta">Depends on ${task.dependsOn.join(", ")}</p>`
    : `<p class="task-meta">No upstream blockers</p>`;

  return `
    <button class="task-card${selectedClass}" data-task-id="${escapeHtml(task.id)}" type="button">
      <div class="task-topline">
        <span class="status-pill status-${escapeHtml(task.status)}">${escapeHtml(
          statusLabels[task.status]
        )}</span>
        <span class="priority-chip">${escapeHtml(task.priority)}</span>
      </div>
      <h3>${escapeHtml(task.title)}</h3>
      <p class="task-objective">${escapeHtml(task.objective)}</p>
      ${dependencies}
      <div class="task-footer">
        <span>${escapeHtml(task.assignees.join(" · "))}</span>
        <span>${escapeHtml(formatWhen(task.updatedAt))}</span>
      </div>
    </button>
  `;
}

function renderLaneBoard(tasks, selectedTaskId) {
  return laneOrder
    .map((lane) => {
      const laneTasks = tasks.filter((task) => task.lane === lane);
      return `
        <section class="lane-column">
          <div class="lane-heading">
            <h3>${escapeHtml(lane)}</h3>
            <span>${laneTasks.length}</span>
          </div>
          <div class="lane-stack">
            ${
              laneTasks.length
                ? laneTasks.map((task) => renderTaskCard(task, selectedTaskId)).join("")
                : `<div class="empty-state">No tasks in this lane yet.</div>`
            }
          </div>
        </section>
      `;
    })
    .join("");
}

function renderActionButton(label, action, tone = "ghost") {
  return `<button class="${tone}-button small-button" type="button" data-action="${action}">${escapeHtml(
    label
  )}</button>`;
}

function renderTaskDetail(workspace, selectedTaskId) {
  const task = workspace.tasks.find((item) => item.id === selectedTaskId) || workspace.tasks[0];

  if (!task) {
    return `<div class="empty-state">No task selected.</div>`;
  }

  const relatedArtifacts = workspace.artifacts.filter((artifact) => artifact.taskId === task.id);
  const relatedRuns = workspace.runs.filter((run) => run.taskId === task.id);

  return `
    <article class="detail-shell">
      <div class="detail-topline">
        <span class="status-pill status-${escapeHtml(task.status)}">${escapeHtml(
          statusLabels[task.status]
        )}</span>
        <span class="priority-chip">${escapeHtml(task.priority)}</span>
      </div>
      <h3>${escapeHtml(task.title)}</h3>
      <p class="detail-copy">${escapeHtml(task.objective)}</p>
      <p class="detail-outcome"><strong>Outcome:</strong> ${escapeHtml(task.outcome)}</p>
      <div class="detail-meta">
        <span>Owner: ${escapeHtml(task.owner)}</span>
        <span>Assignees: ${escapeHtml(task.assignees.join(", "))}</span>
      </div>
      <div class="button-row">
        ${renderActionButton("Plan", `status:planned`)}
        ${renderActionButton("Run", `status:running`, "accent")}
        ${renderActionButton("Review", `status:in_review`)}
        ${renderActionButton("Done", `status:done`)}
      </div>
      <div class="button-row">
        ${renderActionButton("Assign builder", `assign:builder`)}
        ${renderActionButton("Assign reviewer", `assign:reviewer`)}
        ${renderActionButton("Start run", "run:builder", "accent")}
        ${renderActionButton("Publish artifact", "artifact:patch")}
      </div>
      <div class="mini-grid">
        <div class="mini-card">
          <p>Dependencies</p>
          <strong>${escapeHtml(task.dependsOn.join(", ") || "None")}</strong>
        </div>
        <div class="mini-card">
          <p>Artifacts</p>
          <strong>${relatedArtifacts.length}</strong>
        </div>
        <div class="mini-card">
          <p>Runs</p>
          <strong>${relatedRuns.length}</strong>
        </div>
      </div>
    </article>
  `;
}

function renderApprovals(workspace) {
  if (!workspace.approvals.length) {
    return `<div class="empty-state">No approval gates right now.</div>`;
  }

  return workspace.approvals
    .map(
      (approval) => `
        <article class="approval-card">
          <div class="approval-topline">
            <span class="status-pill status-${escapeHtml(approval.status)}">${escapeHtml(
              approval.status
            )}</span>
            <span>${escapeHtml(formatWhen(approval.requestedAt))}</span>
          </div>
          <h3>${escapeHtml(approval.title)}</h3>
          <p>${escapeHtml(approval.reason)}</p>
          <div class="detail-meta">
            <span>Approver: ${escapeHtml(approval.approver)}</span>
            <span>Requested by: ${escapeHtml(approval.requestedBy)}</span>
          </div>
          <div class="button-row">
            <button class="accent-button small-button" type="button" data-approval-action="approve" data-approval-id="${escapeHtml(
              approval.id
            )}">Approve</button>
            <button class="ghost-button small-button" type="button" data-approval-action="reject" data-approval-id="${escapeHtml(
              approval.id
            )}">Reject</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderArtifacts(artifacts) {
  if (!artifacts.length) {
    return `<div class="empty-state">Artifacts will appear here once agents publish them.</div>`;
  }

  return artifacts
    .map(
      (artifact) => `
        <article class="artifact-card">
          <div class="artifact-topline">
            <span class="artifact-kind">${escapeHtml(artifact.kind)}</span>
            <span>v${escapeHtml(artifact.version)}</span>
          </div>
          <h3>${escapeHtml(artifact.title)}</h3>
          <p>${escapeHtml(artifact.summary)}</p>
          <div class="task-footer">
            <span>${escapeHtml(artifact.taskId)}</span>
            <span>${escapeHtml(formatWhen(artifact.updatedAt))}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderAgents(agents) {
  return agents
    .map(
      (agent) => `
        <article class="agent-card">
          <div class="agent-topline">
            <h3>${escapeHtml(agent.name)}</h3>
            <span>${escapeHtml(agent.latencySla)}</span>
          </div>
          <p>${escapeHtml(agent.role)}</p>
          <div class="pill-cloud">
            ${agent.tools.map((tool) => `<span>${escapeHtml(tool)}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderTimeline(events) {
  return events
    .slice(0, 10)
    .map(
      (event) => `
        <article class="timeline-entry">
          <div class="timeline-dot"></div>
          <div>
            <p class="timeline-message">${escapeHtml(event.message)}</p>
            <p class="timeline-meta">${escapeHtml(event.actor)} · ${escapeHtml(
              event.category
            )} · ${escapeHtml(formatWhen(event.createdAt))}</p>
          </div>
        </article>
      `
    )
    .join("");
}

export function renderDashboard(targets, state) {
  targets.mission.textContent = state.workspace.mission;
  targets.northStar.textContent = state.workspace.northStar;
  targets.healthScore.textContent = state.workspace.healthScore;
  targets.healthCopy.textContent = `${state.workspace.tasks.filter((task) => task.status !== "done").length} active tasks`;
  targets.metrics.innerHTML = renderMetrics(state.workspace);
  targets.laneBoard.innerHTML = renderLaneBoard(state.workspace.tasks, state.selectedTaskId);
  targets.taskDetail.innerHTML = renderTaskDetail(state.workspace, state.selectedTaskId);
  targets.approvals.innerHTML = renderApprovals(state.workspace);
  targets.artifacts.innerHTML = renderArtifacts(state.workspace.artifacts);
  targets.agents.innerHTML = renderAgents(state.workspace.agents);
  targets.timeline.innerHTML = renderTimeline(state.workspace.events);
}

