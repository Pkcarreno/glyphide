---
title: Use Compound Components
impact: HIGH
impactDescription: enables flexible structural composition without prop drilling
tags: composition, compound-components, context, architecture, solidjs
---

## Use Compound Components

Structure multi-part components as a compound namespace backed by a default-less `createContext<T>()`. Each subcomponent reads only the reactive slices and actions it needs via `useContext`, while consumers arrange layout, insert custom slots, or wrap subtrees in `<Loading>` and `<Errored>` boundaries as needed.

**Pattern (compound components wired with Solid 2.0 direct context):**

```tsx
import { createContext, useContext, type Accessor, type ParentProps } from 'solid-js';

export interface ComposerContextValue {
  state: {
    input: Accessor<string>;
  };
  actions: {
    setInput: (value: string) => void;
    submit: () => void;
  };
  meta: {
    inputRef?: (el: HTMLInputElement) => void;
  };
}

const ComposerContext = createContext<ComposerContextValue>();

function useComposer() {
  return useContext(ComposerContext);
}

function ComposerProvider(props: ParentProps<{ value: ComposerContextValue }>) {
  return <ComposerContext value={props.value}>{props.children}</ComposerContext>;
}

function ComposerFrame(props: ParentProps) {
  return <form>{props.children}</form>;
}

function ComposerInput() {
  const { state, actions, meta } = useComposer();
  return (
    <input
      ref={meta.inputRef}
      value={state.input()}
      onInput={(e) => actions.setInput(e.currentTarget.value)}
    />
  );
}

function ComposerSubmit() {
  const { actions } = useComposer();
  return (
    <button type="button" onClick={actions.submit}>
      Send
    </button>
  );
}

export const Composer = {
  Provider: ComposerProvider,
  Frame: ComposerFrame,
  Input: ComposerInput,
  Submit: ComposerSubmit,
};
```

**Usage:**

```tsx
<Composer.Provider value={composer}>
  <Composer.Frame>
    <Composer.Input />
    <Composer.Submit />
  </Composer.Frame>
</Composer.Provider>
```

Because `ComposerContext` has no default value, rendering a subcomponent outside `<Composer.Provider>` throws `ContextNotFoundError` immediately instead of failing silently.

Reference: [createContext](https://docs.solidjs.com/reference/solid-js/components-context/create-context)
