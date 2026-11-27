import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import type { JSX } from "@solidjs/web";
import type { FlowProps, VoidProps } from "solid-js";
import { createMemo, For, Show } from "solid-js";
import { ExpandableNode } from "../../atoms/ExpandableNode.tsx";

/**
 * Configuration props for the ConsoleTokenView component.
 *
 * Intent: Accepts an array of parsed tokens from the engine and maps them
 * to their respective visual representations.
 *
 * Edge cases: If an empty array is provided, it renders an empty container.
 * Unrecognized token types return fallback text.
 *
 * Side effects: None.
 */
interface ConsoleTokenViewProps {
  /** The token array to render. */
  tokens: ConsoleToken[];
}

interface CollectionRenderers {
  array: (token: Extract<ConsoleToken, { type: "array" }>) => JSX.Element;
  map: (token: Extract<ConsoleToken, { type: "map" }>) => JSX.Element;
  object: (token: Extract<ConsoleToken, { type: "object" }>) => JSX.Element;
  set: (token: Extract<ConsoleToken, { type: "set" }>) => JSX.Element;
}

interface TokenExpandableCollectionProps {
  /** Number of items in the collection; zero renders `emptyText` without an expander. */
  count: number;
  /** Text shown when the collection is empty. */
  emptyText: string;
  /** Inline preview rendered inside the toggle trigger. */
  preview: JSX.Element;
  /** Stable token object used to scope expansion across remounts. */
  stateKey: object;
}

/** Truncation marker rendered when inline preview has more items. */
function Ellipsis(_props: VoidProps) {
  return <span class="text-on-surface-variant opacity-50">…</span>;
}

/** Shared wrapper for expandable console collection tokens. */
function TokenExpandableCollection(
  props: FlowProps<TokenExpandableCollectionProps>
) {
  return (
    <Show
      fallback={
        <span class="text-on-surface opacity-50">{props.emptyText}</span>
      }
      when={props.count > 0}
    >
      <ExpandableNode preview={props.preview} stateKey={props.stateKey}>
        {props.children}
      </ExpandableNode>
    </Show>
  );
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

function resolveConsoleToken(token: unknown): ConsoleToken | null {
  if (
    !token ||
    typeof token !== "object" ||
    !("type" in token) ||
    typeof (token as { type: unknown }).type !== "string"
  ) {
    return null;
  }
  return token as ConsoleToken;
}

function getArrayParts(token: Extract<ConsoleToken, { type: "array" }>) {
  const elements = Array.isArray(token.elements) ? token.elements : [];
  const length =
    typeof token.length === "number" ? token.length : elements.length;
  return { elements, length };
}

function getObjectEntries(token: Extract<ConsoleToken, { type: "object" }>) {
  return Object.entries(token.properties);
}

function getMapParts(token: Extract<ConsoleToken, { type: "map" }>) {
  const entries = Array.isArray(token.entries) ? token.entries : [];
  const size = typeof token.size === "number" ? token.size : entries.length;
  return { entries, size };
}

function getSetParts(token: Extract<ConsoleToken, { type: "set" }>) {
  const elements = Array.isArray(token.elements) ? token.elements : [];
  const size = typeof token.size === "number" ? token.size : elements.length;
  return { elements, size };
}

function renderFunctionToken(
  typedToken: Extract<ConsoleToken, { type: "function" }>
) {
  const source = typeof typedToken.source === "string" ? typedToken.source : "";
  const isArrow = source.includes("=>") && !source.startsWith("function");
  const isAsync = source.startsWith("async ");
  const isGenerator = source.includes("function*");

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

function renderScalarToken(typedToken: ConsoleToken): JSX.Element {
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

    case "function":
      return renderFunctionToken(typedToken);

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
        <span class="text-log-error font-semibold">
          {typedToken.name}: {typedToken.message}
        </span>
      );

    case "promise":
      return (
        <span class="text-on-surface-variant italic">
          Promise <span class="opacity-70">{"{<pending>}"}</span>
        </span>
      );

    default:
      return (
        <span class="text-on-surface">{formatFallbackToken(typedToken)}</span>
      );
  }
}

