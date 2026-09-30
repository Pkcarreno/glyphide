# Repository Guide

## Monorepo Architecture

- `apps/editor`: SolidJS web IDE (UI layer, buffer state, execution UI, layouts).
- `packages/orchestrator`: Main-thread runner controller, worker lifecycles, and RPC broker.
- `packages/quickjs-engine`: WebAssembly QuickJS execution engine for JavaScript.
- `packages/micropython-engine`: WebAssembly MicroPython execution engine for Python.
- `packages/rpc-protocol`: Pure JSON-RPC 2.0 protocol contracts (engine-agnostic).
- `packages/mock-engine`: Headless in-memory test engine for protocol validation.
- `packages/url-migration`: State serialization, compression, and URL migration utilities.
- `packages/integration-tests`: Cross-package integration and security test suites.

## Commands

Run all tasks through `pnpm` scripts from `package.json`. Do not invoke raw CLI binaries directly:
- **Validation**: `pnpm lint`, `pnpm lint:fix`, `pnpm typecheck`, `pnpm test`
- **Build & Dev**: `pnpm build`, `pnpm dev`, `pnpm preview`
- **Quality**: `pnpm knip`
- Always verify changes with `pnpm typecheck`, `pnpm test`, and `pnpm lint` before marking any code task as done.

## Conventions

### Code & Documentation
- Write all code, identifiers, comments, documentation, and git commits in English.
- Apply the `semantic-code-naming` skill for identifier naming and grammar (A/HC/LC, positive boolean prefixes).
- Apply the `asd-ste100` skill for technical prose (TSDoc, error messages, documentation).
- Comments must explain the rationale (*why*), never obvious mechanics (*what*).
- Provide TSDoc for exported APIs, module contracts, and complex logic only. Skip TSDoc for self-evident code.
- Annotate intentional public library exports with `/** @public */` for Knip detection.

### Structure & Modules
- Import directly from module files; avoid barrel files (`index.ts`).
- Colocate tests next to the source file using `.test.ts` (e.g. `parser.ts` → `parser.test.ts`).
- Prefer TypeScript `interface` for public module contracts and component props.
- Consult the `typescript-advanced-types` skill when designing complex generics, mapped types, or utility types.
- Install dependencies strictly within the `package.json` of the package that requires them.

### Architecture & Local Context
- Each package and application maintains its domain rules and architecture in its local `AGENTS.md`. Consult the local `AGENTS.md` before making changes within any subpath.
