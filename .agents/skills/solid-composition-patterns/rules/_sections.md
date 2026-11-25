# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Solid 2.0 Reactivity & Primitives (solid)

**Impact:** CRITICAL  
**Description:** Essential Solid 2.0 invariants for proxy props (`omit`, `merge`, component prop types, `children()`), context components, `ref` arrays and directive factories, `dynamic()`, `<For>`, and `<Repeat>`.

## 2. Component Architecture (architecture)

**Impact:** HIGH  
**Description:** Structural patterns for eliminating boolean prop proliferation and composing multi-part UI over shared Solid 2.0 context.

## 3. Async Composition & Boundaries (async)

**Impact:** HIGH  
**Description:** Patterns for passing async getters through component trees, isolating waits and errors with `<Loading>`, `<Errored>`, and `<Reveal>`, and exposing `isPending` / `latest` feedback during graph holds.

## 4. State & Mutation Injection (state)

**Impact:** MEDIUM  
**Description:** Patterns for defining `{ state, actions, meta }` contracts, decoupling signals, stores, projections, and optimistic `action`s behind providers, and lifting state across sibling and ancestor boundaries.

## 5. Implementation Patterns (patterns)

**Impact:** MEDIUM  
**Description:** Specific techniques for explicit variant components and structural `children` composition over render callbacks.
