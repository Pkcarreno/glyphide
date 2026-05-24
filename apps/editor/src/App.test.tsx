import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { App } from "./App";

describe("App", () => {
  it("renders the editor title", () => {
    const { getByText } = render(() => <App />);
    expect(getByText("Glyphide editor")).toBeDefined();
  });
});
