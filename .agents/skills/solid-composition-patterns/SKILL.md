---
name: solid-composition-patterns
description:
  Solid 2.0 component composition patterns. Use when refactoring boolean-flag components,
  building compound components or UI libraries, designing context state contracts, wiring
  async boundaries (Loading, Errored, Reveal, isPending, latest), or preserving reactivity
  with proxy props, omit/merge, children(), refs, For, and Repeat.
license: MIT
metadata:
  author: Pedro Carreño
  originalAuthor: Vercel Labs
  forkedFrom: https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns
  version: '2.0.0'
---

# Solid 2.0 Composition Patterns

Composition patterns for scalable Solid 2.0 components. Replace combinatorial boolean props with compound components, lift reactive state and transactional mutations into providers, isolate async waits behind boundaries, and preserve fine-grained proxy reactivity end-to-end.

## When to Apply

Load matching rules from `rules/` when:

- Handling component `props`, `children`, `refs`, context, lists, or dynamic components
- Refactoring boolean-flag components or building compound UI primitives
- Placing `<Loading>`, `<Errored>`, `<Reveal>`, `isPending`, or `latest` across a component tree
- Designing `{ state, actions, meta }` provider contracts with signals, stores, projections, or optimistic `action`s

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
| --- | --- | --- | --- |
| 1 | Solid 2.0 Reactivity & Primitives | CRITICAL | `solid-` |
| 2 | Component Architecture | HIGH | `architecture-` |
| 3 | Async Composition & Boundaries | HIGH | `async-` |
| 4 | State & Mutation Injection | MEDIUM | `state-` |
| 5 | Implementation Patterns | MEDIUM | `patterns-` |

## Rules Index

Read the rule files matching your task branch and apply every relevant invariant before finishing:

### 1. Solid 2.0 Reactivity & Primitives (CRITICAL)

- [rules/solid-props-and-children.md](rules/solid-props-and-children.md) — Read when accepting, forwarding, merging, or typing component props and `children` (`props.x`, `omit`, `merge`, `ParentProps`/`FlowProps`/`VoidProps`, `children()`).
- [rules/solid-context-and-refs.md](rules/solid-context-and-refs.md) — Read when creating/consuming context (`<Ctx value={...}>`, `ContextNotFoundError`, `null` optional contexts) or composing DOM `ref` arrays and directive factories.
- [rules/solid-dynamic-and-lists.md](rules/solid-dynamic-and-lists.md) — Read when rendering dynamic components/tags (`dynamic`, `dynamicComponent`) or lists (`<For keyed={...}>`, `<Repeat>`).

### 2. Component Architecture (HIGH)

- [rules/architecture-avoid-boolean-props.md](rules/architecture-avoid-boolean-props.md) — Read when a component accumulates mode or visibility boolean flags.
- [rules/architecture-compound-components.md](rules/architecture-compound-components.md) — Read when structuring multi-part components (`Root`, `Frame`, `Input`, `Submit`) over shared context.

### 3. Async Composition & Boundaries (HIGH)

- [rules/async-fetch-high-block-low.md](rules/async-fetch-high-block-low.md) — Read when passing async `createMemo` data through component trees and placing `<Loading>`, `<Errored>`, and `<Reveal>`.
- [rules/async-holds-and-verdicts.md](rules/async-holds-and-verdicts.md) — Read when surfacing pending UI states (`isPending`, `latest`, `createDeferred`) during held updates without unmounting settled content.

### 4. State & Mutation Injection (MEDIUM)

- [rules/state-context-interface.md](rules/state-context-interface.md) — Read when defining `{ state, actions, meta }` contracts for dependency-injected component state.
- [rules/state-decouple-implementation.md](rules/state-decouple-implementation.md) — Read when isolating `createSignal`, `createStore`, `createProjection`, or `action` + `createOptimistic*` inside a provider.
- [rules/state-lift-state.md](rules/state-lift-state.md) — Read when sibling or ancestor components outside a visual frame need shared state or actions.

### 5. Implementation Patterns (MEDIUM)

- [rules/patterns-explicit-variants.md](rules/patterns-explicit-variants.md) — Read when defining dedicated variant components instead of multi-mode configurations.
- [rules/patterns-children-over-render-props.md](rules/patterns-children-over-render-props.md) — Read when choosing `children` over `renderX` props for structural layout composition.
