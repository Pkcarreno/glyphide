# Engine Security Checklist

> Reference for any future PR that touches a sandboxed engine
> (`@glyphide/quickjs-engine`, `@glyphide/micropython-engine`,
> `@glyphide/orchestrator`). Every invariant below is enforced by
> at least one `R-SEC-*` regression test in `packages/integration-tests/src/security/`.
> A PR is **not** ready for review if it breaks any of these.

## Sandbox isolation

- [ ] `globalThis` inside the engine does **not** expose
      `Worker`, `IndexedDB`, `localStorage`, `XMLHttpRequest`,
      `WebSocket`, or any host-side DOM API.
      Covered by `R-SEC-MP-01..05` and `R-SEC-QJS-01..04`.
- [ ] `Object.prototype` cannot be mutated from guest code.
      Covered by `R-SEC-QJS-02`.
- [ ] The `Function` constructor is not reachable from guest
      code (no dynamic code generation outside the WASM sandbox).
      Covered by `R-SEC-QJS-03`.
- [ ] `import js` from MicroPython only exposes a curated allowlist
      (e.g. `console`, `setTimeout`, structured `print`). It must
      not enumerate `document`, `fetch`, or `XMLHttpRequest`.
      Covered by `R-SEC-MP-04`.

## Network

- [ ] Outbound `fetch` is restricted to a documented origin allowlist
      (the same-origin test server is **not** enough; metadata and
      loopback must also be blocked). Covered by `R-SEC-QJS-05..08`.
- [ ] The `file://` scheme is rejected.
      Covered by `R-SEC-QJS-07`.
- [ ] Cloud-metadata endpoints (`169.254.169.254`,
      `metadata.google.internal`, …) are explicitly blocked.
      Covered by `R-SEC-QJS-06`.
- [ ] Sensitive request headers (`Cookie`, `Authorization`,
      `Proxy-Authorization`, custom `X-*` keys) are stripped before
      the request leaves the host. Covered by `R-SEC-QJS-09`.
- [ ] Response bodies are size-capped. The cap default is 5 MB;
      larger responses are aborted. Covered by `R-SEC-QJS-10`.

## Resource limits

- [ ] `memoryLimit` set at `init()` is enforced by the runtime
      (e.g. `setMemoryLimit` for QuickJS, a heap probe for
      MicroPython). A `memoryLimit: 100 GB` request must be rejected.
      Covered by `R-SEC-MP-08..09`, `R-SEC-QJS-12`.
- [ ] `timeout` is a positive integer ≤ 60 s. Negative, zero, or
      excessively large values are rejected at `init()`.
      Covered by `R-SEC-QJS-11`.
- [ ] The orchestrator enforces a wall-clock timeout on every
      `run()` call. A runaway loop must not exceed the budget
      by more than 100 ms. Covered by `R-SEC-MP-10`.

## Error recovery

- [ ] A guest statement that throws does **not** corrupt the
      engine context. A follow-up `run()` on the same orchestrator
      must succeed. Covered by `R-SEC-QJS-16`.
- [ ] A rejected `fetch` does not leak the underlying connection
      or leave dangling promises. Covered by `R-SEC-QJS-15`.

## Orchestrator

- [ ] `init()` and `terminate()` are idempotent. Calling
      `terminate()` twice in a row does not throw.
      Covered by `R-SEC-ORC-02`.
- [ ] A rapid sequence of `init()` / `terminate()` cycles does
      not leak workers or WASM contexts. The number of live
      workers after 10 cycles must equal the number of live
      orchestrators (i.e. 0). Covered by `R-SEC-ORC-01`.

## Process

- [ ] The PR description links the `R-SEC-*` IDs that the change
      flips from RED to GREEN (or notes that no scenario changed).
- [ ] `pnpm test:security` is run locally and the audit file
      (`docs/security/audit-2026-07.md`) is attached to the PR.
- [ ] If the change adds a new attack surface (new API, new
      header, new fetch target), a corresponding `R-SEC-*`
      scenario is added in the same PR.

## CI integration

The `pnpm test:security` script is **opt-in** today (expected to
fail in the RED phase). After every `R-SEC-*` scenario in this
checklist flips to GREEN, the script becomes part of the default
`pnpm test` pipeline. Track progress in
`docs/security/audit-2026-07.md`.
