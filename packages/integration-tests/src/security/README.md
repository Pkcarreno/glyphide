# Security Tests

Adversarial test suite for the Glyphide execution engines
(`@glyphide/quickjs-engine`, `@glyphide/micropython-engine`,
`@glyphide/orchestrator`).

## What this is

These tests are written in **TDD RED** style. Each `it()` block:

1. Executes a real PoC against a real engine adapter (no mocks).
2. Asserts the **secure** behavior (`expect ... toContain('BLOCKED')`).
3. **Fails today** because the underlying vulnerability is still
   present. The failure is the evidence — the custom reporter
   captures it into `docs/security/audit-2026-07.md`.

After the hardening change is merged, the same test code flips
to GREEN without any test edits.

## Running

From the repository root:

```bash
pnpm test:security
```

The script is wired into Turborepo and is **opt-in** — it does
**not** run in the default `pnpm test` pipeline. Once every
`R-SEC-*` scenario flips to GREEN, the task becomes part of the
default pipeline.

To run a single engine suite:

```bash
pnpm --filter @glyphide/integration-tests exec \
  vitest run --config vitest.security.config.ts src/security/micropython
```

To run a single scenario by name pattern:

```bash
pnpm --filter @glyphide/integration-tests exec \
  vitest run --config vitest.security.config.ts -t "R-SEC-QJS-06"
```

## Layout

```
src/security/
├── helpers/
│   ├── engine-factory.ts          # createSecurityContext()
│   ├── security-test-utils.ts     # PoC constants + assertion helpers
│   └── security-reporter.ts       # Vitest reporter → audit-2026-07.md
├── micropython/
│   ├── sandbox-isolation.security.spec.ts
│   ├── network-security.security.spec.ts
│   ├── resource-limits.security.spec.ts
│   └── error-recovery.security.spec.ts
├── quickjs/
│   ├── sandbox-isolation.security.spec.ts
│   ├── network-security.security.spec.ts
│   ├── resource-limits.security.spec.ts
│   └── error-recovery.security.spec.ts
└── orchestrator/
    ├── rate-limiting.security.spec.ts
    └── worker-cleanup.security.spec.ts
```

## Conventions

- Each test name embeds a `R-SEC-XX-NN` token where `XX` is the
  engine prefix (`MP`, `QJS`, `ORC`) and `NN` is the scenario
  number. The reporter parses this token to look up metadata.
- Each PoC is a self-contained string constant in
  `helpers/security-test-utils.ts`. Do not inline PoCs in spec
  files — keep them auditable in one place.
- Network PoCs that need a target URL use the placeholder
  `{{TARGET}}`. The spec file calls `injectTarget()` to substitute
  the test server URL.
- The `disposeAll()` helper is mandatory in `afterEach` so a
  memory-bomb crash does not leak workers.

## Safety mechanisms

- `testTimeout: 10_000` — hard per-test cap. A worker that hangs
  is killed by the orchestrator.
- `pool: "forks"`, `maxWorkers: 1`, `fileParallelism: false` —
  sequential execution. WASM init + memory bombs would OOM
  the test runner if parallelized.
- The `createSecurityContext()` factory sets a 10 MB memory
  ceiling and a 5 s timeout by default. Override per-test
  via the second argument.

## Adding a new scenario

1. Add a `SecurityScenario` constant in
   `helpers/security-test-utils.ts` with a unique `R-SEC-*-NN`
   id, a PoC that prints `VULNERABILITY: ...` or `BLOCKED: ...`,
   and the matching `secureSubstring` / `vulnerableSubstring`.
2. Add the same id to the reporter's `SCENARIOS` table in
   `helpers/security-reporter.ts` (with title / engine / severity /
   vector).
3. Add a test in the appropriate `*.security.spec.ts` file.
4. Add the invariant to `docs/security/checklist.md`.

## See also

- `docs/security/audit-2026-07.md` — generated vulnerability audit
- `docs/security/checklist.md` — invariants the engines must keep
