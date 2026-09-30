---
name: solid-composition-patterns
description:
  SolidJS component composition patterns that scale. Use when refactoring components with
  boolean prop proliferation, building flexible component libraries, designing reusable APIs,
  or implementing compound components with SolidJS reactivity invariants (splitProps, children()
  helper, avoiding prop destructuring).
license: MIT
metadata:
  author: Pedro Carreño
  originalAuthor: Vercel Labs
  forkedFrom: https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns
  version: '1.0.0'
---

# SolidJS Composition Patterns

Composition patterns for building flexible, maintainable SolidJS components. Avoid boolean prop proliferation by using compound components, lifting state into providers, and composing internals. These patterns ensure components remain ergonomic while strictly honoring Solid's fine-grained reactivity.

## When to Apply

Reference these guidelines when:

- Refactoring components with multiple boolean flags
- Building reusable UI component libraries (design systems)
- Designing flexible compound component APIs (Root, Trigger, Content)
- Reviewing component architecture for prop drilling or hidden conditional branching
- Working with SolidJS context providers and dependency injection

## Rule Categories by Priority

| Priority | Category                    | Impact   | Prefix          |
| -------- | --------------------------- | -------- | --------------- |
| 1        | SolidJS Reactivity & Props  | CRITICAL | `solid-`        |
| 2        | Component Architecture      | HIGH     | `architecture-` |
| 3        | State Management            | MEDIUM   | `state-`        |
| 4        | Implementation Patterns     | MEDIUM   | `patterns-`     |

## Quick Reference

### 1. SolidJS Reactivity & Props (CRITICAL)

- `solid-preserve-reactivity` - Never destructure `props`; use `props.propName` or `splitProps`. Wrap dynamic children with `children(() => props.children)`. Pass `ref` directly as a standard prop.

### 2. Component Architecture (HIGH)

- `architecture-avoid-boolean-props` - Do not add boolean props to customize behavior; use composition.
- `architecture-compound-components` - Structure complex components with shared context (`createContext`/`useContext`).

### 3. State Management (MEDIUM)

- `state-decouple-implementation` - The provider is the only place that knows how state is managed (signals, stores, RPC).
- `state-context-interface` - Define a generic interface (`state`, `actions`, `meta`) for dependency injection.
- `state-lift-state` - Move state into provider components so sibling and parent components can access it.

### 4. Implementation Patterns (MEDIUM)

- `patterns-explicit-variants` - Create explicit variant components instead of boolean modes.
- `patterns-children-over-render-props` - Use `children` for structural composition instead of `renderX` props.

## How to Use

Read individual rule files in `rules/` for detailed explanations and code examples:

```
rules/solid-preserve-reactivity.md
rules/architecture-avoid-boolean-props.md
rules/architecture-compound-components.md
rules/state-context-interface.md
```

## Full Compiled Document

For the complete guide with all rules expanded in one document: `AGENTS.md`
