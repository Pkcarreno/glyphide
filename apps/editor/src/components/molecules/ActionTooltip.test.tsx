import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionTooltip } from "./ActionTooltip.tsx";

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

describe("ActionTooltip", () => {
  it("when action is provided, resolves the shortcut automatically", () => {
    const { getByRole } = render(() => (
      <ActionTooltip
        action={{ type: "RUN_CODE" } as const}
        as="button"
        text="Run"
      >
        Hover me
      </ActionTooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Ctrl+Enter");
  });

  it("when complex action is provided, matches correctly", () => {
    const { getByRole } = render(() => (
      <ActionTooltip
        action={{ type: "TOGGLE_OVERLAY", overlayId: "settings" } as const}
        as="button"
        text="Settings"
      >
        Hover me
      </ActionTooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Ctrl+,");
  });

  it("when action not found, does not render shortcut", () => {
    const { getByRole } = render(() => (
      <ActionTooltip action={{ type: "CLEAR_OUTPUT" }} as="button" text="Clear">
        Hover me
      </ActionTooltip>
    ));

    fireEvent.mouseEnter(getByRole("button"));
    const popup = screen.queryByRole("tooltip");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).not.toContain("Ctrl+Enter");
  });
});
