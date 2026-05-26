import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { WorkspaceLayout } from "./WorkspaceLayout";

describe("WorkspaceLayout", () => {
  const DummyChild = (props: { text: string }) => <div>{props.text}</div>;

  it("when rendered, displays all slot children", () => {
    const { getByText } = render(() => (
      <WorkspaceLayout
        header={<DummyChild text="Header" />}
        editorPane={<DummyChild text="Editor" />}
        consolePane={<DummyChild text="Console" />}
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
        header={<div />}
        editorPane={<div />}
        consolePane={<div />}
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
        header={<div />}
        editorPane={<div />}
        consolePane={<div />}
        statusBar={<div />}
        class="custom-theme"
      />
    ));
    
    expect(container.firstElementChild?.className).toContain("custom-theme");
    expect(container.firstElementChild?.className).toContain("flex-col");
  });
});