function renderTokenWithCollections(
  token: unknown,
  collections: CollectionRenderers
): JSX.Element {
  const typedToken = resolveConsoleToken(token);
  if (!typedToken) {
    return <span class="text-on-surface">{formatFallbackToken(token)}</span>;
  }

  switch (typedToken.type) {
    case "array":
      return collections.array(typedToken);
    case "object":
      return collections.object(
        isObjectToken(typedToken)
          ? typedToken
          : { properties: {}, type: "object" }
      );
    case "map":
      return collections.map(typedToken);
    case "set":
      return collections.set(typedToken);
    default:
      return renderScalarToken(typedToken);
  }
}

/** Renders a single ConsoleToken with interactive expandable collections. */
function Token(props: VoidProps<{ token: unknown }>) {
  return (
    <>
      {renderTokenWithCollections(props.token, {
        array: (token) => <TokenArray token={token} />,
        map: (token) => <TokenMap token={token} />,
        object: (token) => <TokenObject token={token} />,
        set: (token) => <TokenSet token={token} />,
      })}
    </>
  );
}

/** Renders a single ConsoleToken as a static inline preview without nested expanders. */
function TokenPreview(props: VoidProps<{ token: unknown }>) {
  return (
    <>
      {renderTokenWithCollections(props.token, {
        array: (token) => <TokenArrayPreview token={token} />,
        map: (token) => <TokenMapPreview token={token} />,
        object: (token) => <TokenObjectPreview token={token} />,
        set: (token) => <TokenSetPreview token={token} />,
      })}
    </>
  );
}

function TokenArrayPreview(
  props: VoidProps<{ token: Extract<ConsoleToken, { type: "array" }> }>
) {
  const parts = createMemo(() => getArrayParts(props.token));
  const preview = createMemo(() => parts().elements.slice(0, 5));
  const hasMore = () => parts().length > 5;

  return (
    <span class="text-on-surface">
      <span class="opacity-50">Array({parts().length}) [</span>
      <For each={preview()}>
        {(element, index) => (
          <>
            <TokenPreview token={element} />
            <Show when={index() < preview().length - 1 || hasMore()}>
              <span class="opacity-50">, </span>
            </Show>
          </>
        )}
      </For>
      <Show when={hasMore()}>
        <Ellipsis />
      </Show>
      <span class="opacity-50">]</span>
    </span>
  );
}

function TokenArray(
  props: VoidProps<{ token: Extract<ConsoleToken, { type: "array" }> }>
) {
  const parts = createMemo(() => getArrayParts(props.token));

  return (
    <TokenExpandableCollection
      count={parts().length}
      emptyText="Array(0) []"
      preview={<TokenArrayPreview token={props.token} />}
      stateKey={props.token}
    >
      <For each={parts().elements}>
        {(element, index) => (
          <span class="flex items-baseline gap-2">
            <span class="text-on-surface-variant min-w-5 text-right opacity-50">
              {index()}:
            </span>
            <Token token={element} />
          </span>
        )}
      </For>
    </TokenExpandableCollection>
  );
}

function TokenObjectPreview(
  props: VoidProps<{ token: Extract<ConsoleToken, { type: "object" }> }>
) {
  const propertyEntries = createMemo(() => getObjectEntries(props.token));
  const preview = createMemo(() => propertyEntries().slice(0, 5));
  const hasMore = () => propertyEntries().length > 5;

  return (
    <span class="text-on-surface">
      <span class="opacity-50">{"{"}</span>
      <For each={preview()} keyed={([key]) => key}>
        {(entry, index) => (
          <>
            <span class="text-on-surface-variant opacity-80">{entry()[0]}</span>
            <span class="opacity-50">: </span>
            <TokenPreview token={entry()[1]} />
            <Show when={index() < preview().length - 1 || hasMore()}>
              <span class="opacity-50">, </span>
            </Show>
          </>
        )}
      </For>
      <Show when={hasMore()}>
        <Ellipsis />
      </Show>
      <span class="opacity-50">{"}"}</span>
    </span>
  );
}

function TokenObject(
  props: VoidProps<{ token: Extract<ConsoleToken, { type: "object" }> }>
) {
  const propertyEntries = createMemo(() => getObjectEntries(props.token));

  return (
    <TokenExpandableCollection
      count={propertyEntries().length}
      emptyText="{}"
      preview={<TokenObjectPreview token={props.token} />}
      stateKey={props.token}
    >
      <For each={propertyEntries()} keyed={([key]) => key}>
        {(entry) => (
          <span class="flex items-baseline gap-2">
            <span class="text-on-surface-variant opacity-80">
              {entry()[0]}:
            </span>
            <Token token={entry()[1]} />
          </span>
        )}
      </For>
    </TokenExpandableCollection>
  );
}

