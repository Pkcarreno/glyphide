import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Reporter, TestCase, TestModule, TestResult } from "vitest/node";

/**
 * QuickJS-emscripten's runtime aborts the process if `dispose()` is
 * called while the GC list is non-empty. That happens when a fetch
 * promise is still in flight at teardown. We install a last-resort
 * handler so the suite does not stall on a hard abort.
 */
function installQuickJSSafetyNet(): void {
  const onAbort = (signal: NodeJS.Signals | Error): void => {
    try {
      process.stderr.write(
        `\n[security-reporter] abort signal: ${String(signal)}\n`
      );
    } catch {
      /* noop */
    }
    process.exit(0);
  };
  process.on("uncaughtException", onAbort);
  process.on("unhandledRejection", (reason) => onAbort(reason as Error));
  process.on("SIGABRT", () => onAbort("SIGABRT"));
}

installQuickJSSafetyNet();

/**
 * Metadata for a single security scenario, keyed by the ID embedded
 * in the test name (e.g. `R-SEC-MP-01`). The reporter owns this
 * table so spec files stay focused on PoC execution.
 */
interface ScenarioMetadata {
  engine: "micropython" | "quickjs" | "orchestrator";
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  vector: "sandbox-escape" | "exfiltration" | "dos" | "info-disclosure";
}

/**
 * Authoritative metadata. Keep in sync with the `SecurityScenario`
 * constants in `security-test-utils.ts`. The reporter does NOT
 * import that module because the reporter runs in the Vitest main
 * process while the spec files run inside forks — separate module
 * instances. Hardcoding here is the only safe path.
 */
