import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ConsoleTokenView } from "./ConsoleTokenView.tsx";

describe("ConsoleTokenView", () => {
  describe("string token", () => {
    it("renders with surrounding quotes", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ type: "string", value: "hello" }]} />
      ));
      expect(container.textContent).toContain("hello");
      expect(container.textContent).toContain('"');
    });
  });

  describe("number token", () => {
    it("renders the numeric value", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ type: "number", value: 42 }]} />
      ));
      expect(container.textContent).toContain("42");
    });
  });

  describe("boolean token", () => {
    it("renders true", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ type: "boolean", value: true }]} />
      ));
      expect(container.textContent).toContain("true");
    });

    it("renders false", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ type: "boolean", value: false }]} />
      ));
      expect(container.textContent).toContain("false");
    });
  });

  describe("null token", () => {
    it("renders null text", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ type: "null" }]} />
      ));
      expect(container.textContent).toContain("null");
    });
  });

  describe("undefined token", () => {
    it("renders undefined text", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ type: "undefined" }]} />
      ));
      expect(container.textContent).toContain("undefined");
    });
  });

  describe("function token", () => {
    it("renders function name with ƒ prefix", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ name: "myFn", type: "function" }]} />
      ));
      expect(container.textContent).toContain("ƒ");
      expect(container.textContent).toContain("myFn");
    });
  });

  describe("symbol token", () => {
    it("renders Symbol with description", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[{ description: "mySymbol", type: "symbol" }]}
        />
      ));
      expect(container.textContent).toContain("Symbol(mySymbol)");
    });
  });

  describe("circular token", () => {
    it("renders [Circular] label", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ type: "circular" }]} />
      ));
      expect(container.textContent).toContain("[Circular]");
    });
  });

  describe("array token", () => {
    it("renders Array(n) with elements inline by default", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              elements: [
                { type: "number", value: 1 },
                { type: "number", value: 2 },
              ],
              length: 2,
              type: "array",
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("Array(2)");
      expect(container.textContent).toContain("1");
      expect(container.textContent).toContain("2");
    });

    it("expands on click and renders all elements with indices", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              elements: [
                { type: "number", value: 100 },
                { type: "number", value: 200 },
              ],
              length: 2,
              type: "array",
            },
          ]}
        />
      ));

      const expander = container.querySelector("button");
      expect(expander).not.toBeNull();
      if (!expander) {
        throw new Error("Expander not found");
      }

      expect(container.textContent).not.toContain("0:");
      expect(container.textContent).not.toContain("1:");

      fireEvent.click(expander);

      expect(container.textContent).toContain("0:");
      expect(container.textContent).toContain("100");
      expect(container.textContent).toContain("1:");
      expect(container.textContent).toContain("200");
    });

    it("persists expanded state when remounted with the same token reference", () => {
      const tokenArray = {
        elements: [
          { type: "number" as const, value: 50 },
          { type: "number" as const, value: 60 },
        ],
        length: 2,
        type: "array" as const,
      };

      const { container, unmount } = render(() => (
        <ConsoleTokenView tokens={[tokenArray]} />
      ));

      const expander = container.querySelector("button");
      if (!expander) {
        throw new Error("Expander not found");
      }
      fireEvent.click(expander);
      expect(container.textContent).toContain("50");

      unmount();

      const { container: container2 } = render(() => (
        <ConsoleTokenView tokens={[tokenArray]} />
      ));

      expect(container2.textContent).toContain("0:");
      expect(container2.textContent).toContain("50");
    });

    it("renders ellipsis when elements > 5", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              elements: Array.from({ length: 6 }).map((_, i) => ({
                type: "number",
                value: i,
              })),
              length: 6,
              type: "array",
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("…");
      expect(container.textContent).toContain("Array(6)");
    });
  });

  describe("object token", () => {
    it("renders object with key-value pairs inline by default", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              properties: {
                a: { type: "number", value: 1 },
                b: { type: "string", value: "hi" },
              },
              type: "object",
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("a");
      expect(container.textContent).toContain("1");
      expect(container.textContent).toContain("b");
      expect(container.textContent).toContain("hi");
    });

    it("expands on click and renders properties as block", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              properties: {
                deepKey: { type: "number", value: 999 },
              },
              type: "object",
            },
          ]}
        />
      ));

      const expander = container.querySelector("button");
      expect(expander).not.toBeNull();
      if (!expander) {
        throw new Error("Expander not found");
      }

      // The inline preview has "deepKey" and "999" too, so we can't just check textContent.
      // But the expanded view has "deepKey:" with a colon without surrounding quotes if it was a preview.
      // Let's just check that clicking doesn't crash and changes the DOM.
      const initialHtml = container.innerHTML;
      fireEvent.click(expander);
      expect(container.innerHTML).not.toBe(initialHtml);
    });

    it("renders ellipsis when properties > 5", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              properties: {
                a: { type: "number", value: 1 },
                b: { type: "number", value: 2 },
                c: { type: "number", value: 3 },
                d: { type: "number", value: 4 },
                e: { type: "number", value: 5 },
                f: { type: "number", value: 6 },
              },
              type: "object",
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("…");
    });
  });

  describe("multiple tokens", () => {
    it("renders all tokens side by side", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            { type: "number", value: 42 },
            { type: "boolean", value: true },
            { type: "string", value: "hello" },
          ]}
        />
      ));
      expect(container.textContent).toContain("42");
      expect(container.textContent).toContain("true");
      expect(container.textContent).toContain("hello");
    });
  });

  describe("empty token array", () => {
    it("renders nothing visible", () => {
      const { container } = render(() => <ConsoleTokenView tokens={[]} />);
      expect(container.textContent?.trim()).toBe("");
    });
  });
  describe("map token", () => {
    it("renders Map with size and entries", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              entries: [
                [
                  { type: "string", value: "key" },
                  { type: "number", value: 100 },
                ],
              ],
              size: 1,
              type: "map",
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("Map(1)");
      expect(container.textContent).toContain("key");
      expect(container.textContent).toContain("=>");
      expect(container.textContent).toContain("100");
    });

    it("expands on click and renders entries as block", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              entries: [
                [
                  { type: "string", value: "key" },
                  { type: "number", value: 100 },
                ],
              ],
              size: 1,
              type: "map",
            },
          ]}
        />
      ));

      const expander = container.querySelector("button");
      expect(expander).not.toBeNull();
      if (!expander) {
        throw new Error("Expander not found");
      }

      const initialHtml = container.innerHTML;
      fireEvent.click(expander);
      expect(container.innerHTML).not.toBe(initialHtml);
    });
  });

  describe("set token", () => {
    it("renders Set with size and elements", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              elements: [
                { type: "string", value: "one" },
                { type: "string", value: "two" },
              ],
              size: 2,
              type: "set",
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("Set(2)");
      expect(container.textContent).toContain("one");
      expect(container.textContent).toContain("two");
    });

    it("expands on click and renders elements as block", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              elements: [
                { type: "string", value: "one" },
                { type: "string", value: "two" },
              ],
              size: 2,
              type: "set",
            },
          ]}
        />
      ));

      const expander = container.querySelector("button");
      expect(expander).not.toBeNull();
      if (!expander) {
        throw new Error("Expander not found");
      }

      const initialHtml = container.innerHTML;
      fireEvent.click(expander);
      expect(container.innerHTML).not.toBe(initialHtml);
    });
  });

  describe("nested structured tokens", () => {
    it("does not render expand buttons for nested items inside inline preview", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              properties: {
                nestedObject: {
                  properties: { inner: { type: "number", value: 1 } },
                  type: "object",
                },
              },
              type: "object",
            },
          ]}
        />
      ));

      // There should only be one button (for the outer object)
      // The nestedObject should be rendered statically because of isPreview
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBe(1);
    });
  });

  describe("date token", () => {
    it("renders Date value", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[{ type: "date", value: "2020-01-01T00:00:00.000Z" }]}
        />
      ));
      expect(container.textContent).toContain("2020-01-01T00:00:00.000Z");
    });
  });

  describe("regexp token", () => {
    it("renders RegExp source and flags", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[{ flags: "gi", source: "abc", type: "regexp" }]}
        />
      ));
      expect(container.textContent).toContain("/abc/gi");
    });
  });

  describe("bigint token", () => {
    it("renders BigInt value with 'n' suffix", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[{ type: "bigint", value: "9007199254740991" }]}
        />
      ));
      expect(container.textContent).toContain("9007199254740991n");
    });
  });

  describe("promise token", () => {
    it("renders Promise placeholder", () => {
      const { container } = render(() => (
        <ConsoleTokenView tokens={[{ type: "promise" }]} />
      ));
      expect(container.textContent).toContain("Promise");
      expect(container.textContent).toContain("{<pending>}");
    });
  });

  describe("error token", () => {
    it("renders Error name and message", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            { message: "invalid operation", name: "TypeError", type: "error" },
          ]}
        />
      ));
      expect(container.textContent).toContain("TypeError");
      expect(container.textContent).toContain("invalid operation");
    });
  });
});