function TokenMapPreview(
  props: VoidProps<{ token: Extract<ConsoleToken, { type: "map" }> }>
) {
  const parts = createMemo(() => getMapParts(props.token));
  const preview = createMemo(() => parts().entries.slice(0, 5));
  const hasMore = () => parts().size > 5;

  return (
    <span class="text-on-surface">
      <span class="opacity-50">
        Map({parts().size}) {"{"}
      </span>
      <For each={preview()} keyed={false}>
        {(entry, index) => {
          const pair = () =>
            Array.isArray(entry()) ? entry() : ([entry(), undefined] as const);
          return (
            <>
              <TokenPreview token={pair()[0]} />
              <span class="opacity-50"> =&gt; </span>
              <TokenPreview token={pair()[1]} />
              <Show when={index < preview().length - 1 || hasMore()}>
                <span class="opacity-50">, </span>
              </Show>
            </>
          );
        }}
      </For>
      <Show when={hasMore()}>
        <Ellipsis />
      </Show>
      <span class="opacity-50">{"}"}</span>
    </span>
  );
}

function TokenMap(
  props: VoidProps<{ token: Extract<ConsoleToken, { type: "map" }> }>
) {
  const parts = createMemo(() => getMapParts(props.token));

  return (
    <TokenExpandableCollection
      count={parts().size}
      emptyText="Map(0) {}"
      preview={<TokenMapPreview token={props.token} />}
      stateKey={props.token}
    >
      <For each={parts().entries} keyed={false}>
        {(entry) => {
          const pair = () =>
            Array.isArray(entry()) ? entry() : ([entry(), undefined] as const);
          return (
            <span class="flex items-baseline gap-2">
              <Token token={pair()[0]} />
              <span class="text-on-surface-variant opacity-50">=&gt;</span>
              <Token token={pair()[1]} />
            </span>
          );
        }}
      </For>
    </TokenExpandableCollection>
  );
}

function TokenSetPreview(
  props: VoidProps<{ token: Extract<ConsoleToken, { type: "set" }> }>
) {
  const parts = createMemo(() => getSetParts(props.token));
  const preview = createMemo(() => parts().elements.slice(0, 5));
  const hasMore = () => parts().size > 5;

  return (
    <span class="text-on-surface">
      <span class="opacity-50">
        Set({parts().size}) {"{"}
      </span>
      <For each={preview()}>
        {(element, index) => (
          <>
            <TokenPreview token={element} />
            <Show when={index() < preview().length - 1 || hasMore()}>
              <span class="opacity-50">, </span>
            </Show>
          </>
        )}
      </For>
      <Show when={hasMore()}>
        <Ellipsis />
      </Show>
      <span class="opacity-50">{"}"}</span>
    </span>
  );
}

function TokenSet(
  props: VoidProps<{ token: Extract<ConsoleToken, { type: "set" }> }>
) {
  const parts = createMemo(() => getSetParts(props.token));

  return (
    <TokenExpandableCollection
      count={parts().size}
      emptyText="Set(0) {}"
      preview={<TokenSetPreview token={props.token} />}
      stateKey={props.token}
    >
      <For each={parts().elements}>
        {(element) => (
          <span class="flex items-baseline gap-2">
            <Token token={element} />
          </span>
        )}
      </For>
    </TokenExpandableCollection>
  );
}

/**
 * Molecule that renders a `ConsoleToken[]`.
 * Provides interactive expansion for structured collections (objects, arrays, maps, sets).
 */
function ConsoleTokenView(props: VoidProps<ConsoleTokenViewProps>) {
  const tokens = () => (Array.isArray(props.tokens) ? props.tokens : []);
  return (
    <span class="inline-flex flex-wrap items-baseline gap-x-1.5">
      <For each={tokens()}>{(token) => <Token token={token} />}</For>
    </span>
  );
}

/** @public */
export { ConsoleTokenView, type ConsoleTokenViewProps };