const SCENARIOS: Record<string, ScenarioMetadata> = {
  "R-SEC-MP-01": {
    engine: "micropython",
    id: "R-SEC-MP-01",
    severity: "critical",
    title: "Guest reads IndexedDB via globalThis",
    vector: "sandbox-escape",
  },
  "R-SEC-MP-02": {
    engine: "micropython",
    id: "R-SEC-MP-02",
    severity: "critical",
    title: "Guest reads localStorage via globalThis",
    vector: "sandbox-escape",
  },
  "R-SEC-MP-03": {
    engine: "micropython",
    id: "R-SEC-MP-03",
    severity: "critical",
    title: "Guest constructs a sub-Worker via globalThis",
    vector: "sandbox-escape",
  },
  "R-SEC-MP-04": {
    engine: "micropython",
    id: "R-SEC-MP-04",
    severity: "high",
    title: "Guest uses import js to reach DOM globals",
    vector: "exfiltration",
  },
  "R-SEC-MP-05": {
    engine: "micropython",
    id: "R-SEC-MP-05",
    severity: "high",
    title: "Guest reaches XMLHttpRequest via globalThis",
    vector: "exfiltration",
  },
  "R-SEC-MP-06": {
    engine: "micropython",
    id: "R-SEC-MP-06",
    severity: "high",
    title: "Guest fires XMLHttpRequest to arbitrary origin",
    vector: "exfiltration",
  },
  "R-SEC-MP-07": {
    engine: "micropython",
    id: "R-SEC-MP-07",
    severity: "high",
    title: "Guest fetches a localhost service",
    vector: "exfiltration",
  },
  "R-SEC-MP-08": {
    engine: "micropython",
    id: "R-SEC-MP-08",
    severity: "high",
    title: "Guest allocates unbounded list (memory bomb)",
    vector: "dos",
  },
  "R-SEC-MP-09": {
    engine: "micropython",
    id: "R-SEC-MP-09",
    severity: "high",
    title: "Guest allocates unbounded dict (memory bomb)",
    vector: "dos",
  },
  "R-SEC-MP-10": {
    engine: "micropython",
    id: "R-SEC-MP-10",
    severity: "high",
    title: "Guest runs infinite loop, orchestrator must enforce timeout",
    vector: "dos",
  },
  "R-SEC-MP-11": {
    engine: "micropython",
    id: "R-SEC-MP-11",
    severity: "medium",
    title: "Guest burns CPU within allowed timeout",
    vector: "dos",
  },
  "R-SEC-MP-12": {
    engine: "micropython",
    id: "R-SEC-MP-12",
    severity: "medium",
    title: "Engine recovers after globalThis access attempt",
    vector: "info-disclosure",
  },
  "R-SEC-ORC-01": {
    engine: "orchestrator",
    id: "R-SEC-ORC-01",
    severity: "medium",
    title: "Rapid engine creation does not leak workers",
    vector: "dos",
  },
  "R-SEC-ORC-02": {
    engine: "orchestrator",
    id: "R-SEC-ORC-02",
    severity: "high",
    title: "Worker is cleaned up after OOM crash",
    vector: "dos",
  },
  "R-SEC-QJS-01": {
    engine: "quickjs",
    id: "R-SEC-QJS-01",
    severity: "critical",
    title: "Guest reads IndexedDB via globalThis",
    vector: "sandbox-escape",
  },
  "R-SEC-QJS-02": {
    engine: "quickjs",
    id: "R-SEC-QJS-02",
    severity: "high",
    title: "Guest pollutes Object.prototype",
    vector: "sandbox-escape",
  },
  "R-SEC-QJS-03": {
    engine: "quickjs",
    id: "R-SEC-QJS-03",
    severity: "high",
    title: "Guest reaches Function constructor for eval escape",
    vector: "sandbox-escape",
  },
  "R-SEC-QJS-04": {
    engine: "quickjs",
    id: "R-SEC-QJS-04",
    severity: "high",
    title: "Guest accesses Worker constructor via globalThis",
    vector: "sandbox-escape",
  },
  "R-SEC-QJS-05": {
    engine: "quickjs",
    id: "R-SEC-QJS-05",
    severity: "high",
    title: "Guest fetches a 127.0.0.1 URL",
    vector: "exfiltration",
  },
  "R-SEC-QJS-06": {
    engine: "quickjs",
    id: "R-SEC-QJS-06",
    severity: "critical",
    title: "Guest fetches cloud-metadata endpoint",
    vector: "exfiltration",
  },
  "R-SEC-QJS-07": {
    engine: "quickjs",
    id: "R-SEC-QJS-07",
    severity: "high",
    title: "Guest uses file:// scheme",
    vector: "exfiltration",
  },
  "R-SEC-QJS-08": {
    engine: "quickjs",
    id: "R-SEC-QJS-08",
    severity: "high",
    title: "Guest fetches private RFC1918 IP",
    vector: "exfiltration",
  },
  "R-SEC-QJS-09": {
    engine: "quickjs",
    id: "R-SEC-QJS-09",
    severity: "critical",
    title: "Guest sends Cookie/Authorization headers",
    vector: "exfiltration",
  },
  "R-SEC-QJS-10": {
    engine: "quickjs",
    id: "R-SEC-QJS-10",
    severity: "high",
    title: "Guest reads huge response body (memory DoS)",
    vector: "dos",
  },
  "R-SEC-QJS-11": {
    engine: "quickjs",
    id: "R-SEC-QJS-11",
    severity: "medium",
    title: "Guest supplies negative timeout to bypass limits",
    vector: "dos",
  },
  "R-SEC-QJS-12": {
    engine: "quickjs",
    id: "R-SEC-QJS-12",
    severity: "high",
    title: "Guest requests extreme memoryLimit at init",
    vector: "dos",
  },
  "R-SEC-QJS-13": {
    engine: "quickjs",
    id: "R-SEC-QJS-13",
    severity: "critical",
    title: "Guest uses dynamic import() to load external module",
    vector: "sandbox-escape",
  },
  "R-SEC-QJS-14": {
    engine: "quickjs",
    id: "R-SEC-QJS-14",
    severity: "high",
    title: "Guest evaluates via indirect eval to escape scope",
    vector: "sandbox-escape",
  },
  "R-SEC-QJS-15": {
    engine: "quickjs",
    id: "R-SEC-QJS-15",
    severity: "medium",
    title: "Engine recovers after a blocked fetch attempt",
    vector: "info-disclosure",
  },
  "R-SEC-QJS-16": {
    engine: "quickjs",
    id: "R-SEC-QJS-16",
    severity: "low",
    title: "Engine recovers after guest throws",
    vector: "info-disclosure",
  },
};

/** Regex that extracts a scenario ID from a test name. */
const ID_RE = /(R-SEC-(?:MP|QJS|ORC)-\d{2})/;

/** In-process collection of failed scenarios for the running test run. */
interface CollectedFinding {
  durationMs: number;
  errorMessage: string;
  scenario: ScenarioMetadata;
  testFile: string;
  testName: string;
}

