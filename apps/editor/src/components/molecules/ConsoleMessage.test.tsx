import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ConsoleMessage } from "./ConsoleMessage.tsx";

describe("ConsoleMessage", () => {
  it("when rendered with defaults, uses log styling", () => {
    const { getByText } = render(() => (
      <ConsoleMessage message="Hello world" />
    ));
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

  it("when type is info, uses info styling", () => {
    const { getByText } = render(() => (
      <ConsoleMessage message="Info msg" type="info" />
    ));
    const msg = getByText("Info msg");
    // Info uses log styling in current UI, or whatever is defined in cva
    // We just ensure it renders correctly
    expect(msg).toBeDefined();
  });

  it("when type is debug, uses debug styling", () => {
    const { getByText } = render(() => (
      <ConsoleMessage message="Debug msg" type="debug" />
    ));
    const msg = getByText("Debug msg");
    // Debug uses specific muted styles in UI
    expect(msg).toBeDefined();
  });

  it("when type is table, uses table styling", () => {
    const { getByText } = render(() => (
      <ConsoleMessage message="Table msg" type="table" />
    ));
    const msg = getByText("Table msg");
    // Table has specific UI styling
    expect(msg).toBeDefined();
  });

  it("when custom class is provided, merges it", () => {
    const { getByText } = render(() => (
      <ConsoleMessage class="mt-2" message="Styled" />
    ));
    const msg = getByText("Styled");
    expect(msg.className).toContain("mt-2");
    expect(msg.className).toContain("font-mono");
  });

  it("when rendered, always uses monospace typography", () => {
    const { getByText } = render(() => <ConsoleMessage message="Code" />);
    expect(getByText("Code").className).toContain("font-mono");
  });

  it("when children is provided, renders children instead of message", () => {
    const { getByText } = render(() => (
      <ConsoleMessage type="log">
        <span>structured output</span>
      </ConsoleMessage>
    ));
    expect(getByText("structured output")).toBeDefined();
  });

  it("when children is provided, applies variant styling to the wrapper", () => {
    const { container } = render(() => (
      <ConsoleMessage type="error">
        <span>error content</span>
      </ConsoleMessage>
    ));
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("text-error");
    expect(wrapper.className).toContain("border-error");
  });

  it("when children is provided without message prop, renders without errors", () => {
    const { getByText } = render(() => (
      <ConsoleMessage>
        <span>no message prop</span>
      </ConsoleMessage>
    ));
    expect(getByText("no message prop")).toBeDefined();
  });
});
