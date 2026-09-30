# SolidJS Composition Patterns

**Version 1.0.0**  
Engineering  
September 2026

> **Note:**  
> Guidelines for building and refactoring SolidJS components using compound patterns, lifted state, and fine-grained reactivity invariants.

---

## Abstract

Composition patterns for building flexible, maintainable SolidJS components. Avoid boolean prop proliferation by using compound components, lifting state into providers, and composing internals while strictly honoring Solid's fine-grained reactivity.

---

## Table of Contents

1. [SolidJS Reactivity & Props](#1-solidjs-reactivity--props) — **CRITICAL**
   - 1.1 [Preserve Reactivity in Composed Components](#11-preserve-reactivity-in-composed-components)
2. [Component Architecture](#2-component-architecture) — **HIGH**
   - 2.1 [Avoid Boolean Prop Proliferation](#21-avoid-boolean-prop-proliferation)
   - 2.2 [Use Compound Components](#22-use-compound-components)
3. [State Management](#3-state-management) — **MEDIUM**
   - 3.1 [Define Generic Context Interfaces for Dependency Injection](#31-define-generic-context-interfaces-for-dependency-injection)
   - 3.2 [Decouple State Management from UI](#32-decouple-state-management-from-ui)
   - 3.3 [Lift State into Provider Components](#33-lift-state-into-provider-components)
4. [Implementation Patterns](#4-implementation-patterns) — **MEDIUM**
   - 4.1 [Create Explicit Component Variants](#41-create-explicit-component-variants)
   - 4.2 [Prefer Composing Children Over Render Props](#42-prefer-composing-children-over-render-props)

---

## 1. SolidJS Reactivity & Props

**Impact: CRITICAL**

Essential invariants for preserving Fine-Grained Reactivity in SolidJS composition.

### 1.1 Preserve Reactivity in Composed Components

**Impact: CRITICAL (prevents broken reactive tracking)**

SolidJS relies on runtime property getters on the `props` proxy object to track dependencies. Destructuring `props` in component arguments or function bodies strips getters and permanently breaks reactivity.

**Core principles:**
1. **Never destructure props directly**: Access via `props.field` or use `splitProps`.
2. **Memoize dynamic children**: Use `children(() => props.children)` from `solid-js` when reading or manipulating children.
3. **Merge defaults safely**: Use `mergeProps` from `solid-js` instead of ES6 default parameter destructuring.
4. **Direct refs**: `ref` is a standard prop in SolidJS. Bind elements directly (`let inputRef!: HTMLInputElement; <input ref={inputRef} />`) or forward `props.ref` to DOM elements without wrapper objects.

**Incorrect (destructuring destroys reactivity):**

```tsx
// Reactivity is immediately lost when channelId changes!
function ThreadComposer({ channelId, children }: Props) {
  return (
    <Composer.Frame>
      <AlsoSendToChannelField id={channelId} />
      {children}
    </Composer.Frame>
  )
}
```

**Correct (access props directly or use splitProps):**

```tsx
import { splitProps, children, type ParentProps } from 'solid-js'

interface ThreadComposerProps {
  channelId: string
}

function ThreadComposer(props: ParentProps<ThreadComposerProps>) {
  const [local, others] = splitProps(props, ['channelId', 'children'])
  const resolvedChildren = children(() => local.children)

  return (
    <Composer.Frame {...others}>
      <AlsoSendToChannelField id={local.channelId} />
      {resolvedChildren()}
    </Composer.Frame>
  )
}
```

---

## 2. Component Architecture

**Impact: HIGH**

Fundamental patterns for structuring components to avoid prop proliferation and enable flexible composition.

### 2.1 Avoid Boolean Prop Proliferation

**Impact: CRITICAL (prevents unmaintainable component variants)**

Do not add boolean flags like `isThread`, `isEditing`, or `isDMThread` to customize component behavior. Every boolean prop doubles the possible state space and introduces unmaintainable conditional branching. Use composition instead.

**Incorrect (boolean props create combinatorial complexity):**

```tsx
function Composer(props: Props) {
  return (
    <form>
      <Header />
      <Input />
      {props.isDMThread ? (
        <AlsoSendToDMField id={props.dmId} />
      ) : props.isThread ? (
        <AlsoSendToChannelField id={props.channelId} />
      ) : null}
      {props.isEditing ? (
        <EditActions />
      ) : props.isForwarding ? (
        <ForwardActions />
      ) : (
        <DefaultActions />
      )}
      <Footer onSubmit={props.onSubmit} />
    </form>
  )
}
```

**Correct (explicit composition eliminates conditionals):**

```tsx
// Channel composer
function ChannelComposer() {
  return (
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <Composer.Footer>
        <Composer.Attachments />
        <Composer.Formatting />
        <Composer.Emojis />
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  )
}

// Thread composer
function ThreadComposer(props: { channelId: string }) {
  return (
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <AlsoSendToChannelField id={props.channelId} />
      <Composer.Footer>
        <Composer.Formatting />
        <Composer.Emojis />
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  )
}
```

### 2.2 Use Compound Components

**Impact: HIGH (enables flexible composition without prop drilling)**

Structure complex components as compound components with a shared context. Each subcomponent accesses shared reactive state via Solid's `createContext` and `useContext`, not prop drilling. Consumers compose only the pieces they need.

**Correct (compound components with SolidJS shared context):**

```tsx
import { createContext, useContext, type ParentProps, type Accessor } from 'solid-js'

export interface ComposerContextValue {
  state: {
    input: Accessor<string>
  }
  actions: {
    setInput: (val: string) => void
    submit: () => void
  }
  meta: {
    inputRef?: (el: HTMLInputElement) => void
  }
}

const ComposerContext = createContext<ComposerContextValue | undefined>(undefined)

export function useComposer() {
  const ctx = useContext(ComposerContext)
  if (!ctx) throw new Error('useComposer must be used within Composer.Provider')
  return ctx
}

function ComposerProvider(props: ParentProps<{ value: ComposerContextValue }>) {
  return (
    <ComposerContext.Provider value={props.value}>
      {props.children}
    </ComposerContext.Provider>
  )
}

function ComposerFrame(props: ParentProps) {
  return <form>{props.children}</form>
}

function ComposerInput() {
  const { state, actions, meta } = useComposer()
  return (
    <input
      ref={meta.inputRef}
      value={state.input()}
      onInput={(e) => actions.setInput(e.currentTarget.value)}
    />
  )
}

function ComposerSubmit() {
  const { actions } = useComposer()
  return <button type="button" onClick={actions.submit}>Send</button>
}

export const Composer = {
  Provider: ComposerProvider,
  Frame: ComposerFrame,
  Input: ComposerInput,
  Submit: ComposerSubmit,
  Header: ComposerHeader,
  Footer: ComposerFooter,
}
```

---

## 3. State Management

**Impact: MEDIUM**

Patterns for lifting state and managing shared context across composed components with dependency injection.

### 3.1 Define Generic Context Interfaces for Dependency Injection

**Impact: HIGH (enables dependency-injectable state across use-cases)**

Define a generic contract for your context (`state`, `actions`, `meta`). Different providers can implement this contract using local signals, global stores, or server sync layers while the composed UI remains unchanged.

### 3.2 Decouple State Management from UI

**Impact: MEDIUM (enables swapping state implementations without touching UI)**

The provider component is the only place aware of state wiring. UI subcomponents depend exclusively on the generic context interface.

### 3.3 Lift State into Provider Components

**Impact: MEDIUM (allows sibling and parent access without visual coupling)**

Components needing shared state only need to be enclosed within the same provider boundary. In SolidJS, lifting state has zero re-render overhead because updates are fine-grained to reactive signal bindings.

---

## 4. Implementation Patterns

**Impact: MEDIUM**

Specific techniques for ergonomic component APIs.

### 4.1 Create Explicit Component Variants

**Impact: MEDIUM (self-documenting code, no hidden conditionals)**

Build explicit variant components (`ThreadComposer`, `EditMessageComposer`) rather than a single component with multiple boolean mode flags.

### 4.2 Prefer Composing Children Over Render Props

**Impact: MEDIUM (cleaner composition and natural JSX ergonomics)**

Use `children` for structural layout composition. Reserve render callbacks or `<For>` primarily for data-driven list iteration where parent containers supply item data to child rows.