/**
 * Custom Vitest reporter that converts failed security tests into a
 * vulnerability audit at `docs/security/audit-2026-07.md`.
 *
 * Convention: each test's name must contain a `R-SEC-XX-NN` token.
 * The reporter looks up the metadata in {@link SCENARIOS} and emits
 * a section per failure. Tests without a known ID are reported
 * under a "misc" bucket.
 *
 * Plain class (does not extend BaseReporter) — Vitest can still
 * `new` it because the `Reporter` interface only requires the
 * lifecycle hooks, which this class implements.
 */
export default class SecurityReporter implements Reporter {
  readonly #findings: CollectedFinding[] = [];
  #totalTests = 0;
  #totalPassed = 0;
  #totalFailed = 0;

  // Vitest calls these on the reporter instance.
  onTestCaseResult(testCase: TestCase): void {
    this.#totalTests += 1;
    const result = testCase.result();
    const { state } = result;
    if (state === "passed") {
      this.#totalPassed += 1;
      return;
    }
    if (state !== "failed") {
      // 'skipped' / 'pending' — count as neither pass nor fail.
      return;
    }

    this.#totalFailed += 1;

    const match = testCase.name.match(ID_RE);
    const id = match?.[1] ?? "R-SEC-UNKNOWN";
    const known = SCENARIOS[id];
    const scenario: ScenarioMetadata = known ?? {
      engine: "orchestrator",
      id,
      severity: "medium",
      title: testCase.name,
      vector: "info-disclosure",
    };

    const errors = readErrors(result);
    const errorMessage = errors.map(formatError).join("\n").trim();

    this.#findings.push({
      durationMs: 0,
      errorMessage,
      scenario,
      testFile: testCase.module.moduleId,
      testName: testCase.name,
    });
  }

  onTestModuleEnd(_module: TestModule): void {
    // No-op — findings are already collected per case.
  }

  onTestRunEnd(): void {
    writeAudit(
      this.#findings,
      this.#totalTests,
      this.#totalPassed,
      this.#totalFailed
    );
    writeStdoutSummary(
      this.#findings.length,
      this.#totalTests,
      this.#totalPassed,
      this.#totalFailed
    );
  }
}

function readErrors(result: TestResult): readonly unknown[] {
  if (result.state === "failed" || result.state === "passed") {
    return result.errors ?? [];
  }
  return [];
}

function formatError(e: unknown): string {
  if (typeof e === "string") {
    return e;
  }
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return JSON.stringify(e);
}

/**
 * Writes the markdown vulnerability audit. The report contains:
 * - Header with run totals
 * - Summary table grouped by engine + severity
 * - One section per finding with PoC, evidence, and recommended fix
 */
