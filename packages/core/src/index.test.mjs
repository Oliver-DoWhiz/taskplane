import test from "node:test";
import assert from "node:assert/strict";
import { seedWorkspace } from "./index.mjs";

test("seedWorkspace exposes the core control-plane objects", () => {
  const workspace = seedWorkspace();

  assert.equal(typeof workspace.workspaceName, "string");
  assert.ok(workspace.tasks.length > 0);
  assert.ok(workspace.approvals.length > 0);
  assert.ok(workspace.events.length > 0);
});

