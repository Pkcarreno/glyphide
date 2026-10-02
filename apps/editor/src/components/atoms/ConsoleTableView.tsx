import type { ConsoleToken } from "@glyphide/quickjs-engine/types";
import { For, Show } from "solid-js";
import { ConsoleTokenView } from "../molecules/ConsoleTokenView/ConsoleTokenView.tsx";

interface ConsoleTableViewProps {
  token: ConsoleToken;
}

interface RowData {
  key: string;
  value: ConsoleToken;
}

/**
 * Normalizes a ConsoleToken into a list of rows for the table.
 * Returns null if the token is not tabular data.
 */
function getRows(token: ConsoleToken): RowData[] | null {
  const rawToken = token as unknown as {
    elements?: unknown;
    entries?: unknown;
    properties?: unknown;
    type?: unknown;
  } | null;

  if (!rawToken || typeof rawToken !== "object") {
    return null;
  }
  if (rawToken.type === "array") {
    const elements = Array.isArray(rawToken.elements) ? rawToken.elements : [];
    return elements.map((el, i) => ({
      key: String(i),
      value: el as ConsoleToken,
    }));
  }
  if (rawToken.type === "object") {
    const properties =
      rawToken.properties && typeof rawToken.properties === "object"
        ? (rawToken.properties as Record<string, ConsoleToken>)
        : {};
    return Object.entries(properties).map(([k, v]) => ({
      key: k,
      value: v,
    }));
  }
  if (rawToken.type === "map") {
    const entries = Array.isArray(rawToken.entries) ? rawToken.entries : [];
    return entries.map((entry, i) => ({
      key: String(i),
      value: Array.isArray(entry)
        ? (entry[1] as ConsoleToken)
        : (entry as ConsoleToken),
    }));
  }
  if (rawToken.type === "set") {
    const elements = Array.isArray(rawToken.elements) ? rawToken.elements : [];
    return elements.map((el, i) => ({
      key: String(i),
      value: el as ConsoleToken,
    }));
  }
  return null;
}

/**
 * Collects column names from a row value.
 * Returns true if the value is a primitive.
 */
function collectRowColumns(val: unknown, colSet: Set<string>): boolean {
  if (!val || typeof val !== "object" || !("type" in val)) {
    return true;
  }

  const rawVal = val as {
    elements?: unknown;
    properties?: unknown;
    type?: unknown;
  };
  if (rawVal.type === "object") {
    const properties =
      rawVal.properties && typeof rawVal.properties === "object"
        ? (rawVal.properties as Record<string, unknown>)
        : {};
    for (const k of Object.keys(properties)) {
      colSet.add(k);
    }
    return false;
  }

  if (rawVal.type === "array") {
    const elements = Array.isArray(rawVal.elements) ? rawVal.elements : [];
    for (let i = 0; i < elements.length; i += 1) {
      colSet.add(String(i));
    }
    return false;
  }

  return true;
}

/**
 * Extracts all unique columns from the rows.
 */
function getColumns(rows: RowData[]): string[] {
  const colSet = new Set<string>();
  let hasPrimitives = false;

  for (const row of rows) {
    if (collectRowColumns(row.value, colSet)) {
      hasPrimitives = true;
    }
  }

  const cols = Array.from(colSet);
  // If there are no object/array properties but there are primitives, we just show a Value column
  if (hasPrimitives && cols.length === 0) {
    cols.push("Value");
  }
  return cols;
}

/**
 * Extracts the cell token for a given row and column.
 */
function getCellToken(
  rowValue: ConsoleToken,
  col: string
): ConsoleToken | undefined {
  const rawValue = rowValue as unknown as {
    elements?: unknown;
    properties?: unknown;
    type?: unknown;
  } | null;

  if (!rawValue || typeof rawValue !== "object") {
    if (col === "Value") {
      return rowValue;
    }
    return undefined;
  }
  if (rawValue.type === "object") {
    const properties =
      rawValue.properties && typeof rawValue.properties === "object"
        ? (rawValue.properties as Record<string, ConsoleToken>)
        : {};
    return properties[col];
  }
  if (rawValue.type === "array") {
    if (col !== "Value") {
      const elements = Array.isArray(rawValue.elements)
        ? rawValue.elements
        : [];
      const idx = Number.parseInt(col, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < elements.length) {
        return elements[idx] as ConsoleToken;
      }
    }
    return undefined;
  }
  if (col === "Value") {
    return rowValue;
  }
}

/**
 * Renders tabular data (Array, Object, Map, Set) as an HTML table.
 * If the token is not tabular, it falls back to ConsoleTokenView.
 */
function ConsoleTableView(props: ConsoleTableViewProps) {
  const rows = () => getRows(props.token);

  return (
    <Show fallback={<ConsoleTokenView tokens={[props.token]} />} when={rows()}>
      {(resolvedRows) => {
        const cols = () => getColumns(resolvedRows());

        return (
          <div class="my-2 w-full overflow-x-auto rounded-md border border-outline-variant shadow-sm">
            <table class="w-full min-w-max table-auto border-collapse text-left text-sm">
              <thead class="bg-surface-variant font-medium text-on-surface-variant">
                <tr>
                  <th class="select-none border-outline-variant border-b px-3 py-1.5 font-medium">
                    (index)
                  </th>
                  <For each={cols()}>
                    {(col) => (
                      <th class="select-none border-outline-variant border-b px-3 py-1.5 font-medium">
                        {col}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant bg-surface">
                <For each={resolvedRows()}>
                  {(row) => (
                    <tr class="transition-colors hover:bg-surface-variant/50">
                      <td class="select-none px-3 py-1.5 align-top font-bold text-on-surface-variant">
                        {row.key}
                      </td>
                      <For each={cols()}>
                        {(col) => {
                          const cellToken = getCellToken(row.value, col);
                          return (
                            <td class="px-3 py-1.5 align-top">
                              <Show
                                fallback={<span class="opacity-0">-</span>}
                                when={cellToken}
                              >
                                {(token) => (
                                  <ConsoleTokenView tokens={[token()]} />
                                )}
                              </Show>
                            </td>
                          );
                        }}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        );
      }}
    </Show>
  );
}

/** @public */
export { ConsoleTableView, type ConsoleTableViewProps };
