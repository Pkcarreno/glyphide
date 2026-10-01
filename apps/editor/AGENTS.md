# @glyphide/editor

SolidJS Single Page Application (SPA) providing the user interface for the Glyphide code editor.

## Architecture: EditorCore

- **Horizontal Decoupling**: `EditorCore` is the central aggregate for all business logic, containing reactive domain models (`EngineModel`, `SessionModel`, `SettingsModel`, `OverlayModel`, etc.) and storage adapters. UI components must not maintain global state independently.
- **Commands & Model Access**: The UI communicates with the core via direct domain calls:
  - **Commands (`core.commands.*`)**: Use for cross-model orchestration and multi-step workflows (e.g. `runCode`, `interruptExecution`, `loadFile`, `resetProjectState`, `retryEngineInit`, `selectEngine`, `updateBuffer`, `downloadBufferToFile`, `grantTrust`).
  - **Domain Models**: Use direct methods on models for atomic 1:1 operations and state queries (e.g. `core.overlays.open`, `core.output.clearEntries`, `core.notifications.dismissToast`, `core.session.setProjectName`).
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
