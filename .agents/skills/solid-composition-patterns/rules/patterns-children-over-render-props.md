---
title: Prefer Composing Children Over Render Props
impact: MEDIUM
impactDescription: cleaner composition and natural JSX ergonomics
tags: composition, children, render-props, solidjs
---

## Prefer Children Over Render Props

Use `children` for structural composition instead of `renderX` function props. Composing child elements is more readable, composes naturally with Solid's fine-grained reactivity, and eliminates cumbersome callback parameter signatures.

**Incorrect (render props for static structural sections):**

```tsx
function Composer(props: {
  renderHeader?: () => JSX.Element
  renderFooter?: () => JSX.Element
  renderActions?: () => JSX.Element
}) {
  return (
    <form>
      {props.renderHeader?.()}
      <Input />
      {props.renderFooter ? props.renderFooter() : <DefaultFooter />}
      {props.renderActions?.()}
    </form>
  )
}
```

**Correct (compound components with children):**

```tsx
import type { ParentProps } from 'solid-js'

function ComposerFrame(props: ParentProps) {
  return <form>{props.children}</form>
}

function ComposerFooter(props: ParentProps) {
  return <footer class="flex items-center gap-2">{props.children}</footer>
}

// Ergonomic, declarative JSX composition:
return (
  <Composer.Frame>
    <CustomHeader />
    <Composer.Input />
    <Composer.Footer>
      <Composer.Formatting />
      <Composer.Emojis />
      <SubmitButton />
    </Composer.Footer>
  </Composer.Frame>
)
```

**When render props or `<For>` are appropriate:**
In SolidJS, use render callbacks primarily when data iterators or virtualized lists need to supply item instances to child rows (e.g. `<For each={items()}>{(item) => <ItemCard item={item} />}</For>`). For structural layouts, always prefer `children`.
