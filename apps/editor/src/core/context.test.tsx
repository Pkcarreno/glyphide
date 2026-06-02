import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { EditorProvider, useEditor } from "./context.tsx";

function TestComponent() {
  const core = useEditor();
  return (
    <div data-testid="test-comp">{core ? "Core Injected" : "No Core"}</div>
  );
}

describe("EditorContext", () => {
  it("provides EditorCore to children", () => {
    render(() => (
      <EditorProvider>
        <TestComponent />
      </EditorProvider>
    ));

    expect(screen.getByTestId("test-comp").textContent).toBe("Core Injected");
  });

  it("throws when useEditor is used outside provider", () => {
    expect(() => {
      render(() => <TestComponent />);
    }).toThrow("useEditor must be called within an <EditorProvider>.");
  });
});
