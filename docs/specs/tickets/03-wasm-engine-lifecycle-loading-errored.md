# 03: Declarative WASM Engine Lifecycle with Loading and Errored Boundaries

**What to build:**
Transform WebAssembly engine initialization (QuickJS and MicroPython) and worker lifecycle management in `engine.ts` into a declarative async computation. Replace manual status state machines (`idle` / `initializing` / `ready` / `error`) with held updates, binding UI spinners directly to `isPending(engine)`, providing `<Loading>` fallbacks, and handling worker/WASM failures through `<Errored>` boundaries with native `refresh(engine)` retries.

**Blocked by:**
- 01: Solid 2.0 Foundation Migration (#251)

**Tracker Issue:** https://github.com/Pkcarreno/glyphide/issues/253

**Status:** ready-for-agent

- [ ] `EngineModel` initializes workers and compiles WASM as an async computation.
- [ ] Engine switches hold the current UI state until the target engine worker confirms readiness.
- [ ] `StatusBar` and `EngineSelectorCommand` spinners derive their pending state from `isPending`.
- [ ] Engine initialization failures route to `<Errored>` boundaries with a working retry action via `refresh`.
- [ ] Zero manual status synchronization flags remain in `createEngineModel`.
