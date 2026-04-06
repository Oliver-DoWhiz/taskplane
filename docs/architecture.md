# Architecture

Taskplane is split into a control plane and interaction plane.

## Control Plane

The API owns:

- task state
- execution runs
- approval requests
- artifact versions
- event history

The first implementation uses file-backed demo persistence so contributors can run the full product locally without provisioning external infrastructure.

## Interaction Plane

The web client is not a chat window. It renders:

- portfolio-level system posture
- a task graph
- run ownership across agents and humans
- pending approvals
- artifact progression
- an event timeline

## Core Domain

The shared package defines the canonical types used by both the API and the UI:

- `WorkspaceSnapshot`
- `Task`
- `TaskRun`
- `ApprovalGate`
- `Artifact`
- `TaskEvent`
- `AgentCard`

This keeps the product honest: the API cannot invent hidden state the UI cannot render.

