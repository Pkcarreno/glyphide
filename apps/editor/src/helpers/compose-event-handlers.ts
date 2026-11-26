type ComposableEvent<T, E extends Event> = E & {
  currentTarget: T;
  target: never;
};

type ComposableCallback<T, E extends Event> = (
  event: ComposableEvent<T, E>
) => void;

interface ComposableBoundTuple<T, E extends Event> {
  0: (data: never, event: ComposableEvent<T, E>) => void;
  1: unknown;
}

/**
 * Any Solid event callback, bound `[handler, data]` tuple, or `undefined`.
 */
type ComposableEventHandler<T = never, E extends Event = Event> =
  | ComposableCallback<T, E>
  | ComposableBoundTuple<T, E>
  | undefined;

function invokeEventHandler<E extends Event>(
  handler: ComposableEventHandler<never, E>,
  event: E
): void {
  if (typeof handler === "function") {
    handler(event as ComposableEvent<never, E>);
    return;
  }

  if (Array.isArray(handler) && typeof handler[0] === "function") {
    (handler[0] as (data: unknown, event: E) => void)(handler[1], event);
  }
}

/**
 * Chains internal and external Solid event handlers in order.
 * Supports plain callbacks, bound `[handler, data]` tuples, and `undefined`.
 */
export function composeEventHandlers<T = never, E extends Event = Event>(
  ...handlers: ComposableEventHandler<T, E>[]
): (event: E) => void {
  return (event: E) => {
    for (const handler of handlers) {
      invokeEventHandler(handler as ComposableEventHandler<never, E>, event);
    }
  };
}
