import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { ButtonGroup } from "./ButtonGroup";

describe("ButtonGroup", () => {
  it("when rendered, has group role for accessibility", () => {
    const { getByRole } = render(() => (
      <ButtonGroup>
        <button>A</button>
      </ButtonGroup>
    ));
    expect(getByRole("group")).toBeTruthy();
  });

  it("when rendered, applies shared border and overflow", () => {
    const { getByRole } = render(() => (
      <ButtonGroup>
        <button>A</button>
      </ButtonGroup>
    ));
    const group = getByRole("group");
    expect(group.className).toContain("border");
    expect(group.className).toContain("overflow-hidden");
  });

  it("when custom class is provided, merges it", () => {
    const { getByRole } = render(() => (
      <ButtonGroup class="h-6">
        <button>A</button>
      </ButtonGroup>
    ));
    expect(getByRole("group").className).toContain("h-6");
  });

  it("when multiple children are provided, renders all", () => {
    const { getAllByRole } = render(() => (
      <ButtonGroup>
        <button>A</button>
        <button>B</button>
        <button>C</button>
      </ButtonGroup>
    ));
    expect(getAllByRole("button")).toHaveLength(3);
  });

  it("when rendered, applies divider styles between children", () => {
    const { getByRole } = render(() => (
      <ButtonGroup>
        <button>A</button>
        <button>B</button>
      </ButtonGroup>
    ));
    const group = getByRole("group");
    expect(group.className).toContain("[&>*+*]:border-l");
  });
});
