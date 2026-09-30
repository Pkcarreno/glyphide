---
title: Decouple State Management from UI
impact: MEDIUM
impactDescription: enables swapping state implementations without changing UI
tags: composition, state, architecture, solidjs
---

## Decouple State Management from UI

The provider component should be the only place that knows how state is managed. UI components consume the context interface—they do not care whether state originates from a local `createSignal`, an in-memory Store, or an external RPC worker synchronization layer.

**Incorrect (UI coupled to state implementation details):**

```tsx
function ChannelComposer(props: { channelId: string }) {
  // UI component knows about global sync details and RPC stores
  const channel = useGlobalChannelState(props.channelId)

  return (
    <Composer.Frame>
      <Composer.Input
        value={channel.input()}
        onInput={(e) => channel.updateInput(e.currentTarget.value)}
      />
      <Composer.Submit onClick={() => channel.submit()} />
    </Composer.Frame>
  )
}
```

**Correct (state management isolated in provider):**

```tsx
import type { ParentProps } from 'solid-js'

// Provider handles all state wiring
function ChannelProvider(props: ParentProps<{ channelId: string }>) {
  const channel = useGlobalChannel(props.channelId)

  const value: ComposerContextValue = {
    state: {
      input: () => channel.input,
    },
    actions: {
      setInput: channel.updateInput,
      submit: channel.submit,
    },
    meta: {},
  }

  return (
    <Composer.Provider value={value}>
      {props.children}
    </Composer.Provider>
  )
}

// UI component only knows about the context interface
function ChannelComposer() {
  return (
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <Composer.Footer>
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  )
}

// Composition
function Channel(props: { channelId: string }) {
  return (
    <ChannelProvider channelId={props.channelId}>
      <ChannelComposer />
    </ChannelProvider>
  )
}
```

The same `Composer.Input` component functions identically across different providers because it depends strictly on the context interface, not on the underlying storage or synchronization mechanism.
