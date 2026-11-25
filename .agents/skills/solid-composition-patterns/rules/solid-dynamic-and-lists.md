---
title: Compose Dynamic Components and Keyed Lists
impact: CRITICAL
impactDescription: preserves stable component identity and fine-grained list updates
tags: solidjs, dynamic, for, repeat, lists
---

## Compose Dynamic Components and Keyed Lists

Use `dynamic()` from `@solidjs/web` when the component or intrinsic tag changes reactively—it returns a stable component reference that composes with `lazy()`. When switching strictly between Solid components (no intrinsic HTML/SVG tag names), `dynamicComponent()` from `solid-js` keeps tag-rendering helpers tree-shakeable and accepts `{ static: true }` when the target component is fixed at creation time.

For lists, choose the `<For>` keying mode or `<Repeat>` to match the data shape:
- `<For each={list()}>{(item, index) => ...}</For>` (default `keyed={true}`): keys by item reference (`index` is an accessor).
- `<For each={list()} keyed={false}>{(item, index) => ...}</For>`: keys by position (`item` is an accessor, `index` is a number)—ideal for primitive arrays or fixed-index slots.
- `<For each={list()} keyed={(item) => item.id}>{(item, index) => ...}</For>`: keys by identity function when objects are replaced with new references (`item` and `index` are both accessors).
- `<Repeat count={store.items.length} from={offset()}>{(index) => ...}</Repeat>`: positional rendering over stores or sliding windows without array reference diffing.

**Pattern:**

```tsx
import { For, Repeat, lazy } from 'solid-js';
import { dynamic } from '@solidjs/web';

const RichEditor = lazy(() => import('./RichEditor'));
const PlainEditor = lazy(() => import('./PlainEditor'));

function EditorSlot(props: { mode: 'rich' | 'plain' | 'readonly'; placeholder: string }) {
  const ActiveEditor = dynamic(() => {
    if (props.mode === 'rich') return RichEditor;
    if (props.mode === 'plain') return PlainEditor;
    return 'textarea';
  });

  return <ActiveEditor placeholder={props.placeholder} />;
}

function AttachmentStrip(props: { files: { id: string; name: string }[] }) {
  return (
    <ul>
      <For each={props.files} keyed={(file) => file.id}>
        {(file, index) => (
          <li>
            {index() + 1}. {file().name}
          </li>
        )}
      </For>
    </ul>
  );
}

function StoreMessageWindow(props: { items: { body: string }[]; start: number; size: number }) {
  return (
    <Repeat count={props.size} from={props.start}>
      {(index) => <p>{props.items[index].body}</p>}
    </Repeat>
  );
}
```

References: [dynamic](https://docs.solidjs.com/reference/solid-web/components/dynamic) · [For](https://docs.solidjs.com/reference/solid-js/components-jsx/for) · [Repeat](https://docs.solidjs.com/reference/solid-js/components-jsx/repeat)
