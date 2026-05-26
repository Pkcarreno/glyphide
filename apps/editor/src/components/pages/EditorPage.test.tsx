import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import EditorPage from "./EditorPage";

// Mock alert to prevent vitest stalling on handleShareClick etc.
vi.stubGlobal("alert", vi.fn());

describe("EditorPage", () => {
  it("when rendered, displays the full application layout", () => {
    const { getByText, getByRole } = render(() => <EditorPage />);
    
    expect(getByText("[ UNTITLED_PROJECT ]")).toBeTruthy();
    expect(getByText("Output")).toBeTruthy();
    expect(getByText("Idle")).toBeTruthy();
    expect(getByRole("main")).toBeTruthy();
  });

  it("when settings button is clicked, modal opens", () => {
    const { getByRole, queryByRole, getByLabelText } = render(() => <EditorPage />);
    
    expect(queryByRole("dialog")).toBeNull();
    getByLabelText("Settings").click();
    expect(queryByRole("dialog")).toBeTruthy();
  });

  it("when run button is clicked, status updates to running", () => {
    const { getByText, getAllByRole } = render(() => <EditorPage />);
    
    expect(getByText("Idle")).toBeTruthy();
    
    const runButtons = getAllByRole("button", { name: /Run/ });
    runButtons[0].click();
    
    expect(getByText("Running")).toBeTruthy();
  });
});
