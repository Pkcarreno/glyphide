---
title: Avoid Boolean Prop Proliferation
impact: HIGH
impactDescription: eliminates combinatorial component states and tangled conditionals
tags: composition, props, architecture, solidjs
---

## Avoid Boolean Prop Proliferation

Do not add boolean flags like `isThread`, `isEditing`, or `showAttachments` to customize component behavior. Every boolean prop doubles the possible state space and turns JSX into nested conditional branches. Compose explicit subcomponents instead.

**Incorrect (boolean flags create combinatorial complexity):**

```tsx
function Composer(props: {
  isThread?: boolean;
  isDMThread?: boolean;
  isEditing?: boolean;
  channelId?: string;
  dmId?: string;
  onSubmit: () => void;
}) {
  return (
    <form>
      <Header />
      <Input />
      {props.isDMThread ? (
        <AlsoSendToDMField id={props.dmId!} />
      ) : props.isThread ? (
        <AlsoSendToChannelField id={props.channelId!} />
      ) : null}
      {props.isEditing ? <EditActions /> : <DefaultActions />}
      <Footer onSubmit={props.onSubmit} />
    </form>
  );
}
```

**Correct (explicit composition eliminates mode conditionals):**

```tsx
function ChannelComposer() {
  return (
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <Composer.Footer>
        <Composer.Attachments />
        <Composer.Formatting />
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  );
}

function ThreadComposer(props: { channelId: string }) {
  return (
    <Composer.Frame>
      <Composer.Header />
      <Composer.Input />
      <AlsoSendToChannelField id={props.channelId} />
      <Composer.Footer>
        <Composer.Formatting />
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  );
}
```

Each variant declares only the pieces it renders, sharing underlying primitives through compound context without a monolithic parent.
