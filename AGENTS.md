# Comprehensive documentation

## Overview

This document provides documentation details for each package in the glyphide project, covering the architecture, dependencies, usage guides, and integration points. Glyphide is a monorepo platform that provides tools for arbitrary code execution, utilizing Turborepo for efficient monorepo management.

## Repository Considerations

- The packages `@glyphide/quickjs` (`/packages/quickjs/`) and `@glyphide/app` (`/apps/glyphide/`) are part of the legacy codebase; these should not be touched unless explicitly stated.
- All guidelines detailed here apply to the non-legacy codebase.

## Tech Stack Overview

- **Monorepo Management:** Turborepo with pnpm for pagacke management, including local/remote caching
- **Build System:** Turborepo setup (in progress of consolidation)
- **Testing:** Vitest for unit test, Vitest for integration tests, Playwright for E2E tests (planned)
- **Deployment:** GitHub Pages with GitHub Actions CI/CD

## Packages

### 1. @glyphide/rpc-protocol

Pure JSON-RPC 2.0 protocol contract defining communication for the Glyphide Execution System without engine-specific types.

### 2. @glyphide/orchestrator

Main thread controller managing engine execution, Web Worker lifecycles, and asynchronous promise resolution via RPC messaging.

### 3. @glyphide/mock-engine

A test execution engine designed to validate the RPC protocol and orchestrator behaviors without executing real code.

### 4. @glyphide/quickjs-engine

Production-ready execution engine utilizing QuickJS (via WebAssembly) for safe, synchronous JavaScript evaluation. Replaces the legacy precompiled package.

### 5. @glyphide/integration-tests

Dedicated workspace package for cross-engine integration tests, ensuring correct orchestrated behavior across all implemented engines.

### 6. @glyphide/editor

A SolidJS Single Page Application (SPA) providing the user interface for the code editor.
- **Architecture (EditorCore)**: The application follows a strict horizontal decoupling architecture. The `EditorCore` serves as the central aggregate for all business logic, containing reactive models (`BufferModel`, `EngineModel`, `SettingsModel`, etc.) and storage adapters. UI components MUST NOT maintain global state independently.
- **Unidirectional Data Flow**: The UI must communicate with the core exclusively via the `ActionDispatcher`. UI components capture user intents and dispatch strongly-typed `EditorAction` objects (e.g., `core.dispatcher.dispatch({ type: 'RUN_CODE' })`).
- **Dependency Inversion**: UI components must depend on the core via dependency injection (`useEditor` context). This ensures the UI remains fully testable via mocked contexts.
- **Atomic Design**: It must strictly follow the **Atomic Design methodology** (quarks, atoms, molecules, organisms, templates, pages) to organize UI components, ensuring a highly modular and maintainable frontend architecture.
- **Compound Primitives vs Opinionated Atoms**: UI structures that require flexible composition, internal context sharing, and modular layouts (e.g., Modals, Tooltips, Accordions) MUST be developed agnostically using the **Compound Component pattern** (Root, Trigger, Portal, Content). However, highly opinionated primitives that impose strict hierarchies and manage atomic state or have standard HTML counterparts (e.g., Buttons, Switches, Icons, Inputs) are exempt and should be developed as standalone components.

## CI/CD & Infraestructure

### GitHub Actions

- **checks.yml**: Automated testing, linting, and typechecking.
- **release.yml**: Automatic deployment to GitHub Pages on merge to `master`.

### Build System

- **Turborepo**: Primary build system with caching
- **pnpm**: Package management with workspaces

## Development Guidelines for Agentic Coding

### 1. Build, Lint, and Quality Commands

Always run these commands from the root directory using `pnpm`.

- **Build Everything**: `pnpm build`
- **Build Package**: `turbo build --filter=@magicappdev/<package-name>`
- **Format & Linting Code**: `pnpm lint`
- **Fix Format & Linting**: `pnpm lint:fix`
- **Testing**: `pnpm test`
- **Typecheck All**: `pnpm typecheck`

### 2. Code Style Guidelines

#### Formatting (Biome)

Adhere to the `.editorconfig` configuration:

- **Width**: 80 characters
- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: Required
- **Quotes**: Double quotes
- **Trailing Commas**: All (arrays, objects, imports)
- **Arrow Functions**: Avoid parentheses for single parameters (`x => x`)

#### Imports & Modules

- **Organization**: Imports are automatically sorted (External > Workspace > Relative).
- **Workspace Packages**: Use `@glyphide/` prefix for internal dependencies.
- **No Barrel Files**: Avoid using barrel files. Export directly from the module.
- **Package-scoped Dependencies**: Install dependencies strictly within the `package.json` of the package that requires them. The root `package.json` is reserved exclusively for monorepo management tools (e.g., Turborepo, Biome, Lefthook).

#### UI, Tailwind & CSS (Strict Rules)

- **No Custom Classes**: Avoid creating custom CSS classes or styles in TypeScript files.
- **No Magic Values**: Avoid using Tailwind arbitrary properties (e.g. `bg-[#000000]`). Use theme tokens instead.
- **Component-Driven Styling**: Visual structures must be defined directly in the components using Tailwind utilities, rather than creating external `.css` class names.
- **Variant Authority**: The use of the `cn` (clsx + tailwind-merge) helper and `class-variance-authority` (CVA) is **mandatory** for managing UI component variants.

#### TypeScript & Types

- **Strict Mode**: `strict: true` is enabled. Avoid `any` unless absolutely necessary.
- **Inference**: Use Type Inference for local variables.
- **Interfaces**: Prefer `interface` for public APIs and props.
- **Utility Types**: Use `Record<string, unknown>` for generic objects instead of `object` or `any`.
- **No Enums**: Avoid the use of enums. Use JavaScript objects or TypeScript unions instead.

#### Comments

- **Minimalism**: Write self-documenting code. Use comments only for "why", not "what".
- **TSDoc**: Do not over-document trivial implementations. TSDoc usage is strictly MANDATORY for:
  1. All base exported methods, interfaces, type aliases, and module entry points.
  2. Pure functions handling complex domain logic or state mutations.
  3. Custom protocol implementations or parsers where the "why" or the specific input/output shapes are not immediately obvious from standard syntax.
  TSDoc blocks must be concise, explaining the core intent, edge cases, and side effects, without narrating the code line by line.
  
### 3. Testing and Quality Assurance

- **Framework**: Vitest is used for unit and integration tests.
- **Execution**: Run `pnpm test` to execute all tests in the workspace.
- **Continuous Integration**: GitHub Actions runs linting, typechecking, and tests on every push.
- **Pre-commit Workflow**: Lefthook ensure code quality before commits.