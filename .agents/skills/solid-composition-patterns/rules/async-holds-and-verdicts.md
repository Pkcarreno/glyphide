---
title: Surface Graph Holds with isPending, latest, and createDeferred
impact: HIGH
impactDescription: delivers instant interactive feedback while keeping settled UI consistent
tags: async, holds, isPending, latest, createDeferred, solidjs
---

## Surface Graph Holds with isPending, latest, and createDeferred

After initial mount, Solid 2.0 holds the settled UI during async updates until new data lands, preventing partial screen tearing. Pair held reads with `isPending`, `latest`, and `createDeferred` to keep controls responsive without manual loading booleans:

- **`isPending(() => expr)`:** Returns `true` while any read inside `expr` has an uncommitted in-flight change. Dim stale panels (`class={{ stale: isPending(panel) }}`) or disable buttons during saves.
- **`latest(() => expr)`:** Reads the freshest in-flight value for interactive controls (such as the active tab indicator or search input) while the held panel below continues displaying settled data. Reserve `latest` for controls, never for uncoordinated body content.
- **`createDeferred(() => expr)`:** Creates an async memo that holds nothing after its first answer—secondary panels update independently when ready while `isPending` reports the background refresh.

**Pattern (responsive tabs and non-blocking secondary feed):**

```tsx
import { For, createDeferred, createMemo, createSignal, isPending, latest } from 'solid-js';

const TABS = ['overview', 'activity', 'settings'] as const;

function WorkspaceTabs(props: { workspaceId: string }) {
  const [selectedTab, setSelectedTab] = createSignal<(typeof TABS)[number]>('overview');
  const panelData = createMemo(() => fetchTabPanel(props.workspaceId, selectedTab()));
  const secondaryAudit = createDeferred(() => fetchAuditTail(props.workspaceId));

  return (
    <section>
      <nav role="tablist">
        <For each={TABS}>
          {(tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={latest(selectedTab) === tab}
              onClick={() => setSelectedTab(tab)}
            >
              {tab}
            </button>
          )}
        </For>
      </nav>

      <div class={{ 'opacity-60 transition-opacity': isPending(panelData) }}>
        <PanelBody data={panelData()} />
      </div>

      <aside class={{ 'opacity-60': isPending(secondaryAudit) }}>
        <AuditSummary items={secondaryAudit()} />
      </aside>
    </section>
  );
}
```

Clicking a tab highlights the selected tab immediately via `latest(selectedTab)` and dims the previous `PanelBody` via `isPending(panelData)` until the new tab data settles.

References: [isPending](https://docs.solidjs.com/reference/solid-js/reactivity/is-pending) · [latest](https://docs.solidjs.com/reference/solid-js/reactivity/latest) · [createDeferred](https://docs.solidjs.com/reference/solid-js/reactivity/create-deferred)
