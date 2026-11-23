# Specification: Solid 2.0 Foundation Migration

- **Target Package**: `apps/editor`
- **Scope**: Migration of runtime, compiler, component prop contracts, two-phase effects, draft stores, and test suites to Solid 2.0.3.
- **Reference**: [Research Report](file:///home/pk/.t3/worktrees/glyphide/t3-37942db9-119b93e2b520ae68/docs/research/solid-2-migration.md) & [Solid 2 Migration Guide](https://docs.solidjs.com/migration/from-solid-1)

---

## Problem Statement

Glyphide's web code editor (`apps/editor`) is currently built on SolidJS 1.9.19. This version uses a monolithic package layout (`solid-js/web`, `solid-js/store`), synchronous signal writes that can produce UI tearing without manual `batch()` wrapping, untracked effect bodies that risk accidental reactive loops, and deprecated build plugins (`vite-plugin-solid`). Furthermore, external dependencies are beginning to target Solid 2, creating ecosystem friction.

The engineering team needs to upgrade `apps/editor` to Solid 2.0 without destabilizing the application. The migration must happen in a single, well-structured pull request with granular, reviewable commits so the team can learn and evaluate Solid 2 syntax changes in isolation. All 698 existing unit and component tests must pass with zero behavioral regressions, while advanced async architectural changes (`action`, async memos for engine initialization) must be kept out of this PR to avoid conflating syntax migration with async paradigm shifts.

---

## Solution

Execute a structured, five-commit migration of `apps/editor` to SolidJS 2.0.3, `@solidjs/web` 2.0.3, `@solidjs/vite-plugin` 3.0.1, and `@solidjs/testing-library` 1.0.0-rc.2:

1. **Commit 1 (`chore(deps)`)**: Upgrade packages, configure `@solidjs/web` JSX compiler ownership, and add a Vite resolution alias for `lucide-solid`.
2. **Commit 2 (`refactor(ui)`)**: Replace `splitProps` with `omit` across all 85 UI components following Atomic Design hierarchy (Atoms → Molecules → Organisms → Templates/Pages), and update `<Context>` and `dynamic()` syntax.
3. **Commit 3 (`refactor(reactivity)`)**: Split all 25 `createEffect` calls into explicit compute and effect phases, and replace 19 `onMount` calls with `onSettled`.
4. **Commit 4 (`refactor(core)`)**: Convert store setters to draft mutations, remove obsolete `batch()` calls, and migrate `<ErrorBoundary>` to `<Errored>`.
5. **Commit 5 (`test(editor)`)**: Adapt model unit tests for staged writes using `flush()`, bringing all 63 test suites (698 tests), typecheck, and linter to 100% green.

Intermediate WIP commits will bypass pre-commit validation using `LEFTHOOK=0` until Commit 5 verifies the entire workspace.

---

## User Stories

1. As a developer maintaining Glyphide, I want to upgrade `solid-js` to version 2.0.3, so that the editor runs on the latest reactive core with improved performance and modular packaging.
2. As a developer, I want `@solidjs/web` to own the DOM renderer and web JSX types, so that rendering is decoupled from core reactive primitives.
3. As a developer, I want `@solidjs/vite-plugin` 3.0.1 to replace `vite-plugin-solid`, so that the build pipeline uses the official Vite transform for Solid 2.
4. As a developer, I want `lucide-solid` to resolve properly via a bundler alias, so that all SVG icons continue rendering without waiting for an upstream release.
5. As a developer, I want `@solidjs/testing-library` updated to version 1.0.0-rc.2, so that component tests interact seamlessly with the Solid 2 runtime.
6. As a UI engineer, I want atomic components (`Button`, `Input`, `Select`, `Tabs`, `Popover`, `VirtualList`, etc.) to use `omit` instead of `splitProps`, so that rest props are forwarded cleanly without runtime overhead.
7. As a UI engineer, I want component properties to be read directly from the `props` object, so that fine-grained reactivity is maintained under Solid 2 compiler rules.
8. As a UI engineer, I want molecule components (`Dialog`, `Toast`, `ConsoleMessage`, `ActionTooltip`) to adopt `omit`, so that modal and feedback interfaces stay consistent with the new prop contracts.
9. As a UI engineer, I want organism components (`Header`, `StatusBar`, `ConsolePane`, `EditorPane`, `FloatingLayer`) to adopt `omit`, so that layout and container elements forward native attributes properly.
10. As a UI engineer, I want context providers to use `<Context value={...}>` instead of `<Context.Provider value={...}>`, so that component trees follow standard Solid 2 syntax.
11. As a UI engineer, I want polymorphic components (`DialogTitle`, `PopoverTrigger`, `DropdownTrigger`) to use `dynamic(() => ...)` instead of deprecated `<Dynamic>`, so that custom container tags render without deprecation warnings.
12. As a core developer, I want CodeMirror compartment synchronizations in `CodeField` to run inside two-phase `createEffect` hooks, so that tracking dependencies does not trigger accidental side effects.
13. As a core developer, I want theme switching and UI scaling in `EditorPage` to use separate compute and effect phases, so that document mutations run exclusively in untracked effect phases.
14. As a core developer, I want status bar braille animations to clean up by returning functions from effect callbacks, so that intervals are disposed deterministically without effect-local `onCleanup`.
15. As a core developer, I want lifecycle event listeners in popovers and dropdowns to use `onSettled`, so that outside click handlers attach only after DOM rendering is committed.
16. As a core developer, I want editor settings in `SettingsModel` to update via mutable draft callbacks, so that store mutations are concise and type-safe.
17. As a core developer, I want session state updates in `WorkspaceSession` to omit obsolete `batch()` wrappers, so that state transitions rely on Solid 2's native microtask batching.
18. As a core developer, I want console output buffering in `OutputModel` to eliminate `batch()`, so that high-frequency log updates batch naturally on microtasks without manual transaction wrappers.
19. As a user viewing console output, I want rendering errors to be caught by an `<Errored>` boundary, so that malformed tokens or circular structures display fallback text without crashing the IDE.
20. As a developer running test suites, I want model tests to invoke `flush()` after synchronous mutations, so that reactive assertions evaluate confirmed microtask state.
21. As a developer committing intermediate migration steps, I want to use `LEFTHOOK=0` on WIP commits, so that pre-commit hooks do not block atomic commit history before all layers are converted.
22. As a reviewer evaluating the migration PR, I want to review five distinct, focused commits, so that each architectural adaptation can be inspected in isolation.

---

## Implementation Decisions

### 1. Architectural Boundaries & Monorepo Isolation
- The migration is 100% confined to `apps/editor`. Packages in `packages/*` (`orchestrator`, `quickjs-engine`, `micropython-engine`, `rpc-protocol`, `mock-engine`, `url-migration`, `integration-tests`) remain completely untouched.
- Development will occur on a clean feature branch: `refactor/solid-2-migration`.

### 2. Dependency & Tooling Upgrade (Commit 1)
- `apps/editor/package.json`:
  - `solid-js`: `^2.0.3`
  - `@solidjs/web`: `^2.0.3`
  - `@solidjs/vite-plugin`: `^3.0.1` (replaces `vite-plugin-solid`)
  - `@solidjs/testing-library`: `^1.0.0-rc.2` (dist-tag `next`, native Solid 2 peer dependencies)
- `apps/editor/tsconfig.json`:
  - `"jsxImportSource": "@solidjs/web"`
- `apps/editor/vite.config.ts`:
  - Register `resolve.alias: { "solid-js/web": "@solidjs/web" }` to allow `lucide-solid` (which still targets Solid 1 paths internally) to resolve seamlessly.

### 3. Component Prop Contracts & Control Flow (Commit 2)
- Replace all 85 occurrences of `splitProps(props, [...keys])` with `omit(props, ...keys)`.
- Rest props are forwarded via `{...rest}` where `rest = omit(props, "class", "variant", ...)`.
- Component reads use `props.<key>` directly rather than `local.<key>`.
- Hierarchy of refactoring:
  1. `src/components/atoms/*` (30 components)
  2. `src/components/molecules/*` (7 components)
  3. `src/components/organisms/*` (14 components)
  4. `src/components/templates/*` and `src/components/pages/*`
- Replace `<Context.Provider value={value}>` with `<Context value={value}>` across all 7 providers (`EditorContext`, `PopoverContext`, `DropdownContext`, `TabsContext`, `DialogContext`, `PwaContext`, `CommandContext`).
- Replace `<Dynamic component={source} {...rest} />` with `const Comp = dynamic(() => source)` and `<Comp {...rest} />` in `PopoverTrigger`, `DropdownTrigger`, `DropdownItem`, `DropdownRadioItem`, and `DialogTitle`.

### 4. Reactivity & Two-Phase Effects (Commit 3)
- Split all 25 `createEffect` occurrences into:
  - Phase 1 (Compute): Tracked, pure, returns values needed by the effect.
  - Phase 2 (Effect): Untracked, runs side effects (DOM, timers, CodeMirror), returns cleanup function.
- In `CodeField.tsx`, retain 5 separate, granular effects for CodeMirror compartments (appearance, line wrapping, editable/readOnly, language dynamic import, buffer value sync).
- Replace all 19 `onMount(...)` occurrences with `onSettled(...)`.
- Move cleanup logic from effect-local `onCleanup(...)` to the return callback of the effect phase.

### 5. Stores, Control Flow & Error Boundaries (Commit 4)
- Convert store mutations in `SettingsModel` and `EngineSettingsModal` to draft setters (`setSettings((draft) => { ... })`).
- Delete all 8 `batch(...)` calls in `session.ts` and `output.ts`.
- Replace `<ErrorBoundary fallback={(err) => ...}>` in `ConsolePane.tsx` with `<Errored fallback={(err) => ...}>`, reading the error accessor as `err()`.

### 6. Test Suite Adaptation for Staged Writes (Commit 5)
- Domain models will remain purely reactive without artificial internal synchronous caching mirrors.
- Unit tests for domain models (`session.test.ts`, `settings.test.ts`, `output.test.ts`, `overlay.test.ts`, `commands.test.ts`, `editor-core.test.ts`) will import `flush` from `solid-js` and call `flush()` after calling mutating methods before evaluating getter assertions.
- Intermediate commits 1 to 4 will use `LEFTHOOK=0 git commit -m "..."`. Commit 5 will pass standard Lefthook verification with all 698 tests green, clean typecheck, and passing linter.

---

## Testing Decisions

- **Testing Principles**: Tests will evaluate public observable behavior and external contracts (session state, code output, overlay visibility, settings persistence) rather than private signal internals.
- **Modules Tested**:
  - Domain models: `WorkspaceSession`, `SettingsModel`, `OutputModel`, `OverlayModel`, `NotificationModel`, `EngineModel`.
  - Command orchestrator: `EditorCommands` and `createEditorCore`.
  - Component suites across `atoms/`, `molecules/`, `organisms/`, and `pages/`.
- **Prior Art**: 63 existing Vitest test suites configured with `happy-dom` and `@solidjs/testing-library`.

---

## Out of Scope

- Refactoring CodeMirror language loading to `createMemo(async () => ...)` (reserved for Follow-up PR 1).
- Refactoring WebAssembly engine worker initialization to `createMemo(async)` with `<Loading>`/`<Errored>` (reserved for Follow-up PR 2).
- Converting code execution `runCode` to `action(function* () { ... })` with optimistic UI (reserved for Follow-up PR 3).
- Any modifications to packages in `packages/*`.
- Visual styling or design token modifications.

---

## Further Notes

- Solid 2 runtime diagnostics in development mode will catch any untracked reactive reads or writes in owned scopes early.
- Once this foundation PR is merged to main, the three follow-up async PRs will build directly upon this clean Solid 2 baseline.
