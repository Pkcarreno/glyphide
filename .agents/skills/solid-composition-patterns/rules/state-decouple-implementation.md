---
title: Decouple State and Mutations from UI inside Providers
impact: MEDIUM
impactDescription: swaps signals, draft stores, projections, and optimistic actions without touching UI
tags: composition, state, stores, actions, optimistic, solidjs
---

## Decouple State and Mutations from UI inside Providers

The provider component is the sole boundary that knows how state and mutations are wired. UI subcomponents read `state`, call `actions`, and stay agnostic of whether updates come from `createSignal`, draft-first `createStore`, `createProjection`, or transactional `action` + `createOptimistic` / `createOptimisticStore`.

When a mutation spans an async gap (optimistic overlay → server request → `refresh` / `until`), wrap it in `action(async function* ...)` inside the provider. Always place a bare `yield;` after any `await` before writing signals/stores or creating readers (`until(...)`) so execution re-enters the active transaction.

**Incorrect (UI coupled directly to store transport and mutation orchestration):**

```tsx
function ChannelComposer(props: { channelId: string }) {
  const channel = useGlobalChannelStore(props.channelId);

  return (
    <Composer.Frame>
      <input
        value={channel.draft.text}
        onInput={(e) => channel.setDraft((d) => { d.text = e.currentTarget.value; })}
      />
      <button type="button" onClick={() => channel.sendDraft()}>Send</button>
    </Composer.Frame>
  );
}
```

**Correct (provider adapts stores, projections, and optimistic actions to the context contract):**

```tsx
import {
  action,
  createOptimistic,
  createOptimisticStore,
  createSignal,
  isPending,
  refresh,
  until,
  type ParentProps,
} from 'solid-js';

// Provider A: Local draft-first store + signal
function LocalComposerProvider(props: ParentProps<{ onSend: (text: string) => Promise<void> }>) {
  const [input, setInput] = createSignal('');
  const [attachments, setAttachments] = createOptimisticStore<Attachment[]>([]);
  const [submitting, setSubmitting] = createOptimistic(false);

  const submit = action(async function* () {
    const text = input();
    if (!text.trim()) return;

    setSubmitting(true);
    await api.sendMessage(text);
    yield; // Re-enter transaction after await before writing or awaiting until()
    setInput('');
    setAttachments((draft) => {
      draft.length = 0;
    });
    yield props.onSend(text);
  });

  const value: ComposerContextValue = {
    state: {
      input,
      attachments,
      isSubmitting: () => submitting() || isPending(submitting),
    },
    actions: {
      setInput,
      addAttachment: (file) =>
        setAttachments((draft) => {
          draft.push(file);
        }),
      submit,
    },
    meta: {},
  };

  return <Composer.Provider value={value}>{props.children}</Composer.Provider>;
}

// Provider B: Server-synced store with refresh + until reconciliation
function ChannelComposerProvider(props: ParentProps<{ channelId: string; messages: () => unknown[] }>) {
  const [input, setInput] = createSignal('');
  const [attachments, setAttachments] = createOptimisticStore<Attachment[]>([]);

  const submit = action(async function* () {
    const clientId = crypto.randomUUID();
    const sent = await api.postChannelMessage(props.channelId, { clientId, body: input() });
    yield;
    setInput('');
    refresh(props.messages);
    yield until(() => props.messages().some((m: any) => m.id === sent.id));
  });

  const value: ComposerContextValue = {
    state: { input, attachments, isSubmitting: () => isPending(props.messages) },
    actions: {
      setInput,
      addAttachment: (file) => setAttachments((draft) => { draft.push(file); }),
      submit,
    },
    meta: {},
  };

  return <Composer.Provider value={value}>{props.children}</Composer.Provider>;
}
```

References: [Mutations](https://docs.solidjs.com/concepts/mutations) · [action](https://docs.solidjs.com/reference/solid-js/lifecycle-actions/action) · [createOptimisticStore](https://docs.solidjs.com/reference/solid-js/stores/create-optimistic-store) · [until](https://docs.solidjs.com/reference/solid-js/lifecycle-actions/until)
