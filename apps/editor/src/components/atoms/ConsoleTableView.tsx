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
  if (token.type === "array") {
    return token.elements.map((el, i) => ({ key: String(i), value: el }));
  }
  if (token.type === "object") {
    return Object.entries(token.properties).map(([k, v]) => ({
      key: k,
      value: v,
    }));
  }
  if (token.type === "map") {
    return token.entries.map((_, i) => ({
      key: String(i),
      value: token.entries[i][1], // We use the value for tabular expansion
    }));
  }
  if (token.type === "set") {
    return token.elements.map((el, i) => ({ key: String(i), value: el }));
  }
  return null;
}

/**
 * Extracts all unique columns from the rows.
 */
function getColumns(rows: RowData[]): string[] {
  const colSet = new Set<string>();
  let hasPrimitives = false;

  for (const row of rows) {
    const val = row.value;
    if (val.type === "object") {
      for (const k of Object.keys(val.properties)) {
        colSet.add(k);
      }
    } else if (val.type === "array") {
      for (let i = 0; i < val.elements.length; i++) {
        colSet.add(String(i));
      }
    } else {
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
  if (rowValue.type === "object" && rowValue.properties[col] !== undefined) {
    return rowValue.properties[col];
  }
  if (rowValue.type === "array" && col !== "Value") {
    const idx = Number.parseInt(col, 10);
    if (!Number.isNaN(idx) && idx >= 0 && idx < rowValue.elements.length) {
      return rowValue.elements[idx];
    }
  }
  if (
    col === "Value" &&
    rowValue.type !== "object" &&
    rowValue.type !== "array"
  ) {
    return rowValue;
  }
  return;
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
          <div class="my-2 max-w-full overflow-x-auto rounded-md border border-outline-variant shadow-sm">
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

export { ConsoleTableView, type ConsoleTableViewProps };
