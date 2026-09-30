---
title: Use Compound Components
impact: HIGH
impactDescription: enables flexible composition without prop drilling
tags: composition, compound-components, architecture, solidjs
---

## Use Compound Components

Structure complex components as compound components with a shared context. Each subcomponent accesses shared reactive state via Solid's `createContext` and `useContext`, not prop drilling. Consumers compose only the pieces they need.

**Incorrect (monolithic component with render props and boolean toggles):**

```tsx
function Composer(props: Props) {
  return (
    <form>
      {props.renderHeader?.()}
      <Input />
      {props.showAttachments && <Attachments />}
      {props.renderFooter ? (
        props.renderFooter()
      ) : (
        <Footer>
          {props.showFormatting && <Formatting />}
          {props.showEmojis && <Emojis />}
          {props.renderActions?.()}
        </Footer>
      )}
    </form>
  )
}
```

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

function useComposer() {
  const ctx = useContext(ComposerContext)
  if (!ctx) {
    throw new Error('Composer compound components must be rendered inside a Composer.Provider')
  }
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

// Export as compound component
export const Composer = {
  Provider: ComposerProvider,
  Frame: ComposerFrame,
  Input: ComposerInput,
  Submit: ComposerSubmit,
  Header: ComposerHeader,
  Footer: ComposerFooter,
}
```

**Usage:**

```tsx
<Composer.Provider value={composer}>
  <Composer.Frame>
    <Composer.Header />
    <Composer.Input />
    <Composer.Footer>
      <Composer.Submit />
    </Composer.Footer>
  </Composer.Frame>
</Composer.Provider>
```

Consumers explicitly assemble the markup tree they need. The state and actions are dependency-injected by the provider, allowing multiple distinct UI variations to share the same underlying logic.
