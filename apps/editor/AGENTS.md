# @glyphide/editor

SolidJS Single Page Application (SPA) providing the user interface for the Glyphide code editor.

## Architecture: EditorCore

- **Horizontal Decoupling**: `EditorCore` is the central aggregate for all business logic, containing reactive domain models (`BufferModel`, `EngineModel`, `SettingsModel`) and storage adapters. UI components must not maintain global state independently.
- **Unidirectional Data Flow**: The UI communicates with the core exclusively via the `ActionDispatcher`. UI components capture user intents and dispatch strongly-typed `EditorAction` objects (e.g. `core.dispatcher.dispatch({ type: 'RUN_CODE' })`).
- **Dependency Inversion**: UI components access the core via dependency injection (`useEditor` context hook).

## Component Architecture & Reactivity

- Organize components under `src/components/{atoms,molecules,organisms,templates,pages}` applying the `atomic-design-fundamentals` skill.
- Build flexible and compound UI components applying the `solid-composition-patterns` skill for composition and SolidJS reactivity invariants.

## Styling & Design Tokens

- Style components using Tailwind CSS utility classes. Avoid custom CSS classes or arbitrary magic values.
- Manage component variants with `class-variance-authority` (CVA) and merge class names using the `cn` helper (`helpers/cn.ts`, powered by `cnfast`).
- **Typography**:
  - Sans-serif (`IBM Plex Sans`) is strictly for UI elements (status bar, menus, tabs).
  - Monospace (`IBM Plex Mono`) is strictly for code buffers, terminal output, and exact-alignment inputs.
  - Base UI text is 14px (`0.875rem`); metadata and keyboard shortcuts are 12px (`0.75rem`).
