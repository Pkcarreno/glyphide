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

/** Safely formats a fallback token or non-standard value as a string. */
function formatFallbackToken(token: unknown): string {
  if (token === null) {
    return "null";
  }
  if (token === undefined) {
    return "undefined";
  }
  if (typeof token !== "object") {
    return String(token);
  }

  const tokenRecord = token as Record<string, unknown>;
  if ("value" in tokenRecord && tokenRecord.value !== undefined) {
    return String(tokenRecord.value);
  }
  try {
    return JSON.stringify(token);
  } catch {
    return String(token);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Guards against malformed worker RPC payloads lacking object properties. */
function isObjectToken(
  token: unknown
): token is Extract<ConsoleToken, { type: "object" }> {
  return (
    isRecord(token) && token.type === "object" && isRecord(token.properties)
  );
}

/** Renders a single ConsoleToken with type-appropriate styling. */
function Token(props: { token: unknown; isPreview?: boolean }) {
  const { token, isPreview } = props;

  if (
    !token ||
    typeof token !== "object" ||
    !("type" in token) ||
    typeof (token as { type: unknown }).type !== "string"
  ) {
    return <span class="text-on-surface">{formatFallbackToken(token)}</span>;
  }

  const typedToken = token as ConsoleToken;

  switch (typedToken.type) {
    case "string":
      return (
        <span class="text-on-surface">
          <span class="opacity-50">&quot;</span>
          {typedToken.value}
          <span class="opacity-50">&quot;</span>
        </span>
      );

    case "number":
      return <span class="text-log-warn">{String(typedToken.value)}</span>;

    case "boolean":
      return (
        <span class="text-primary">{typedToken.value ? "true" : "false"}</span>
      );

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
        typeof typedToken.source === "string" &&
        typedToken.source.includes("=>") &&
        !typedToken.source.startsWith("function");
      const isAsync =
        typeof typedToken.source === "string" &&
        typedToken.source.startsWith("async ");
      const isGenerator =
        typeof typedToken.source === "string" &&
        typedToken.source.includes("function*");

      let prefix = "ƒ";
      if (isAsync) {
        prefix = "async ƒ";
      } else if (isGenerator) {
        prefix = "ƒ*";
      }

      const name = typedToken.name || (isArrow ? "" : "(anonymous)");

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
          Symbol({typedToken.description})
        </span>
      );

    case "circular":
      return (
        <span class="text-on-surface-variant italic opacity-60">
          [Circular]
        </span>
      );

    case "array":
      return <TokenArray isPreview={isPreview} token={typedToken} />;

    case "object": {
      const objectToken: Extract<ConsoleToken, { type: "object" }> =
        isObjectToken(token) ? token : { properties: {}, type: "object" };
      return <TokenObject isPreview={isPreview} token={objectToken} />;
    }

    case "bigint":
      return <span class="text-log-warn">{String(typedToken.value)}n</span>;

    case "date":
      return <span class="text-on-surface">{typedToken.value}</span>;

    case "regexp":
      return (
        <span class="text-log-error">
          /{typedToken.source}/{typedToken.flags}
        </span>
      );

    case "error":
      return (
        <span class="font-semibold text-log-error">
          {typedToken.name}: {typedToken.message}
        </span>
      );

    case "promise":
      return (
        <span class="text-on-surface-variant italic">
          Promise <span class="opacity-70">{"{<pending>}"}</span>
        </span>
      );

    case "map":
      return <TokenMap isPreview={isPreview} token={typedToken} />;

    case "set":
      return <TokenSet isPreview={isPreview} token={typedToken} />;

    default:
      return (
        <span class="text-on-surface">{formatFallbackToken(typedToken)}</span>
      );
  }
}

function TokenArray(props: {
  token: Extract<ConsoleToken, { type: "array" }>;
  isPreview?: boolean;
}) {
  const { token, isPreview } = props;
  const elements = Array.isArray(token.elements) ? token.elements : [];
  const length =
    typeof token.length === "number" ? token.length : elements.length;
  const preview = elements.slice(0, 5);
  const hasMore = length > 5;

  const inlinePreview = (
    <span class="text-on-surface">
      <span class="opacity-50">Array({length}) [</span>
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

  if (length === 0) {
    return <span class="text-on-surface opacity-50">Array(0) []</span>;
  }

  return (
    <ExpandableNode preview={inlinePreview} stateKey={token}>
      <For each={elements}>
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
  const { properties } = token;
  const entries = Object.entries(properties).slice(0, 5);
  const hasMore = Object.keys(properties).length > 5;

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

  if (Object.keys(properties).length === 0) {
    return <span class="text-on-surface opacity-50">{"{}"}</span>;
  }

  return (
    <ExpandableNode preview={inlinePreview} stateKey={token}>
      <For each={Object.entries(properties)}>
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
  const entries = Array.isArray(token.entries) ? token.entries : [];
  const size = typeof token.size === "number" ? token.size : entries.length;
  const preview = entries.slice(0, 5);
  const hasMore = size > 5;

  const inlinePreview = (
    <span class="text-on-surface">
      <span class="opacity-50">
        Map({size}) {"{"}
      </span>
      <For each={preview}>
        {(entry, index) => {
          const [key, value] = Array.isArray(entry)
            ? entry
            : [entry, undefined];
          return (
            <>
              <Token isPreview token={key} />
              <span class="opacity-50"> =&gt; </span>
              <Token isPreview token={value} />
              <Show when={index() < preview.length - 1 || hasMore}>
                <span class="opacity-50">, </span>
              </Show>
            </>
          );
        }}
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

  if (size === 0) {
    return <span class="text-on-surface opacity-50">Map(0) {"{}"}</span>;
  }

  return (
    <ExpandableNode preview={inlinePreview} stateKey={token}>
      <For each={entries}>
        {(entry) => {
          const [key, value] = Array.isArray(entry)
            ? entry
            : [entry, undefined];
          return (
            <span class="flex items-baseline gap-2">
              <Token token={key} />
              <span class="text-on-surface-variant opacity-50">=&gt;</span>
              <Token token={value} />
            </span>
          );
        }}
      </For>
    </ExpandableNode>
  );
}

function TokenSet(props: {
  token: Extract<ConsoleToken, { type: "set" }>;
  isPreview?: boolean;
}) {
  const { token, isPreview } = props;
  const elements = Array.isArray(token.elements) ? token.elements : [];
  const size = typeof token.size === "number" ? token.size : elements.length;
  const preview = elements.slice(0, 5);
  const hasMore = size > 5;

  const inlinePreview = (
    <span class="text-on-surface">
      <span class="opacity-50">
        Set({size}) {"{"}
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

  if (size === 0) {
    return <span class="text-on-surface opacity-50">Set(0) {"{}"}</span>;
  }

  return (
    <ExpandableNode preview={inlinePreview} stateKey={token}>
      <For each={elements}>
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
  const tokens = () => (Array.isArray(props.tokens) ? props.tokens : []);
  return (
    <span class="inline-flex flex-wrap items-baseline gap-x-1.5">
      <For each={tokens()}>{(token) => <Token token={token} />}</For>
    </span>
  );
}

/** @public */
export { ConsoleTokenView, type ConsoleTokenViewProps };
