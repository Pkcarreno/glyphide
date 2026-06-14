import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "./Tooltip.tsx";

vi.mock("../../core/context.tsx", () => ({
  useEditor: () => ({
    shortcuts: {
      bindings: [
        {
          action: { type: "RUN_CODE" },
          label: "Ctrl+Enter",
        },
        {
          action: { type: "TOGGLE_OVERLAY", overlayId: "settings" },
          label: "Ctrl+,",
        },
      ],
    },
  }),
}));

afterEach(() => cleanup());

describe("Tooltip (Molecule)", () => {
  it("when action is provided, resolves the shortcut automatically", () => {
    const { getByRole } = render(() => (
      <Tooltip action={{ type: "RUN_CODE" } as const} as="button" text="Run">
        Hover me
      </Tooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Ctrl+Enter");
  });

  it("when complex action is provided, matches correctly", () => {
    const { getByRole } = render(() => (
      <Tooltip
        action={{ type: "TOGGLE_OVERLAY", overlayId: "settings" } as const}
        as="button"
        text="Settings"
      >
        Hover me
      </Tooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Ctrl+,");
  });

  it("when action not found, does not render shortcut", () => {
    const { getByRole } = render(() => (
      <Tooltip action={{ type: "CLEAR_OUTPUT" }} as="button" text="Clear">
        Hover me
      </Tooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).not.toContain("Ctrl+Enter");
  });
});
