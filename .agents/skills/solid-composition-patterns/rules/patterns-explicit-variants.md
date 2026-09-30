---
title: Create Explicit Component Variants
impact: MEDIUM
impactDescription: self-documenting code, no hidden conditionals
tags: composition, variants, architecture, solidjs
---

## Create Explicit Component Variants

Instead of a single monolithic component controlled by a cluster of boolean flags, build explicit variant components. Each variant composes the exact parts it requires.

**Incorrect (one component, many modes via booleans):**

```tsx
// Ambiguous and difficult to reason about
<Composer
  isThread
  isEditing={false}
  channelId="abc"
  showAttachments
  showFormatting={false}
/>
```

**Correct (explicit variant components):**

```tsx
// Immediately clear what each variant renders
<ThreadComposer channelId="abc" />
<EditMessageComposer messageId="xyz" />
<ForwardMessageComposer messageId="123" />
```

**Implementation in SolidJS:**

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
  )
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
  )
}

function ForwardMessageComposer(props: { messageId: string }) {
  return (
    <ForwardMessageProvider messageId={props.messageId}>
      <Composer.Frame>
        <Composer.Input placeholder="Add a message..." />
        <Composer.Footer>
          <Composer.Formatting />
          <Composer.Emojis />
          <Composer.Mentions />
        </Composer.Footer>
      </Composer.Frame>
    </ForwardMessageProvider>
  )
}
```

Each variant is explicit about its state provider, rendered UI elements, and available actions. No impossible states or combinatorial boolean bugs.
