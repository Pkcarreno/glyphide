import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { SettingsModal } from "./SettingsModal";
import { createSignal } from "solid-js";

describe("SettingsModal", () => {
  it("when isOpen is false, modal is not in the DOM", () => {
    const { queryByRole } = render(() => (
      <SettingsModal isOpen={false} onOpenChange={() => {}} />
    ));
    expect(queryByRole("dialog")).toBeNull();
  });

  it("when isOpen is true, modal is rendered with title", () => {
    const { getByRole, getByText } = render(() => (
      <SettingsModal isOpen={true} onOpenChange={() => {}} />
    ));
    expect(getByRole("dialog")).toBeTruthy();
    expect(getByText("Settings")).toBeTruthy();
  });

  it("when rendered, contains settings sections and switches", () => {
    const { getAllByText, getAllByRole } = render(() => (
      <SettingsModal isOpen={true} onOpenChange={() => {}} />
    ));
    expect(getAllByText("Appearance").length).toBeGreaterThan(0);
    expect(getAllByText("Execution").length).toBeGreaterThan(0);
    
    // 4 switches total based on our mockup
    expect(getAllByRole("switch")).toHaveLength(4);
  });

  it("when close button clicked, fires onOpenChange with false", () => {
    const handler = vi.fn();
    const { getAllByRole } = render(() => (
      <SettingsModal isOpen={true} onOpenChange={handler} />
    ));
    getAllByRole("button", { name: "Close settings" })[0].click();
    expect(handler).toHaveBeenCalledWith(false);
  });

  it("when controlled via state, opens and closes", () => {
    const [isOpen, setIsOpen] = createSignal(false);
    const { queryByRole } = render(() => (
      <SettingsModal isOpen={isOpen()} onOpenChange={setIsOpen} />
    ));
    
    expect(queryByRole("dialog")).toBeNull();
    setIsOpen(true);
    expect(queryByRole("dialog")).not.toBeNull();
  });
});
