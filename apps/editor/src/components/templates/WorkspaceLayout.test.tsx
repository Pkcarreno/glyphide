import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { WorkspaceLayout } from "./WorkspaceLayout.tsx";

describe("WorkspaceLayout", () => {
  const DummyChild = (props: { text: string }) => <div>{props.text}</div>;

  it("when rendered, displays all slot children", () => {
    const { getByText } = render(() => (
      <WorkspaceLayout
        consolePane={<DummyChild text="Console" />}
        editorPane={<DummyChild text="Editor" />}
        header={<DummyChild text="Header" />}
        statusBar={<DummyChild text="Status" />}
      />
    ));

    expect(getByText("Header")).toBeTruthy();
    expect(getByText("Editor")).toBeTruthy();
    expect(getByText("Console")).toBeTruthy();
    expect(getByText("Status")).toBeTruthy();
  });

  it("when rendered, uses flex-col on mobile and flex-row on desktop", () => {
    const { container } = render(() => (
      <WorkspaceLayout
        consolePane={<div />}
        editorPane={<div />}
        header={<div />}
        statusBar={<div />}
      />
    ));

    const main = container.querySelector("main");
    expect(main?.className).toContain("flex-col");
    expect(main?.className).toContain("md:flex-row");
  });

  it("when custom class is provided, merges it to root", () => {
    const { container } = render(() => (
      <WorkspaceLayout
        class="custom-theme"
        consolePane={<div />}
        editorPane={<div />}
        header={<div />}
        statusBar={<div />}
      />
    ));

    expect(container.firstElementChild?.className).toContain("custom-theme");
    expect(container.firstElementChild?.className).toContain("flex-col");
  });
});
