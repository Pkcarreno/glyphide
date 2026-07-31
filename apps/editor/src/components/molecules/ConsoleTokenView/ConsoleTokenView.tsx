import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import { For, Show } from "solid-js";
import { ExpandableNode } from "../../atoms/ExpandableNode.tsx";

/**
 * Configuration props for the ConsoleTokenView component.
 *
 * Intent: Accepts an array of parsed tokens from the engine and maps them
 * to their respective visual representations.
 *
 * Edge cases: If an empty array is provided, it renders an empty container.
 * Unrecognized token types return null (render nothing).
 *
 * Side effects: None.
 */
interface ConsoleTokenViewProps {
  /** The token array to render. */
  tokens: ConsoleToken[];
}

/** Truncation marker rendered when inline preview has more items. */
function Ellipsis() {
  return <span class="text-on-surface-variant opacity-50">…</span>;
}

/** Renders a single ConsoleToken with type-appropriate styling. */
function Token(props: { token: ConsoleToken; isPreview?: boolean }) {
  const { token, isPreview } = props;

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

    case "array":
      return <TokenArray isPreview={isPreview} token={token} />;

    case "object":
      return <TokenObject isPreview={isPreview} token={token} />;

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

    case "map":
      return <TokenMap isPreview={isPreview} token={token} />;

    case "set":
      return <TokenSet isPreview={isPreview} token={token} />;

    default:
      return null;
  }
}

function TokenArray(props: {
  token: Extract<ConsoleToken, { type: "array" }>;
  isPreview?: boolean;
}) {
  const { token, isPreview } = props;
  const preview = token.elements.slice(0, 5);
  const hasMore = token.elements.length > 5;

  const inlinePreview = (
    <span class="text-on-surface">
      <span class="opacity-50">Array({token.length}) [</span>
      <For each={preview}>
        {(element, index) => (
          <>
            <Token isPreview token={element} />
            <Show when={index() < preview.length - 1 || hasMore}>
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

  if (isPreview) {
    return inlinePreview;
  }

  if (token.length === 0) {
    return <span class="text-on-surface opacity-50">Array(0) []</span>;
  }

  return (
    <ExpandableNode preview={inlinePreview} stateKey={token}>
      <For each={token.elements}>
        {(element, index) => (
          <span class="flex items-baseline gap-2">
            <span class="min-w-5 text-right text-on-surface-variant opacity-50">
              {index()}:
            </span>
            <Token token={element} />
          </span>
        )}
      </For>
    </ExpandableNode>
  );
}

function TokenObject(props: {
  token: Extract<ConsoleToken, { type: "object" }>;
  isPreview?: boolean;
}) {
  const { token, isPreview } = props;
  const entries = Object.entries(token.properties).slice(0, 5);
  const hasMore = Object.keys(token.properties).length > 5;

  const inlinePreview = (
    <span class="text-on-surface">
      <span class="opacity-50">{"{"}</span>
      <For each={entries}>
        {([key, value], index) => (
          <>
            <span class="text-on-surface-variant opacity-80">{key}</span>
            <span class="opacity-50">: </span>
            <Token isPreview token={value} />
            <Show when={index() < entries.length - 1 || hasMore}>
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

  if (isPreview) {
    return inlinePreview;
  }

  if (Object.keys(token.properties).length === 0) {
    return <span class="text-on-surface opacity-50">{"{}"}</span>;
  }

  return (
    <ExpandableNode preview={inlinePreview} stateKey={token}>
      <For each={Object.entries(token.properties)}>
        {([key, value]) => (
          <span class="flex items-baseline gap-2">
            <span class="text-on-surface-variant opacity-80">{key}:</span>
            <Token token={value} />
          </span>
        )}
      </For>
    </ExpandableNode>
  );
}

function TokenMap(props: {
  token: Extract<ConsoleToken, { type: "map" }>;
  isPreview?: boolean;
}) {
  const { token, isPreview } = props;
  const preview = token.entries.slice(0, 5);
  const hasMore = token.entries.length > 5;

  const inlinePreview = (
    <span class="text-on-surface">
      <span class="opacity-50">
        Map({token.size}) {"{"}
      </span>
      <For each={preview}>
        {([key, value], index) => (
          <>
            <Token isPreview token={key} />
            <span class="opacity-50"> =&gt; </span>
            <Token isPreview token={value} />
            <Show when={index() < preview.length - 1 || hasMore}>
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

  if (isPreview) {
    return inlinePreview;
  }

  if (token.size === 0) {
    return <span class="text-on-surface opacity-50">Map(0) {"{}"}</span>;
  }

  return (
    <ExpandableNode preview={inlinePreview} stateKey={token}>
      <For each={token.entries}>
        {([key, value]) => (
          <span class="flex items-baseline gap-2">
            <Token token={key} />
            <span class="text-on-surface-variant opacity-50">=&gt;</span>
            <Token token={value} />
          </span>
        )}
      </For>
    </ExpandableNode>
  );
}

function TokenSet(props: {
  token: Extract<ConsoleToken, { type: "set" }>;
  isPreview?: boolean;
}) {
  const { token, isPreview } = props;
  const preview = token.elements.slice(0, 5);
  const hasMore = token.elements.length > 5;

  const inlinePreview = (
    <span class="text-on-surface">
      <span class="opacity-50">
        Set({token.size}) {"{"}
      </span>
      <For each={preview}>
        {(element, index) => (
          <>
            <Token isPreview token={element} />
            <Show when={index() < preview.length - 1 || hasMore}>
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

  if (isPreview) {
    return inlinePreview;
  }

  if (token.size === 0) {
    return <span class="text-on-surface opacity-50">Set(0) {"{}"}</span>;
  }

  return (
    <ExpandableNode preview={inlinePreview} stateKey={token}>
      <For each={token.elements}>
        {(element) => (
          <span class="flex items-baseline gap-2">
            <Token token={element} />
          </span>
        )}
      </For>
    </ExpandableNode>
  );
}

/**
 * Molecule that renders a `ConsoleToken[]`.
 * Provides interactive expansion for structured collections (objects, arrays, maps, sets).
 */
function ConsoleTokenView(props: ConsoleTokenViewProps) {
  return (
    <span class="inline-flex flex-wrap items-baseline gap-x-1.5">
      <For each={props.tokens}>{(token) => <Token token={token} />}</For>
    </span>
  );
}

/** @public */
export { ConsoleTokenView, type ConsoleTokenViewProps };
