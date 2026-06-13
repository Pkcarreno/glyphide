import { render } from "@solidjs/testing-library";
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
        <ConsoleTokenView tokens={[{ type: "function", name: "myFn" }]} />
      ));
      expect(container.textContent).toContain("ƒ");
      expect(container.textContent).toContain("myFn");
    });
  });

  describe("symbol token", () => {
    it("renders Symbol with description", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[{ type: "symbol", description: "mySymbol" }]}
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
    it("renders Array(n) with elements", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              type: "array",
              length: 2,
              elements: [
                { type: "number", value: 1 },
                { type: "number", value: 2 },
              ],
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("Array(2)");
      expect(container.textContent).toContain("1");
      expect(container.textContent).toContain("2");
    });
  });

  describe("object token", () => {
    it("renders object with key-value pairs", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              type: "object",
              properties: {
                a: { type: "number", value: 1 },
                b: { type: "string", value: "hi" },
              },
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("a");
      expect(container.textContent).toContain("1");
      expect(container.textContent).toContain("b");
      expect(container.textContent).toContain("hi");
    });
  });

  describe("depth cap", () => {
    it("renders … truncation marker at depth >= 3", () => {
      // Object at depth 0 → value at depth 1 → value at depth 2 → value at depth 3 = truncated
      const deepToken = {
        type: "object" as const,
        properties: {
          a: {
            type: "object" as const,
            properties: {
              b: {
                type: "object" as const,
                properties: {
                  c: { type: "number" as const, value: 99 },
                },
              },
            },
          },
        },
      };

      const { container } = render(() => (
        <ConsoleTokenView tokens={[deepToken]} />
      ));
      // The number 99 is at depth 3, so it should be truncated
      expect(container.textContent).not.toContain("99");
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
              type: "map",
              size: 1,
              entries: [
                [
                  { type: "string", value: "key" },
                  { type: "number", value: 100 },
                ],
              ],
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("Map(1)");
      expect(container.textContent).toContain("key");
      expect(container.textContent).toContain("=>");
      expect(container.textContent).toContain("100");
    });
  });

  describe("set token", () => {
    it("renders Set with size and elements", () => {
      const { container } = render(() => (
        <ConsoleTokenView
          tokens={[
            {
              type: "set",
              size: 2,
              elements: [
                { type: "string", value: "one" },
                { type: "string", value: "two" },
              ],
            },
          ]}
        />
      ));
      expect(container.textContent).toContain("Set(2)");
      expect(container.textContent).toContain("one");
      expect(container.textContent).toContain("two");
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
          tokens={[{ type: "regexp", source: "abc", flags: "gi" }]}
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
            { type: "error", name: "TypeError", message: "invalid operation" },
          ]}
        />
      ));
      expect(container.textContent).toContain("TypeError");
      expect(container.textContent).toContain("invalid operation");
    });
  });
});
