---
title: Preserve Reactivity in Composed Components
impact: CRITICAL
impactDescription: prevents reactivity loss and broken signal tracking
tags: solidjs, reactivity, props, children, splitProps
---

## Preserve Reactivity in Composed Components

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
  // Separate local props from forwarded props without breaking getters
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

**Incorrect (multiple reads of dynamic props.children):**

```tsx
// If children contains dynamic expressions or components,
// accessing props.children multiple times re-evaluates them!
function Panel(props: ParentProps) {
  return (
    <div>
      {props.children ? <Header /> : null}
      <main>{props.children}</main>
    </div>
  )
}
```

**Correct (memoize with children helper):**

```tsx
import { children, type ParentProps } from 'solid-js'

function Panel(props: ParentProps) {
  const resolved = children(() => props.children)
  return (
    <div>
      {resolved() ? <Header /> : null}
      <main>{resolved()}</main>
    </div>
  )
}
```

In SolidJS, compound components must honor proxy getters across the entire hierarchy.
