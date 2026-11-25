---
title: Fetch High, Block Low with Async Boundaries
impact: HIGH
impactDescription: prevents async waterfalls and keeps layout chrome mounted during loads
tags: async, loading, errored, reveal, boundaries, solidjs
---

## Fetch High, Block Low with Async Boundaries

In Solid 2.0, passing a prop getter is not reading it. Start async `createMemo` computations at the page or provider level, pass them through component props normally (not as `Promise<T>`), and place `<Loading>`, `<Errored>`, and `<Reveal>` directly around the leaf slots that read those values.

- **Isolate shell chrome:** Wrap only the data-dependent slot in `<Loading>`, never the surrounding header, navigation, or toolbar.
- **Re-arm `<Loading>` intentionally:** Once settled, `<Loading>` holds prior UI across updates unless its tracked `on` prop changes and the subtree is pending without an external hold.
- **Self-healing `<Errored>`:** `fallback={(err, reset) => ...}` receives `err` as an accessor (`err()`), and `<Errored>` recovers automatically when upstream inputs change or `refresh()` succeeds.
- **Coordinate sibling slots:** Wrap sibling `<Loading>` boundaries in `<Reveal order="sequential" | "together" | "natural" collapsed?>` to control reveal choreography.

**Incorrect (reading async data too high forces the entire shell to block):**

```tsx
function UserPage(props: { userId: string }) {
  const user = createMemo(() => fetchUser(props.userId));
  // Reading user().name in the parent blocks before children even start their own fetches
  return (
    <Loading fallback={<PageSkeleton />}>
      <Header title={user().name} />
      <ActivityFeed userId={props.userId} />
    </Loading>
  );
}
```

**Correct (async memo created high, read low inside scoped boundaries):**

```tsx
import { Errored, Loading, Reveal, createMemo } from 'solid-js';

function UserPage(props: { userId: string }) {
  const user = createMemo(() => fetchUser(props.userId));
  const activity = createMemo(() => fetchActivity(props.userId));

  return (
    <main>
      <NavBar />
      <Reveal order="sequential" collapsed>
        <Errored fallback={(err, reset) => <RetryBanner message={err().message} onRetry={reset} />}>
          <Loading fallback={<HeaderSkeleton />} on={props.userId}>
            <ProfileHeader name={user().name} />
          </Loading>
        </Errored>
        <Errored fallback={(err, reset) => <RetryBanner message={err().message} onRetry={reset} />}>
          <Loading fallback={<FeedSkeleton />}>
            <ActivityList items={activity()} />
          </Loading>
        </Errored>
      </Reveal>
    </main>
  );
}
```

Both `fetchUser` and `fetchActivity` start in parallel, `NavBar` stays mounted immediately, and each slot handles its own loading and error recovery independently.

References: [Async reactivity](https://docs.solidjs.com/concepts/async-reactivity) · [Boundaries](https://docs.solidjs.com/concepts/boundaries) · [Loading](https://docs.solidjs.com/reference/solid-js/components-jsx/loading) · [Errored](https://docs.solidjs.com/reference/solid-js/components-jsx/errored) · [Reveal](https://docs.solidjs.com/reference/solid-js/components-jsx/reveal)
