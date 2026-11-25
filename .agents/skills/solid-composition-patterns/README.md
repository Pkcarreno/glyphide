# Solid 2.0 Composition Patterns

A structured guide for Solid 2.0 component composition patterns that scale. These patterns eliminate boolean prop proliferation through compound components, isolate reactive state and optimistic mutations inside providers, coordinate async loading and error boundaries, and strictly honor Solid 2.0 fine-grained reactivity.

## Structure

- `SKILL.md` — Skill entry point and context-pointer index
- `rules/` — Individual rule files loaded on demand
  - `_sections.md` — Section metadata (ordering, impact levels, descriptions)
  - `_template.md` — Template for authoring rules
  - **1. Solid 2.0 Reactivity & Primitives (`solid-`, CRITICAL)**
    - `solid-props-and-children.md` — Proxy props, `omit`, `merge`, component prop types, and `children()`
    - `solid-context-and-refs.md` — Direct `<Ctx value={...}>` providers, `null` optional contexts, and `ref` arrays / directive factories
    - `solid-dynamic-and-lists.md` — `dynamic()`, `dynamicComponent()`, `<For keyed={...}>`, and `<Repeat>`
  - **2. Component Architecture (`architecture-`, HIGH)**
    - `architecture-avoid-boolean-props.md` — Avoiding combinatorial boolean flags
    - `architecture-compound-components.md` — Compound component namespaces wired via Solid context
  - **3. Async Composition & Boundaries (`async-`, HIGH)**
    - `async-fetch-high-block-low.md` — Passing getters down and isolating waits/errors with `<Loading>`, `<Errored>`, and `<Reveal>`
    - `async-holds-and-verdicts.md` — Graph holds, `isPending`, `latest`, and `createDeferred`
  - **4. State & Mutation Injection (`state-`, MEDIUM)**
    - `state-context-interface.md` — Generic `{ state, actions, meta }` context contracts
    - `state-decouple-implementation.md` — Encapsulating signals, stores, projections, and optimistic `action`s in providers
    - `state-lift-state.md` — Lifting state into provider boundaries without render penalties
  - **5. Implementation Patterns (`patterns-`, MEDIUM)**
    - `patterns-explicit-variants.md` — Explicit variant components
    - `patterns-children-over-render-props.md` — Structural `children` composition over `renderX` props
- `metadata.json` — Skill metadata
- `LICENSE` — MIT License with dual attribution

## Core Principles

1. **Preserve Proxy Reactivity** — Read `props.field`, forward rest props with `omit`, compose defaults with `merge`, and memoize dynamic `children` with `children()`.
2. **Compose Over Configuration** — Expose compound subcomponents and explicit variants instead of boolean mode flags.
3. **Fetch High, Block Low** — Pass async `createMemo` getters via props and place `<Loading>`, `<Errored>`, and `<Reveal>` where content actually suspends or fails.
4. **Lift State & Mutations into Providers** — Isolate `createSignal`, draft-first `createStore`, `createProjection`, and `action` + `createOptimistic*` behind a `{ state, actions, meta }` context contract.

## Attribution & Lineage

This skill was originally forked and adapted from [`composition-patterns`](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) by **Vercel Labs**, and rebuilt from scratch for **Solid 2.0**.

- **Original Work**: Copyright (c) 2026 Vercel, Inc. (Licensed under MIT).
- **Solid 2.0 Adaptation**: Copyright (c) 2026 Pedro Carreño.
