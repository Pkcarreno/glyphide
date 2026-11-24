# 01: Solid 2.0 Foundation Migration

**What to build:**
Upgrade `apps/editor` to SolidJS 2.0.3, `@solidjs/web` 2.0.3, `@solidjs/vite-plugin` 3.0.1, and `@solidjs/testing-library` 1.0.0-rc.2. Adapt all mandatory syntax changes (replace `splitProps` with `omit`, split `createEffect` into compute/effect phases, replace `onMount` with `onSettled`, update store setters to draft mutations, remove `batch()`, and adapt test suites for staged writes with `flush()`), bringing all 698 tests to green with zero regressions on existing application behavior.

**Blocked by:** None (can start immediately).

**Tracker Issue:** https://github.com/Pkcarreno/glyphide/issues/251

**Status:** ready-for-agent

- [ ] Upgrade runtime packages to `solid-js` 2.0.3, `@solidjs/web` 2.0.3, `@solidjs/vite-plugin` 3.0.1, and `@solidjs/testing-library` 1.0.0-rc.2.
- [ ] Configure `"jsxImportSource": "@solidjs/web"` in `tsconfig.json` and alias `"solid-js/web": "@solidjs/web"` in `vite.config.ts` for `lucide-solid`.
- [ ] Migrate all 85 UI components from `splitProps` to `omit`, accessing properties directly on `props`.
- [ ] Replace `<Context.Provider value={...}>` with `<Context value={...}>` and `<Dynamic>` with `dynamic()`.
- [ ] Refactor all 25 `createEffect` calls into two-phase (compute/effect) functions and replace 19 `onMount` calls with `onSettled`.
- [ ] Convert `SettingsModel` and modal store setters to direct draft mutations, and remove all 8 `batch()` calls.
- [ ] Replace `<ErrorBoundary>` with `<Errored>` in `ConsolePane.tsx`.
- [ ] Adapt model unit tests with `flush()` to synchronize microtask-staged writes.
- [ ] All 63 test suites (698 tests), typecheck, and lint pass cleanly.
