# SolidJS Composition Patterns

A structured guide for SolidJS composition patterns that scale. These patterns help avoid boolean prop proliferation by using compound components, lifting state into providers, and composing internals while strictly respecting Solid's fine-grained reactivity.

## Structure

- `rules/` - Individual rule files (one per rule)
  - `_sections.md` - Section metadata (titles, impacts, descriptions)
  - `_template.md` - Template for creating new rules
  - `solid-preserve-reactivity.md` - Fine-grained reactivity and prop handling invariants
  - `architecture-avoid-boolean-props.md` - Avoiding combinatorial boolean flags
  - `architecture-compound-components.md` - Compound component architecture with Solid context
  - `state-context-interface.md` - Context interfaces for dependency injection
  - `state-decouple-implementation.md` - Isolating state logic in providers
  - `state-lift-state.md` - Lifting state without render penalties
  - `patterns-explicit-variants.md` - Creating explicit variant components
  - `patterns-children-over-render-props.md` - Composing children over render callbacks
- `metadata.json` - Document metadata
- **`AGENTS.md`** - Compiled reference for AI agents
- **`SKILL.md`** - Skill entry point for agent orchestration
- **`LICENSE`** - MIT License with dual attribution

## Core Principles

1. **Preserve Fine-Grained Reactivity** — Never destructure `props`. Use `props.field` or `splitProps`. Wrap dynamic children in `children(() => props.children)`.
2. **Composition over configuration** — Instead of boolean toggles, let consumers compose subcomponents.
3. **Lift your state into providers** — Provide reactive signals/stores at the provider level; components do not re-render.
4. **Compose your internals** — Subcomponents access context, avoiding prop drilling.
5. **Explicit variants** — Create `ThreadComposer`, `EditComposer` instead of a monolithic `Composer` with multiple mode flags.

## Attribution & Lineage

This skill is a direct fork and adaptation of [`composition-patterns`](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) by **Vercel Labs**.

- **Original Work**: Copyright (c) 2026 Vercel, Inc. (Licensed under MIT).
- **SolidJS Adaptation**: Copyright (c) 2026 Pedro Carreño.
- **Key Modifications**: Translated React hooks and virtual DOM assumptions into SolidJS fine-grained reactivity invariants (`splitProps`, `children()` helper, direct un-destructured proxy props, and signal/store context dependency injection).
