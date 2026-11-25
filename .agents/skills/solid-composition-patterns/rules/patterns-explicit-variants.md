---
title: Create Explicit Component Variants
impact: MEDIUM
impactDescription: produces self-documenting call sites with zero impossible states
tags: composition, variants, architecture, solidjs
---

## Create Explicit Component Variants

Build dedicated variant components instead of a single configurable component overloaded with mode flags. Each variant pairs the exact provider and compound parts required for its use case, making call sites self-documenting and eliminating unreachable combinations.

**Pattern (explicit variant components composing providers and compound parts):**

```tsx
function ThreadComposer(props: { channelId: string }) {
  return (
    <ThreadProvider channelId={props.channelId}>
      <Composer.Frame>
        <Composer.Input />
        <AlsoSendToChannelField channelId={props.channelId} />
        <Composer.Footer>
          <Composer.Formatting />
          <Composer.Emojis />
          <Composer.Submit />
        </Composer.Footer>
      </Composer.Frame>
    </ThreadProvider>
  );
}

function EditMessageComposer(props: { messageId: string }) {
  return (
    <EditMessageProvider messageId={props.messageId}>
      <Composer.Frame>
        <Composer.Input />
        <Composer.Footer>
          <Composer.Formatting />
          <Composer.Emojis />
          <Composer.CancelEdit />
          <Composer.SaveEdit />
        </Composer.Footer>
      </Composer.Frame>
    </EditMessageProvider>
  );
}

function ForwardMessageComposer(props: { messageId: string }) {
  return (
    <ForwardMessageProvider messageId={props.messageId}>
      <Composer.Frame>
        <Composer.Input placeholder="Add a message..." />
        <Composer.Footer>
          <Composer.Formatting />
          <Composer.Emojis />
          <Composer.Submit />
        </Composer.Footer>
      </Composer.Frame>
    </ForwardMessageProvider>
  );
}
```

Each variant is immediately readable at its call site (`<ThreadComposer channelId="abc" />`, `<EditMessageComposer messageId="xyz" />`) and pairs only valid actions with its provider.
