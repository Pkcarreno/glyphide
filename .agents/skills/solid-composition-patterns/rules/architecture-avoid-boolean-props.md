---
title: Avoid Boolean Prop Proliferation
impact: CRITICAL
impactDescription: prevents unmaintainable component variants
tags: composition, props, architecture, solidjs
---

## Avoid Boolean Prop Proliferation

Do not add boolean flags like `isThread`, `isEditing`, or `isDMThread` to customize component behavior. Every boolean prop doubles the possible state space and introduces unmaintainable conditional branching. Use composition instead.

**Incorrect (boolean props create combinatorial complexity):**

```tsx
function Composer(props: Props) {
  return (
    <form>
      <Header />
      <Input />
      {props.isDMThread ? (
        <AlsoSendToDMField id={props.dmId} />
      ) : props.isThread ? (
        <AlsoSendToChannelField id={props.channelId} />
      ) : null}
      {props.isEditing ? (
        <EditActions />
      ) : props.isForwarding ? (
        <ForwardActions />
      ) : (
        <DefaultActions />
      )}
      <Footer onSubmit={props.onSubmit} />
    </form>
  )
}
```

**Correct (explicit composition eliminates conditionals):**

```tsx
// Channel composer
function ChannelComposer() {
  return (
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <Composer.Footer>
        <Composer.Attachments />
        <Composer.Formatting />
        <Composer.Emojis />
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  )
}

// Thread composer - adds "also send to channel" field
function ThreadComposer(props: { channelId: string }) {
  return (
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <AlsoSendToChannelField id={props.channelId} />
      <Composer.Footer>
        <Composer.Formatting />
        <Composer.Emojis />
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  )
}

// Edit composer - different actions in footer
function EditComposer() {
  return (
    <Composer.Frame>
      <Composer.Input />
      <Composer.Footer>
        <Composer.Formatting />
        <Composer.Emojis />
        <Composer.CancelEdit />
        <Composer.SaveEdit />
      </Composer.Footer>
    </Composer.Frame>
  )
}
```

Each variant is explicit about what it renders. We can share internals across components without sharing a bloated, monolithic parent.
