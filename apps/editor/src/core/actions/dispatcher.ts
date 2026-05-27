import type { EditorAction, EditorActionType } from "./types";

/** Callback signature for action handlers. */
type ActionHandler<T extends EditorAction = EditorAction> = (
  action: T,
) => void;

/**
 * Central pub/sub action router.
 * Decouples UI event sources (buttons, shortcuts, command palette)
 * from business logic handlers (models).
 */
export interface ActionDispatcher {
  /**
   * Registers a handler for a specific action type.
   * Returns an unsubscribe function.
   */
  on<T extends EditorActionType>(
    actionType: T,
    handler: ActionHandler<Extract<EditorAction, { type: T }>>,
  ): () => void;

  /** Dispatches an action to all registered handlers for its type. */
  dispatch(action: EditorAction): void;
}

/** Creates a new `ActionDispatcher` instance. */
export function createActionDispatcher(): ActionDispatcher {
  const handlers = new Map<string, Set<ActionHandler>>();

  function on<T extends EditorActionType>(
    actionType: T,
    handler: ActionHandler<Extract<EditorAction, { type: T }>>,
  ): () => void {
    if (!handlers.has(actionType)) {
      handlers.set(actionType, new Set());
    }
    const handlerSet = handlers.get(actionType)!;
    handlerSet.add(handler as ActionHandler);
    return () => handlerSet.delete(handler as ActionHandler);
  }

  function dispatch(action: EditorAction): void {
    const listeners = handlers.get(action.type);
    if (listeners) {
      for (const handler of listeners) {
        handler(action);
      }
    }
  }

  return { on, dispatch };
}
