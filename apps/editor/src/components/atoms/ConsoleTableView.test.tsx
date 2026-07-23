import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ConsoleTableView } from "./ConsoleTableView.tsx";

describe("ConsoleTableView", () => {
  describe("array token", () => {
    it("renders as table with indices", () => {
      const { container } = render(() => (
        <ConsoleTableView
          token={{
            elements: [
              { type: "number", value: 42 },
              { type: "string", value: "hello" },
            ],
            length: 2,
            type: "array",
          }}
        />
      ));

      const headers = container.querySelectorAll("th");
      expect(headers).toHaveLength(2);
      expect(headers[0].textContent).toContain("(index)");
      expect(headers[1].textContent).toContain("Value");

      const rows = container.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(2);

      expect(rows[0].querySelector("td:nth-child(1)")?.textContent).toContain(
        "0"
      );
      expect(rows[0].querySelector("td:nth-child(2)")?.textContent).toContain(
        "42"
      );

      expect(rows[1].querySelector("td:nth-child(1)")?.textContent).toContain(
        "1"
      );
      expect(rows[1].querySelector("td:nth-child(2)")?.textContent).toContain(
        "hello"
      );
    });

    it("renders array of objects", () => {
      const { container } = render(() => (
        <ConsoleTableView
          token={{
            elements: [
              {
                properties: { a: { type: "number", value: 1 } },
                type: "object",
              },
              {
                properties: {
                  a: { type: "number", value: 2 },
                  b: { type: "string", value: "hi" },
                },
                type: "object",
              },
            ],
            length: 2,
            type: "array",
          }}
        />
      ));

      const headers = Array.from(container.querySelectorAll("th")).map((h) =>
        h.textContent?.trim()
      );
      expect(headers).toEqual(["(index)", "a", "b"]);

      const rows = container.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(2);

      const cells0 = Array.from(rows[0].querySelectorAll("td")).map((c) =>
        c.textContent?.trim()
      );
      expect(cells0[0]).toBe("0");
      expect(cells0[1]).toBe("1");
      expect(cells0[2]).toBe("-"); // Fallbacks to dash when property is missing

      const cells1 = Array.from(rows[1].querySelectorAll("td")).map((c) =>
        c.textContent?.trim()
      );
      expect(cells1[0]).toBe("1");
      expect(cells1[1]).toBe("2");
      expect(cells1[2]).toBe('"hi"');
    });
  });

  describe("object token", () => {
    it("renders key-value pairs", () => {
      const { container } = render(() => (
        <ConsoleTableView
          token={{
            properties: {
              a: { type: "number", value: 10 },
              b: { type: "string", value: "test" },
            },
            type: "object",
          }}
        />
      ));

      const headers = Array.from(container.querySelectorAll("th")).map((h) =>
        h.textContent?.trim()
      );
      expect(headers).toEqual(["(index)", "Value"]);

      const rows = container.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(2);

      const cells0 = Array.from(rows[0].querySelectorAll("td")).map((c) =>
        c.textContent?.trim()
      );
      expect(cells0[0]).toBe("a");
      expect(cells0[1]).toBe("10");

      const cells1 = Array.from(rows[1].querySelectorAll("td")).map((c) =>
        c.textContent?.trim()
      );
      expect(cells1[0]).toBe("b");
      expect(cells1[1]).toBe('"test"');
    });
  });

  describe("fallback behavior", () => {
    it("renders string primitive using ConsoleTokenView", () => {
      const { container } = render(() => (
        <ConsoleTableView token={{ type: "string", value: "not-tabular" }} />
      ));

      expect(container.querySelector("table")).toBeNull();
      expect(container.textContent).toContain("not-tabular");
      expect(container.textContent).toContain('"');
    });
  });
});
