---
title: Lift State into Provider Components
impact: MEDIUM
impactDescription: enables sibling and ancestor access without visual coupling or re-renders
tags: composition, state, context, providers, solidjs
---

## Lift State into Provider Components

Components sharing state do not need to sit inside the same visual frame—they only need to live beneath the same provider boundary. In Solid 2.0, lifting state into a provider adds zero component re-render cost because components execute once and only fine-grained DOM/effect bindings re-run when read signals change.

**Incorrect (syncing local child state upward with effects and callback props):**

```tsx
function ForwardMessageDialog() {
  const [previewText, setPreviewText] = createSignal('');
  return (
    <Dialog>
      <ForwardComposer onTextChange={setPreviewText} />
      <MessagePreview text={previewText()} />
    </Dialog>
  );
}

function ForwardComposer(props: { onTextChange: (text: string) => void }) {
  const [input, setInput] = createSignal('');
  createEffect(input, (value) => {
    props.onTextChange(value);
  });
  return <input value={input()} onInput={(e) => setInput(e.currentTarget.value)} />;
}
```

**Correct (state lifted into a provider shared across sibling regions):**

```tsx
import { createSignal, createStore, type ParentProps } from 'solid-js';

function ForwardMessageProvider(props: ParentProps) {
  const [input, setInput] = createSignal('');
  const [attachments, setAttachments] = createStore<Attachment[]>([]);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const value: ComposerContextValue = {
    state: { input, attachments, isSubmitting },
    actions: {
      setInput,
      addAttachment: (file) => setAttachments((draft) => { draft.push(file); }),
      submit: async () => {
        setIsSubmitting(true);
        await api.forwardMessage(input());
        setIsSubmitting(false);
      },
    },
    meta: {},
  };

  return <Composer.Provider value={value}>{props.children}</Composer.Provider>;
}

function ForwardMessageDialog() {
  return (
    <ForwardMessageProvider>
      <Dialog>
        <Composer.Frame>
          <Composer.Input />
        </Composer.Frame>
        <MessagePreview />
        <DialogFooter>
          <ForwardButton />
        </DialogFooter>
      </Dialog>
    </ForwardMessageProvider>
  );
}

function MessagePreview() {
  const { state } = useComposer();
  return <div class="preview">{state.input()}</div>;
}

function ForwardButton() {
  const { actions, state } = useComposer();
  return (
    <button type="button" disabled={state.isSubmitting()} onClick={actions.submit}>
      Forward
    </button>
  );
}
```

`MessagePreview` and `ForwardButton` live outside `Composer.Frame` yet read reactive state and invoke actions directly from the enclosing provider.
