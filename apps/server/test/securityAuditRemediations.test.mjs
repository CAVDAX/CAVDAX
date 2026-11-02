import test from "node:test";
import assert from "node:assert/strict";
import { CavdaxMcpServer } from "../../../core/mcp/server.js";
import { isValidPushEndpoint } from "../webPush.js";

test("Security Remediation: CavdaxMcpServer rejects empty, null, or invalid file_path", async () => {
  const mcp = new CavdaxMcpServer(null, { repoRoot: process.cwd() });

  const emptyPath = await mcp.handleToolCall("apply_code_change", {
    decision_id: "DEC-103",
    file_path: "",
    code_payload: "console.log(1)"
  });
  assert.equal(emptyPath.isError, true);
  assert.equal(emptyPath.gate_verdict, "BLOCKED_INVALID_PATH");

  const nullPath = await mcp.handleToolCall("apply_code_change", {
    decision_id: "DEC-103",
    file_path: null,
    code_payload: "console.log(1)"
  });
  assert.equal(nullPath.isError, true);
  assert.equal(nullPath.gate_verdict, "BLOCKED_INVALID_PATH");
});

test("Security Remediation: isValidPushEndpoint rejects IPv6 loopback, ULA, and Link-Local endpoints", () => {
  const ipv6Malicious = [
    "https://[::1]/endpoint",
    "https://[fc00::1]/endpoint",
    "https://[fd12:3456:789a::1]/endpoint",
    "https://[fe80::1]/endpoint"
  ];

  for (const ep of ipv6Malicious) {
    assert.equal(isValidPushEndpoint(ep), false, `Expected ${ep} to be rejected`);
  }

  // Legitimate endpoints must be accepted
  assert.equal(isValidPushEndpoint("https://fcm.googleapis.com/fcm/send/safe-id"), true);
  assert.equal(isValidPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/safe-id"), true);
});
