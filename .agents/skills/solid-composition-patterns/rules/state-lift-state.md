---
title: Lift State into Provider Components
impact: MEDIUM
impactDescription: allows sibling and parent access without visual coupling
tags: composition, state, context, solidjs
---

## Lift State into Provider Components

Components that need shared state do not need to be visually nested inside each other—they only need to reside within the same provider boundary. In SolidJS, lifting state into a provider has **zero performance penalty** because components do not re-render; only the individual signals subscribed to inside DOM bindings re-evaluate.

**Incorrect (syncing state upwards via effect listeners):**

```tsx
function ForwardMessageDialog() {
  const [input, setInput] = createSignal('')
  return (
    <Dialog>
      <ForwardMessageComposer onInputChange={setInput} />
      <MessagePreview input={input()} />
    </Dialog>
  )
}

function ForwardMessageComposer(props: { onInputChange: (v: string) => void }) {
  const [input, setInput] = createSignal('')
  createEffect(() => {
    props.onInputChange(input()) // Flaky sync effect 😬
  })
  ...
}
```

**Correct (state lifted into provider):**

```tsx
import { createSignal, type ParentProps } from 'solid-js'

function ForwardMessageProvider(props: ParentProps) {
  const [input, setInput] = createSignal('')
  const forwardMessage = useForwardMessage()

  const value: ComposerContextValue = {
    state: { input },
    actions: {
      setInput,
      submit: () => forwardMessage(input()),
    },
    meta: {},
  }

  return (
    <Composer.Provider value={value}>
      {props.children}
    </Composer.Provider>
  )
}

function ForwardMessageDialog() {
  return (
    <ForwardMessageProvider>
      <Dialog>
        <ForwardMessageComposer />
        <MessagePreview /> {/* Custom component reading state directly */}
        <DialogActions>
          <CancelButton />
          <ForwardButton /> {/* Custom button triggering submit directly */}
        </DialogActions>
      </Dialog>
    </ForwardMessageProvider>
  )
}

function ForwardButton() {
  const { actions } = useComposer()
  return <button type="button" onClick={actions.submit}>Forward</button>
}

function MessagePreview() {
  const { state } = useComposer()
  return <div class="preview">{state.input()}</div>
}
```

`ForwardButton` and `MessagePreview` live outside `Composer.Frame`, but because they reside within `ForwardMessageProvider`, they seamlessly read state and dispatch actions.
