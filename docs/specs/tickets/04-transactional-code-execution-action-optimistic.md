# 04: Transactional Code Execution Workflow with Action and Optimistic UI

**What to build:**
Model code execution (`runCode` in `commands.ts` and `engine.ts`) as a generator-based Solid 2 `action(function* () { ... })` across the WebWorker IPC boundary. Bind the Run button and status bar braille animations to `isPending(runCodeAction)`, and implement optimistic UI state updates (`createOptimistic`) for execution status and run counts.

**Blocked by:**

- 01: Solid 2.0 Foundation Migration (#251)
- 03: Declarative WASM Engine Lifecycle with Loading and Errored Boundaries (#253)

**Tracker Issue:** https://github.com/Pkcarreno/glyphide/issues/254

**Status:** ready-for-agent

- [ ] `runCode` is implemented as an `action` generator that manages the execution lifecycle transaction.
- [ ] The Run button spinner, disabled state, and status bar animations bind declaratively to `isPending(runCodeAction)`.
- [ ] Execution counter and active state update optimistically with `createOptimistic` and revert cleanly on cancellation or execution error.
- [ ] Interrupted execution terminates cleanly without leaving dangling optimistic states.
