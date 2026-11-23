import { omit } from "solid-js";

export { createContext, createMemo, For, useContext } from "solid-js";

// Lucide still reads its Solid 1 prop groups. Keep its getter behavior on Solid 2.
export function splitProps<T extends object, K extends keyof T>(
  props: T,
  keys: readonly K[]
): [Pick<T, K>, Omit<T, K>] {
  const selected = {} as Pick<T, K>;
  for (const key of keys) {
    Object.defineProperty(selected, key, {
      enumerable: true,
      get: () => props[key],
    });
  }
  return [selected, omit(props, ...keys)];
}
