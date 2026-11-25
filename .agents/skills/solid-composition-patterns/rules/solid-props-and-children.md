---
title: Preserve Proxy Reactivity in Props and Children
impact: CRITICAL
impactDescription: preserves fine-grained tracking and avoids STRICT_READ_UNTRACKED errors
tags: solidjs, props, children, omit, merge, typescript
---

## Preserve Proxy Reactivity in Props and Children

In Solid 2.0, `props` is a proxy with getter properties compiled at JSX call sites. Keep `props` intact and read `props.field` inside reactive expressions. Use `omit` to forward rest props, `merge` to apply reactive defaults, `ParentProps` / `FlowProps` / `VoidProps` to declare children explicitly (`Component<P>` has no implicit `children`), and `children(() => props.children)` whenever children are inspected or read more than once.

**Incorrect (destructuring props or reading dynamic children multiple times):**

```tsx
function ThreadComposer({ channelId, children }: { channelId: string; children: any }) {
  // Triggers [STRICT_READ_UNTRACKED] in dev and breaks reactivity when props change
  return (
    <Composer.Frame>
      {children ? <Composer.Banner>{children}</Composer.Banner> : null}
      <AlsoSendToChannelField id={channelId} />
    </Composer.Frame>
  );
}
```

**Correct (proxy access, `omit`, `merge`, explicit prop types, and `children()`):**

```tsx
import { children, merge, omit, type ParentProps, type VoidProps } from 'solid-js';
import type { JSX } from '@solidjs/web';

interface ThreadComposerProps extends JSX.FormHTMLAttributes<HTMLFormElement> {
  channelId: string;
  compact?: boolean;
}

function ThreadComposer(rawProps: ParentProps<ThreadComposerProps>) {
  const props = merge({ compact: false }, rawProps);
  const rest = omit(props, 'channelId', 'compact', 'children');
  const resolved = children(() => props.children);

  return (
    <Composer.Frame data-compact={props.compact} {...rest}>
      <AlsoSendToChannelField id={props.channelId} />
      {resolved() ? <div class="slot">{resolved()}</div> : null}
    </Composer.Frame>
  );
}

// Leaf components without children declare VoidProps
function SubmitLabel(props: VoidProps<{ label: string }>) {
  return <span>{props.label}</span>;
}
```

Note that `merge` lets an explicit `undefined` property in a later source overwrite an earlier default, and accepts a function `() => ({ ... })` for memo-backed reactive defaults. Use `omit(props, (key) => key.startsWith('$'))` when filtering prop groups by prefix.

References: [omit](https://docs.solidjs.com/reference/solid-js/stores/omit) · [merge](https://docs.solidjs.com/reference/solid-js/stores/merge) · [Component types](https://docs.solidjs.com/reference/solid-js/types/component-types) · [children](https://docs.solidjs.com/reference/solid-js/components-context/children)
