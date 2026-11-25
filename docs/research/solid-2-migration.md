# Solid 2.0 Migration Research Report

## Executive Summary

This report evaluates migrating the Glyphide codebase from SolidJS 1.9.19 to SolidJS 2.0.
The assessment is based on official primary sources from the Solid 2.0 migration documentation:

- [From Solid 1.x](https://docs.solidjs.com/migration/from-solid-1)
- [Data Fetching from Solid 1](https://docs.solidjs.com/migration/data-fetching-from-solid-1)
- [Async Reactivity](https://docs.solidjs.com/concepts/async-reactivity)

### Architectural Scope in Monorepo

| Package / Application         | Uses SolidJS?                                          | Migration Impact                                         |
| ----------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `apps/editor`                 | **Yes** (`solid-js`, `solid-js/store`, `solid-js/web`) | **Primary target**: 132 files, 63 test suites, 698 tests |
| `packages/orchestrator`       | No (Pure TS / WebWorker RPC runner)                    | Unaffected                                               |
| `packages/quickjs-engine`     | No (Pure TS / WebAssembly QuickJS)                     | Unaffected                                               |
| `packages/micropython-engine` | No (Pure TS / WebAssembly MicroPython)                 | Unaffected                                               |
| `packages/rpc-protocol`       | No (Pure JSON-RPC 2.0 contracts)                       | Unaffected                                               |
| `packages/mock-engine`        | No (Headless test engine)                              | Unaffected                                               |
| `packages/url-migration`      | No (State codec & compression)                         | Unaffected                                               |
| `packages/integration-tests`  | No (Cross-package security runner)                     | Unaffected                                               |

The migration boundary is strictly isolated to `apps/editor`.

---

## 1. High-Effort Migration Elements

Below are the items requiring the most refactoring effort, ordered from highest to lowest impact.

### 1.1 `splitProps` Removal to `omit` (Highest Surface Area: 85 files)

- **The Change**:
  Solid 2 removes `splitProps(props, [...keys])` and introduces `omit(props, ...keys)`.
  In Solid 1, `splitProps` returns a two-element tuple `[local, rest]` where `local` is a proxy of the picked keys and `rest` is a proxy of the omitted keys.
  In Solid 2, `omit` returns only the omitted keys proxy. The component reads its local properties directly from `props`.
- **Current Pattern in Glyphide**:
  Almost every component in [src/components/atoms/](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/atoms) and [src/components/molecules/](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/molecules) uses:

  ```tsx
  // Solid 1 (85 occurrences across the codebase)
  const [local, rest] = splitProps(props, ["class", "variant", "size"]);
  return <button class={cn(buttonVariants({ variant: local.variant }), local.class)} {...rest} />;
  ```
- **Migration Required**:

  ```tsx
  // Solid 2
  const rest = omit(props, "class", "variant", "size");
  return <button class={cn(buttonVariants({ variant: props.variant }), props.class)} {...rest} />;
  ```
- **Effort Estimate**: Large in volume, mechanical in complexity. Automated codemod or systematic refactoring required across 85 components.

### 1.2 Two-Phase `createEffect` & Elimination of `on(...)` (25 call sites)

- **The Change**:
  Solid 2 splits `createEffect` into two phases:
  1. **Compute Phase** (tracked): Reads reactive state, must remain pure and free of side-effects or state writes.
  2. **Effect Phase** (untracked): Receives the value from the compute phase, runs imperative side effects, and returns a cleanup function.
     The `on(...)` helper is removed. Its tracking declaration moves directly into the compute phase.
     Local `onCleanup(...)` inside the effect body is removed in favor of returning the cleanup function from the effect callback.
- **Current Hotspots in Glyphide**:
  1. [CodeField.tsx:89-175](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/atoms/CodeField/CodeField.tsx#L89-L175):
     Five effects controlling CodeMirror 6 compartments:
     - Theme appearance (`props.isDark`)
     - Word wrap toggle (`props.isWordWrapEnabled`)
     - Read-only state (`props.isReadOnly`)
     - Dynamic language loading (`props.language`)
     - Buffer value synchronization (`props.value` vs `view.state.doc`)
  2. [Command.tsx:127-135](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/atoms/Command.tsx#L127-L135):
     Writes to `setSelectedId(...)` inside an effect body. In Solid 2 development mode, writes inside owned reactive scopes throw diagnostics.
  3. [engine.ts:106-117](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/engine.ts#L106-L117):
     `createEffect(on(deps.session.code, () => { if (engineStatus() === "running") setIsDirty(true); }, { defer: true }))`.
- **Migration Required**:

  ```ts
  // Solid 2
  createEffect(
    () => deps.session.code(),
    () => {
      if (engineStatus() === "running") {
        setIsDirty(true);
      }
    },
    { defer: true }
  );
  ```

### 1.3 Staged Writes & Microtask Timing in Domain Models and Vitest Tests (63 test suites, 698 tests)

- **The Change**:
  In Solid 1, signal writes take effect synchronously.
  In Solid 2, writes are staged and flushed on the next microtask. A read immediately following a setter returns the previous committed value:

  ```ts
  setCount(1);
  count(); // Returns 0 in Solid 2!
  flush();
  count(); // Returns 1
  ```
- **Impact on Glyphide**:
  - Domain models ([session.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/session.ts), [settings.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/settings.ts), [output.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/output.ts), [overlay.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/overlay.ts)) and commands ([commands.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/commands.ts)) are heavily tested with synchronous assertions in Vitest:

    ```ts
    // session.test.ts:132
    session.setCode("const x = 42;");
    expect(session.code()).toBe("const x = 42;"); // Fails in Solid 2 without flush()!
    ```
  - Testing non-UI domain models in Solid 2 requires calling `flush()` after state mutations before running assertions.
  - Production code: any place that invokes a setter and expects an immediate synchronous getter read in the same tick must pass values directly or use `flush()`.

### 1.4 Removal of `batch()` (8 call sites)

- **The Change**:
  Solid 2 removes `batch()`. Writes in the same synchronous turn already share the default microtask batch.
- **Impact on Glyphide**:
  - [session.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/session.ts): lines 244, 268, 291, 317, 347.
  - [output.ts:78](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/output.ts#L78).
  - All `batch(...)` wrappers must be removed.

### 1.5 Package Ecosystem & Peer Dependency Boundary

- **The Change**:
  `solid-js/web` moves to `@solidjs/web`. `solid-js/store` moves into `solid-js`.
  `vite-plugin-solid` is replaced by `@solidjs/vite-plugin`.
  `tsconfig.json` requires `"jsxImportSource": "@solidjs/web"`.
- **Ecosystem Blockers in Glyphide**:
  1. `lucide-solid` (v1.73.0): Imports directly from `solid-js/web` (`import { spread, mergeProps, ... } from 'solid-js/web'`). Will break in Solid 2 unless aliased or updated to a Solid 2 compatible release.
  2. `@solidjs/testing-library` (v0.8.10): Imports `render` and `hydrate` from `solid-js/web`. Requires upgrading to the Solid 2 release of the testing library.

### 1.6 Lifecycle & Component Syntax Changes

- **`onMount` to `onSettled` (19 call sites)**:
  `onMount` is removed. Replaced by `onSettled`. Listeners with cleanups return the cleanup directly from the callback.
- **`Context.Provider` to `<Context value={...}>` (7 providers)**:
  `<EditorContext.Provider value={core}>` becomes `<EditorContext value={core}>`.
- **`<Dynamic component={...} />` Deprecation**:
  Replaced by `dynamic(() => source)` in [Popover.tsx](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/atoms/Popover.tsx), [Dropdown.tsx](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/atoms/Dropdown.tsx), [Dialog.tsx](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/molecules/Dialog.tsx).
- **`ErrorBoundary` to `Errored` (1 site)**:
  In [ConsolePane.tsx:232](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/organisms/ConsolePane.tsx#L232), fallback receives an error accessor (`err()`), not raw error object.

---

## 2. General Benefits of Solid 2.0

1. **Elimination of UI Tearing and Accidental Cascade Re-renders**:
   Microtask batching by default prevents intermediate inconsistent states from bleeding into the DOM without needing manual `batch()` wrapping.
2. **Explicit Reactivity Contracts (Compute vs Effect)**:
   Clear separation prevents accidental dependency subscriptions in side-effect code. Eliminates circular effect loops and stale closure traps.
3. **Draft-Based Store Updates**:
   Direct draft mutations (`draft.property = value`) replace awkward path tuples or manual object copying, improving developer experience in [settings.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/settings.ts) and modal configurations.
4. **Decoupled Architecture**:
   Separating `@solidjs/web` from core `solid-js` ensures cleaner boundaries and smaller bundle size.
5. **Runtime Diagnostic Engine**:
   Development mode warns against silent holds, top-level reactive reads outside tracking scopes, and async waterfalls.

---

## 3. Async Reactivity Benefits Specifically for Glyphide

Solid 2 unifies async operations directly into the reactive graph (`createMemo(async () => ...)`, `Loading`, `isPending`, `latest`, `action`, `createOptimistic`). This directly solves multiple architectural friction points in Glyphide:

### 3.1 WebAssembly Engine Initialization & Worker Lifecycle

- **Current Pain Point**:
  In [engine.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/engine.ts), initializing QuickJS or MicroPython involves dynamic factory loading (`deps.registry.loadFactory`), worker instantiation, and WASM compilation.
  Current code manually manages status signals (`idle` -> `initializing` -> `ready` | `error` | `blocked`), manual retry logic, and imperative error formatting.
- **Solid 2 Solution**:
  - Model engine initialization as an async computation.
  - Initial load presents `<Loading fallback={<EngineInitSpinner />}>`.
  - In-flight engine switching utilizes `isPending(engineInstance)`: the editor remains fully interactive and keeps current engine bindings visible until the new engine worker confirms readiness.
  - Failed WASM fetch or compilation seamlessly routes to `<Errored fallback={(err, reset) => <EngineErrorBanner error={err()} onRetry={reset} />}>`, replacing custom error state handlers with native graph recovery.

### 3.2 Race-Condition-Free Dynamic CodeMirror Language Loading

- **Current Pain Point**:
  In [CodeField.tsx:122-154](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/components/atoms/CodeField/CodeField.tsx#L122-L154), language modules (`@codemirror/lang-javascript`, `@codemirror/lang-python`) are imported via an uncoordinated `async` IIFE inside `createEffect`. Rapid engine switching creates race conditions where obsolete dynamic imports can resolve out of order.
- **Solid 2 Solution**:

  ```ts
  const languageExtension = createMemo(async () => {
    const lang = props.language;
    if (lang === "javascript") {
      const { javascript } = await import("@codemirror/lang-javascript");
      return javascript();
    }
    if (lang === "python") {
      const { python } = await import("@codemirror/lang-python");
      return python();
    }
    return undefined;
  });
  ```

  Solid 2 automatically discards superseded results when `props.language` changes before the previous import finishes. No stale language extension ever touches CodeMirror.

### 3.3 Transactional Code Execution with `action()` and Optimistic UI

- **Current Pain Point**:
  In [commands.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/commands.ts) and [engine.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/models/engine.ts), code execution crosses an IPC boundary to a WebWorker. Managing run buttons, status bar braille animations, execution badges, and output clearing requires coordinating multiple signals across disparate models.
- **Solid 2 Solution**:
  `action` provides generator-based transaction scopes:

  ```ts
  const runCodeAction = action(function* () {
    output.clearEntries();
    yield engine.executeCode();
  });
  ```

  - `isPending(runCodeAction)` natively drives the Run button spinner and status bar animation without manual boolean state tracking.
  - `createOptimistic` allows instant UI updates (e.g., status changes to "running") that automatically settle or revert if execution is interrupted or throws.

### 3.4 Asynchronous File IO and URL Serialization

- **Current Pain Point**:
  `downloadBufferToFile()` in [commands.ts:171](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/commands.ts#L171) and URL compression in [url-persistence.ts](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/apps/editor/src/core/adapters/url-persistence.ts) use manual promise handling and try/catch notification dispatching.
- **Solid 2 Solution**:
  Exporting files and sharing URLs become actions. UI controls automatically bind to `isPending` to disable download buttons during serialization, avoiding duplicate clicks.

---

## 4. Migration Strategy & Recommendations

### Step 1: Upstream Ecosystem Verification (Prerequisite)

Verify or establish compatibility for external packages:

- Test `@solidjs/testing-library` Solid 2 beta/release.
- Verify `lucide-solid` compatibility, or configure a temporary Vite alias:
  `resolve: { alias: { "solid-js/web": "@solidjs/web" } }`.

### Step 2: Mechanical Prop & API Refactoring

- Replace 85 occurrences of `splitProps(props, [...keys])` with `omit(props, ...keys)`.
- Replace 7 `<Context.Provider>` usages with `<Context>`.
- Replace `<Dynamic component={...}>` with `dynamic(() => ...)`.
- Replace `ErrorBoundary` with `Errored`.

### Step 3: Lifecycle and Effect Phase Separation

- Replace 19 `onMount` calls with `onSettled`.
- Split all 25 `createEffect` calls into explicit compute and effect functions.
- Move CodeMirror compartment dispatch calls into the effect phase.

### Step 4: Staged Writes & Vitest Suite Adaptation

- Add `flush()` imports and invocations in unit test suites where domain setters are tested synchronously.
- Verify test passes across all 63 test suites in development mode to catch Solid 2 runtime diagnostics.

### Step 5: Adopt Async Primitives in Domain Workflows

- Convert CodeMirror dynamic language imports to async `createMemo`.
- Refactor engine initialization to leverage `createMemo(async () => ...)`, `Loading`, and `Errored`.
- Refactor `runCode` to a Solid 2 `action`.
