import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import App from "./App";

describe("App", () => {
  it("renders the EditorPage component", () => {
    const { getByText } = render(() => <App />);
    expect(getByText("[ UNTITLED_PROJECT ]")).toBeTruthy();
  });
});
