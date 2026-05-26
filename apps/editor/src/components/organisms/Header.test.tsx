import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  it("when rendered, displays the app title", () => {
    const { getByText } = render(() => <Header />);
    expect(getByText("[ UNTITLED_PROJECT ]")).toBeTruthy();
  });

  it("when settings button clicked, fires onSettingsClick", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => <Header onSettingsClick={handler} />);
    getByRole("button", { name: "Settings" }).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when share button clicked, fires onShareClick", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => <Header onShareClick={handler} />);
    getByRole("button", { name: "Share workspace" }).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when run button clicked, fires onRunClick", () => {
    const handler = vi.fn();
    const { getAllByRole } = render(() => <Header onRunClick={handler} />);
    // The main button inside SplitButton renders its children as text
    const buttons = getAllByRole("button", { name: /Run/ });
    buttons[0].click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when run options clicked, fires onRunOptionsClick", () => {
    const handler = vi.fn();
    const { getByRole } = render(() => <Header onRunOptionsClick={handler} />);
    getByRole("button", { name: "Run options" }).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("when custom class is provided, merges it", () => {
    const { container } = render(() => <Header class="mb-4" />);
    expect(container.firstElementChild?.className).toContain("mb-4");
  });
});
