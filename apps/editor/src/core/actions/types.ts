import type { EngineId } from "../engine/registry";

/**
 * Discriminated union of all editor actions.
 * Each action is a typed data object following the Command pattern.
 * UI components dispatch these; models handle them via the dispatcher.
 */
export type EditorAction =
  | { type: "RUN_CODE" }
  | { type: "INTERRUPT_EXECUTION" }
  | { type: "CLEAR_OUTPUT" }
  | { type: "SELECT_ENGINE"; engineId: EngineId }
  | { type: "UPDATE_BUFFER"; content: string };

/** Extracts the action type string literal from the union. */
export type EditorActionType = EditorAction["type"];
