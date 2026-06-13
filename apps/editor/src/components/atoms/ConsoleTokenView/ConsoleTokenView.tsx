import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import { For, Show } from "solid-js";

interface ConsoleTokenViewProps {
  /** Nesting depth — passed recursively to cap rendering at depth 3. */
  depth?: number;
  /** The token array to render. */
  tokens: ConsoleToken[];
}

const MAX_DEPTH = 3;

/** Truncation marker rendered when nesting depth exceeds the cap. */
function Ellipsis() {
  return <span class="text-on-surface-variant opacity-50">…</span>;
}

/** Renders a single ConsoleToken with type-appropriate styling. */
function Token(props: { depth: number; token: ConsoleToken }) {
  const { token, depth } = props;

  if (depth >= MAX_DEPTH) {
    return <Ellipsis />;
  }

  switch (token.type) {
    case "string":
      return (
        <span class="text-on-surface">
          <span class="opacity-50">&quot;</span>
          {token.value}
          <span class="opacity-50">&quot;</span>
        </span>
      );

    case "number":
      return <span class="text-log-warn">{String(token.value)}</span>;

    case "boolean":
      return <span class="text-primary">{token.value ? "true" : "false"}</span>;

    case "null":
      return (
        <span class="text-on-surface-variant italic opacity-70">null</span>
      );

    case "undefined":
      return (
        <span class="text-on-surface-variant italic opacity-70">undefined</span>
      );

    case "function": {
      const isArrow =
        token.source?.includes("=>") && !token.source?.startsWith("function");
      const isAsync = token.source?.startsWith("async ");
      const isGenerator = token.source?.includes("function*");

      let prefix = "ƒ";
      if (isAsync) {
        prefix = "async ƒ";
      } else if (isGenerator) {
        prefix = "ƒ*";
      }

      const name = token.name || (isArrow ? "" : "(anonymous)");

      return (
        <span class="text-on-surface-variant">
          <span class="mr-0.5 italic opacity-70">{prefix}</span>
          {name}
        </span>
      );
    }

    case "symbol":
      return (
        <span class="text-on-surface-variant opacity-80">
          Symbol({token.description})
        </span>
      );

    case "circular":
      return (
        <span class="text-on-surface-variant italic opacity-60">
          [Circular]
        </span>
      );

    case "array": {
      const preview = token.elements.slice(0, 5);
      const hasMore = token.elements.length > 5;
      return (
        <span class="text-on-surface">
          <span class="opacity-50">Array({token.length}) [</span>
          <For each={preview}>
            {(el, i) => (
              <>
                <Token depth={depth + 1} token={el} />
                <Show when={i() < preview.length - 1 || hasMore}>
                  <span class="opacity-50">, </span>
                </Show>
              </>
            )}
          </For>
          <Show when={hasMore}>
            <Ellipsis />
          </Show>
          <span class="opacity-50">]</span>
        </span>
      );
    }

    case "object": {
      const entries = Object.entries(token.properties).slice(0, 5);
      const hasMore = Object.keys(token.properties).length > 5;
      return (
        <span class="text-on-surface">
          <span class="opacity-50">{"{"}</span>
          <For each={entries}>
            {([key, val], i) => (
              <>
                <span class="text-on-surface-variant opacity-80">{key}</span>
                <span class="opacity-50">: </span>
                <Token depth={depth + 1} token={val} />
                <Show when={i() < entries.length - 1 || hasMore}>
                  <span class="opacity-50">, </span>
                </Show>
              </>
            )}
          </For>
          <Show when={hasMore}>
            <Ellipsis />
          </Show>
          <span class="opacity-50">{"}"}</span>
        </span>
      );
    }

    case "bigint":
      return <span class="text-log-warn">{String(token.value)}n</span>;

    case "date":
      return <span class="text-on-surface">{token.value}</span>;

    case "regexp":
      return (
        <span class="text-log-error">
          /{token.source}/{token.flags}
        </span>
      );

    case "error":
      return (
        <span class="font-semibold text-log-error">
          {token.name}: {token.message}
        </span>
      );

    case "promise":
      return (
        <span class="text-on-surface-variant italic">
          Promise <span class="opacity-70">{"{<pending>}"}</span>
        </span>
      );

    case "map": {
      const preview = token.entries.slice(0, 5);
      const hasMore = token.entries.length > 5;
      return (
        <span class="text-on-surface">
          <span class="opacity-50">
            Map({token.size}) {"{"}
          </span>
          <For each={preview}>
            {([k, v], i) => (
              <>
                <Token depth={depth + 1} token={k} />
                <span class="opacity-50"> =&gt; </span>
                <Token depth={depth + 1} token={v} />
                <Show when={i() < preview.length - 1 || hasMore}>
                  <span class="opacity-50">, </span>
                </Show>
              </>
            )}
          </For>
          <Show when={hasMore}>
            <Ellipsis />
          </Show>
          <span class="opacity-50">{"}"}</span>
        </span>
      );
    }

    case "set": {
      const preview = token.elements.slice(0, 5);
      const hasMore = token.elements.length > 5;
      return (
        <span class="text-on-surface">
          <span class="opacity-50">
            Set({token.size}) {"{"}
          </span>
          <For each={preview}>
            {(el, i) => (
              <>
                <Token depth={depth + 1} token={el} />
                <Show when={i() < preview.length - 1 || hasMore}>
                  <span class="opacity-50">, </span>
                </Show>
              </>
            )}
          </For>
          <Show when={hasMore}>
            <Ellipsis />
          </Show>
          <span class="opacity-50">{"}"}</span>
        </span>
      );
    }

    default:
      return null;
  }
}

/**
 * Pure stateless atom that renders a `ConsoleToken[]` from the QuickJS engine
 * as inline-flex spans with per-type syntax coloring.
 *
 * Rendering is capped at depth 3 — nested structures beyond that are replaced
 * with a `…` truncation marker. Future DevTools-style expand/collapse behavior
 * should be added at a wrapping molecule layer, not here.
 */
function ConsoleTokenView(props: ConsoleTokenViewProps) {
  const depth = props.depth ?? 0;

  return (
    <span class="inline-flex flex-wrap items-baseline gap-x-1.5">
      <For each={props.tokens}>
        {(token) => <Token depth={depth} token={token} />}
      </For>
    </span>
  );
}

export { ConsoleTokenView, type ConsoleTokenViewProps };
