---
title: Define Generic Context Interfaces for Dependency Injection
impact: HIGH
impactDescription: enables dependency-injectable state across use-cases
tags: composition, context, state, typescript, dependency-injection, solidjs
---

## Define Generic Context Interfaces for Dependency Injection

Define a **generic interface** for your component context with three distinct parts:
`state`, `actions`, and `meta`. This interface is a contract that any provider
can implement—enabling the same UI components to work with completely different
reactive state implementations.

**Core principle:** Lift state, compose internals, make state dependency-injectable.

**Incorrect (UI coupled to a specific hook or store):**

```tsx
function ComposerInput() {
  // Tightly coupled to a specific external hook/store
  const { input, setInput } = useChannelComposerState()
  return <input value={input()} onInput={(e) => setInput(e.currentTarget.value)} />
}
```

**Correct (generic interface enables dependency injection):**

```tsx
import { createContext, useContext, type Accessor, type ParentProps } from 'solid-js'

export interface ComposerState {
  input: Accessor<string>
  attachments: Accessor<Attachment[]>
  isSubmitting: Accessor<boolean>
}

export interface ComposerActions {
  setInput: (value: string) => void
  submit: () => void
}

export interface ComposerMeta {
  inputRef?: (el: HTMLInputElement) => void
}

export interface ComposerContextValue {
  state: ComposerState
  actions: ComposerActions
  meta: ComposerMeta
}

const ComposerContext = createContext<ComposerContextValue | undefined>(undefined)

export function useComposer() {
  const ctx = useContext(ComposerContext)
  if (!ctx) throw new Error('useComposer must be used within ComposerProvider')
  return ctx
}
```

**UI components consume the interface, not the implementation:**

```tsx
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
```

**Different providers implement the exact same interface:**

```tsx
// Provider A: Ephemeral local signals
function ForwardMessageProvider(props: ParentProps) {
  const [input, setInput] = createSignal('')
  const [attachments, setAttachments] = createSignal<Attachment[]>([])
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const forwardMessage = useForwardMessage()

  const value: ComposerContextValue = {
    state: { input, attachments, isSubmitting },
    actions: {
      setInput,
      submit: () => forwardMessage(input()),
    },
    meta: {},
  }

  return (
    <ComposerContext.Provider value={value}>
      {props.children}
    </ComposerContext.Provider>
  )
}

// Provider B: Global synced channel store
function ChannelProvider(props: ParentProps<{ channelId: string }>) {
  const channel = useGlobalChannel(props.channelId)

  const value: ComposerContextValue = {
    state: {
      input: () => channel.state.input,
      attachments: () => channel.state.attachments,
      isSubmitting: () => channel.state.isSubmitting,
    },
    actions: {
      setInput: (val) => channel.updateInput(val),
      submit: () => channel.submit(),
    },
    meta: {},
  }

  return (
    <ComposerContext.Provider value={value}>
      {props.children}
    </ComposerContext.Provider>
  )
}
```

**The same composed UI works with both:**

```tsx
// Works with ForwardMessageProvider (local signals)
<ForwardMessageProvider>
  <Composer.Frame>
    <Composer.Input />
    <Composer.Submit />
  </Composer.Frame>
</ForwardMessageProvider>

// Works with ChannelProvider (global synced store)
<ChannelProvider channelId="abc">
  <Composer.Frame>
    <Composer.Input />
    <Composer.Submit />
  </Composer.Frame>
</ChannelProvider>
```

The UI is made of reusable bits you compose together. The state is dependency-injected by the provider. Swap the provider, keep the UI.
