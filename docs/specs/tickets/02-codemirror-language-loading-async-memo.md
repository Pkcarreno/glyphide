# 02: Race-condition-free CodeMirror Language Loading with Async Memo

**What to build:**
Replace the imperative, uncoordinated async IIFE inside `createEffect` in `CodeField.tsx` with a native Solid 2 async memo (`createMemo(async () => ...)`). This ensures rapid language switching discards superseded dynamic imports of `@codemirror/lang-javascript` and `@codemirror/lang-python` automatically, preventing race conditions or stale language extensions from attaching to CodeMirror compartments.

**Blocked by:**

- 01: Solid 2.0 Foundation Migration (#251)

**Tracker Issue:** https://github.com/Pkcarreno/glyphide/issues/252

**Status:** ready-for-agent

- [ ] `CodeField.tsx` replaces the imperative language-loading effect with an async memo derived from `props.language`.
- [ ] Rapid language changes cancel or ignore in-flight dynamic imports cleanly.
- [ ] CodeMirror language compartment reconfigures with the resolved language extension or falls back to plaintext if unsupported.
- [ ] Unit and component tests for `CodeField` verify language switching behavior without race conditions or memory leaks.
