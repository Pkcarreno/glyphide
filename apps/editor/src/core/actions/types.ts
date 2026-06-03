import type { EngineId } from "../engine/registry.ts";

/**
 * Discriminated union of all editor actions.
 * Each action is a typed data object following the Command pattern.
 * UI components dispatch these; models handle them via the dispatcher.
 */
export type EditorAction =
  | { type: "RUN_CODE" }
  | { type: "INTERRUPT_EXECUTION" }
  | { type: "CLEAR_OUTPUT" }
  | { type: "SELECT_ENGINE_ENTRY"; engineId: EngineId; language: string }
  | { type: "UPDATE_ENGINE_CONFIG"; patch: Record<string, unknown> }
  | { type: "RETRY_ENGINE_INIT" }
  | { type: "UPDATE_BUFFER"; content: string }
  | {
      type: "UPDATE_CURSOR_POSITION";
      line: number;
      column: number;
      selectionLength: number;
      selectionLines: number;
    }
  | { type: "RENAME_PROJECT"; name: string }
  | { type: "OPEN_OVERLAY"; overlayId: OverlayId }
  | { type: "CLOSE_OVERLAY"; overlayId: OverlayId }
  | { type: "TOGGLE_OVERLAY"; overlayId: OverlayId }
  | { type: "CLOSE_ALL_OVERLAYS" }
  | {
      type: "DISPATCH_NOTIFICATION";
      action?: { label: string; onClick: () => void };
      title: string;
      description?: string;
      notificationType?: "info" | "success" | "warning" | "error";
    }
  | { type: "DISMISS_TOAST"; id: string };

/** Uniquely identifies an overlay (modal, menu, etc). */
export type OverlayId = string;

/** Extracts the action type string literal from the union. */
export type EditorActionType = EditorAction["type"];
