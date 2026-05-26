import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ConsoleMessage } from "./ConsoleMessage";

describe("ConsoleMessage", () => {
  it("when rendered with defaults, uses log styling", () => {
    const { getByText } = render(() => <ConsoleMessage message="Hello world" />);
    const msg = getByText("Hello world");
    expect(msg.className).toContain("text-on-surface");
    expect(msg.className).toContain("border-transparent");
  });

  it("when type is warn, uses warning styling", () => {
    const { getByText } = render(() => (
      <ConsoleMessage message="Deprecation" type="warn" />
    ));
    const msg = getByText("Deprecation");
    expect(msg.className).toContain("text-log-warn");
    expect(msg.className).toContain("border-log-warn");
  });

  it("when type is error, uses error styling", () => {
    const { getByText } = render(() => (
      <ConsoleMessage message="Failure" type="error" />
    ));
    const msg = getByText("Failure");
    expect(msg.className).toContain("text-error");
    expect(msg.className).toContain("border-error");
  });

  it("when type is system, uses system styling", () => {
    const { getByText } = render(() => (
      <ConsoleMessage message="Booting..." type="system" />
    ));
    const msg = getByText("Booting...");
    expect(msg.className).toContain("text-on-surface-variant");
    expect(msg.className).toContain("italic");
  });

  it("when custom class is provided, merges it", () => {
    const { getByText } = render(() => (
      <ConsoleMessage message="Styled" class="mt-2" />
    ));
    const msg = getByText("Styled");
    expect(msg.className).toContain("mt-2");
    expect(msg.className).toContain("font-mono");
  });

  it("when rendered, always uses monospace typography", () => {
    const { getByText } = render(() => <ConsoleMessage message="Code" />);
    expect(getByText("Code").className).toContain("font-mono");
  });
});
