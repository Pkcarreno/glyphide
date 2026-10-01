import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandId } from "../../core/shortcuts/registry.ts";
import { ActionTooltip } from "./ActionTooltip.tsx";

vi.mock("../../core/context.tsx", () => ({
  useEditor: () => ({
    shortcuts: {
      getBinding: (commandId: CommandId) => {
        if (commandId === "run-code") {
          return { commandId: "run-code", label: "Ctrl+Enter" };
        }
        if (commandId === "toggle-settings") {
          return { commandId: "toggle-settings", label: "Ctrl+," };
        }
      },
    },
  }),
}));

afterEach(() => cleanup());

describe("ActionTooltip", () => {
  it("when commandId is provided, resolves the shortcut automatically", () => {
    const { getByRole } = render(() => (
      <ActionTooltip as="button" commandId="run-code" text="Run">
        Hover me
      </ActionTooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Ctrl+Enter");
  });

  it("when another commandId is provided, matches correctly", () => {
    const { getByRole } = render(() => (
      <ActionTooltip as="button" commandId="toggle-settings" text="Settings">
        Hover me
      </ActionTooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Ctrl+,");
  });

  it("when manual shortcut is provided, renders it", () => {
    const { getByRole } = render(() => (
      <ActionTooltip as="button" shortcut="Ctrl+S" text="Save">
        Hover me
      </ActionTooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Ctrl+S");
  });

  it("when no shortcut or commandId is provided, does not render shortcut", () => {
    const { getByRole } = render(() => (
      <ActionTooltip as="button" text="Clear">
        Hover me
      </ActionTooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).not.toContain("Ctrl+Enter");
  });
});