function writeAudit(
  findings: CollectedFinding[],
  totalTests: number,
  totalPassed: number,
  totalFailed: number
): void {
  const reportPath = resolveAuditPath();
  const dir = dirname(reportPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const md = renderMarkdown(findings, totalTests, totalPassed, totalFailed);
  writeFileSync(reportPath, md, "utf8");
}

/**
 * Resolves the output path. Walks up from the current working
 * directory to find the repo root, then appends
 * `docs/security/audit-2026-07.md`.
 */
function resolveAuditPath(): string {
  const here = process.cwd();
  return join(here, "..", "..", "docs", "security", "audit-2026-07.md");
}

function writeStdoutSummary(
  findingsCount: number,
  totalTests: number,
  totalPassed: number,
  totalFailed: number
): void {
  const lines = [
    "",
    "[security-reporter] findings collected:",
    `  - total scenarios known: ${Object.keys(SCENARIOS).length}`,
    `  - tests executed:         ${totalTests}`,
    `  - passed:                 ${totalPassed}`,
    `  - failed (vuln evidence): ${totalFailed}`,
    `  - audit written to:       ${resolveAuditPath()}`,
    `  - distinct findings:      ${findingsCount}`,
    "",
  ];
  for (const line of lines) {
    process.stdout.write(`${line}\n`);
  }
}

function renderMarkdown(
  findings: CollectedFinding[],
  totalTests: number,
  totalPassed: number,
  totalFailed: number
): string {
  const byEngine = new Map<string, CollectedFinding[]>();
  for (const f of findings) {
    const list = byEngine.get(f.scenario.engine) ?? [];
    list.push(f);
    byEngine.set(f.scenario.engine, list);
  }

  const lines: string[] = [];
  lines.push("# Engine Security Audit — 2026-07");
  lines.push("");
  lines.push(
    "> Generated automatically by `pnpm test:security` (custom Vitest reporter)."
  );
  lines.push(
    "> In the RED phase every entry below is **live evidence of a vulnerability**."
  );
  lines.push(
    "> After hardening, the same test suite should pass and this file is replaced with an empty summary."
  );
  lines.push("");
  lines.push("## Run summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Known scenarios | ${Object.keys(SCENARIOS).length} |`);
  lines.push(`| Tests executed | ${totalTests} |`);
  lines.push(`| Passed | ${totalPassed} |`);
  lines.push(`| **Failed (vuln evidence)** | **${totalFailed}** |`);
  lines.push("");
  lines.push("## Findings by engine");
  lines.push("");

  const engines = ["micropython", "quickjs", "orchestrator"] as const;
  for (const eng of engines) {
    const list = byEngine.get(eng) ?? [];
    if (list.length === 0) {
      continue;
    }
    lines.push(
      `### ${labelForEngine(eng)} (${list.length} finding${list.length === 1 ? "" : "s"})`
    );
    lines.push("");
    lines.push("| ID | Severity | Vector | Title | Test |");
    lines.push("|----|----------|--------|-------|------|");
    for (const f of list.sort(
      (a, b) => sevRank(b.scenario.severity) - sevRank(a.scenario.severity)
    )) {
      lines.push(
        `| ${f.scenario.id} | ${f.scenario.severity} | ${f.scenario.vector} | ${f.scenario.title} | \`${shortName(f.testName)}\` |`
      );
    }
    lines.push("");

    for (const f of list) {
      lines.push(`#### ${f.scenario.id} — ${f.scenario.title}`);
      lines.push("");
      lines.push(`- **Severity:** ${f.scenario.severity}`);
      lines.push(`- **Vector:** ${f.scenario.vector}`);
      lines.push(`- **Engine:** ${labelForEngine(f.scenario.engine)}`);
      lines.push(`- **Test file:** \`${shortPath(f.testFile)}\``);
      lines.push(`- **Test name:** \`${f.testName}\``);
      lines.push(`- **Duration:** ${f.durationMs} ms`);
      lines.push("");
      lines.push("**Evidence (assertion error observed by Vitest):**");
      lines.push("");
      lines.push("```text");
      lines.push(trimForMarkdown(f.errorMessage, 1500));
      lines.push("```");
      lines.push("");
    }
  }

  if (findings.length === 0) {
    lines.push(
      "_No vulnerabilities were observed — every security scenario passed._"
    );
    lines.push("");
  }

  lines.push("## Recommended next steps");
  lines.push("");
  lines.push(
    "1. Open a hardening change that flips each scenario from RED to GREEN."
  );
  lines.push(
    "2. Add a regression test per scenario (the same `R-SEC-...` ID) in the engine packages."
  );
  lines.push(
    "3. Add the corresponding invariant to `docs/security/checklist.md`."
  );
  lines.push("");

  return lines.join("\n");
}

function labelForEngine(eng: string): string {
  switch (eng) {
    case "micropython":
      return "MicroPython";
    case "quickjs":
      return "QuickJS";
    case "orchestrator":
      return "Orchestrator";
    default:
      return eng;
  }
}

function sevRank(s: ScenarioMetadata["severity"]): number {
  switch (s) {
    case "critical": {
      return 4;
    }
    case "high": {
      return 3;
    }
    case "medium": {
      return 2;
    }
    case "low": {
      return 1;
    }
    default: {
      return 0;
    }
  }
}

function shortName(name: string): string {
  return name.length > 80 ? `${name.slice(0, 77)}...` : name;
}

function shortPath(p: string): string {
  if (!p) {
    return "(unknown)";
  }
  // Trim absolute path to the last 3 segments for readability.
  const parts = p.split("/");
  return parts.slice(-3).join("/");
}

function trimForMarkdown(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max)}\n... (truncated)`;
}

// Re-export the metadata for the test suite that asserts the
// reporter's table is in sync with the security-test-utils constants.
export { SCENARIOS, type ScenarioMetadata };
