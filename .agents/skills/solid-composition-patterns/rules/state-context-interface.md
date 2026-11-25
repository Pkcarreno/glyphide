---
title: Define Generic Context Interfaces for Dependency Injection
impact: MEDIUM
impactDescription: enables swapping signal, store, and optimistic action providers under shared UI
tags: composition, context, state, typescript, dependency-injection, solidjs
---

## Define Generic Context Interfaces for Dependency Injection

Define a generic contract for component context split into three parts: `state`, `actions`, and `meta`. Keep reactive primitives shaped as `Accessor<T>` (for signal/memo values) or `Store<T>` (plain property values tracked by proxy—never wrap store fields in functions), and expose `Ref<T>` callbacks in `meta`. Wire the contract with a default-less `createContext<T>()` so missing providers fail loudly with `ContextNotFoundError`.

**Pattern (generic `{ state, actions, meta }` contract):**

```tsx
import {
  createContext,
  useContext,
  type Accessor,
  type ParentProps,
  type Ref,
  type Store,
} from 'solid-js';

export interface Attachment {
  id: string;
  name: string;
}

export interface ComposerState {
  input: Accessor<string>;
  attachments: Store<Attachment[]>;
  isSubmitting: Accessor<boolean>;
}

export interface ComposerActions {
  setInput: (value: string) => void;
  addAttachment: (file: Attachment) => void;
  submit: () => void;
}

export interface ComposerMeta {
  inputRef?: Ref<HTMLInputElement>;
}

export interface ComposerContextValue {
  state: ComposerState;
  actions: ComposerActions;
  meta: ComposerMeta;
}

const ComposerContext = createContext<ComposerContextValue>();

export function useComposer() {
  return useContext(ComposerContext);
}

export function ComposerProvider(props: ParentProps<{ value: ComposerContextValue }>) {
  return <ComposerContext value={props.value}>{props.children}</ComposerContext>;
}
```

**UI subcomponents depend only on the contract:**

```tsx
function ComposerInput() {
  const { state, actions, meta } = useComposer();

  return (
    <input
      ref={meta.inputRef}
      value={state.input()}
      disabled={state.isSubmitting()}
      onInput={(e) => actions.setInput(e.currentTarget.value)}
    />
  );
}
```

Any provider—ephemeral local signals, a draft-first store, a `createProjection` tree, or an optimistic generator `action`—can satisfy `ComposerContextValue` without changing a line of UI.

References: [createContext](https://docs.solidjs.com/reference/solid-js/components-context/create-context) · [createStore](https://docs.solidjs.com/reference/solid-js/stores/create-store)
