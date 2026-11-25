---
title: Prefer Composing Children Over Render Props
impact: MEDIUM
impactDescription: preserves natural JSX composition and clean ParentProps/FlowProps contracts
tags: composition, children, render-props, typescript, solidjs
---

## Prefer Composing Children Over Render Props

Use `children` (`ParentProps` or `FlowProps`) for structural layout slots instead of `renderHeader` / `renderFooter` / `renderActions` callback props. Declarative child trees compose naturally with Solid's fine-grained reactivity, `<Loading>`, and `<Errored>` boundaries without callback indirection.

**Incorrect (render props for static structural sections):**

```tsx
import type { JSX } from '@solidjs/web';

function Composer(props: {
  renderHeader?: () => JSX.Element;
  renderFooter?: () => JSX.Element;
  renderActions?: () => JSX.Element;
}) {
  return (
    <form>
      {props.renderHeader?.()}
      <Composer.Input />
      {props.renderFooter ? props.renderFooter() : <DefaultFooter />}
      {props.renderActions?.()}
    </form>
  );
}
```

**Correct (compound components accepting `ParentProps` / `FlowProps`):**

```tsx
import type { FlowProps, ParentProps } from 'solid-js';
import type { JSX } from '@solidjs/web';

function ComposerFrame(props: ParentProps) {
  return <form>{props.children}</form>;
}

function ComposerFooter(props: FlowProps<{}, JSX.Element>) {
  return <footer class="flex items-center gap-2">{props.children}</footer>;
}

// Declarative JSX composition at call sites:
function CustomComposer() {
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
  );
}
```

Reserve render callbacks for data-providing control flow and boundaries (`<For>`, `<Repeat>`, `<Show>`, `<Match>`, and `<Errored fallback={(err, reset) => ...}>`) that pass item accessors, indexes, or error/reset arguments to children.

Reference: [Component types](https://docs.solidjs.com/reference/solid-js/types/component-types)
