import type { JSX as WebJSX } from "@solidjs/web";
import { omit } from "solid-js";

export { createContext, createMemo, For, useContext } from "solid-js";

// Lucide's declarations still reference the Solid 1 JSX type names.
declare module "solid-js" {
  // biome-ignore lint/style/noNamespace: Lucide refers to JSX.Element in this namespace.
  namespace JSX {
    type Element = WebJSX.Element;
  }
  type JSXElement = WebJSX.Element;
}

// Lucide still reads its Solid 1 prop groups. Keep its getter behavior on Solid 2.
export function splitProps(
  props: Record<string, unknown>,
  keys: readonly string[]
) {
  const selected: Record<string, unknown> = {};
  for (const key of keys) {
    Object.defineProperty(selected, key, {
      enumerable: true,
      get: () => props[key],
    });
  }
  return [selected, omit(props, ...keys)] as const;
}
