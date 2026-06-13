import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import type { ConsoleGroupNode } from "../../helpers/console-hierarchy.ts";
import { ConsoleGroupView } from "./ConsoleGroupView.tsx";

describe("ConsoleGroupView", () => {
  const mockOutputEntry = {
    id: 0,
    timestamp: 0,
    type: "log",
    data: "",
  } as import("../../core/models/output.ts").OutputEntry;

  it("renders a <no label> preview when label is empty", () => {
    const mockGroupNode: ConsoleGroupNode = {
      type: "group",
      entry: mockOutputEntry,
      label: [],
      collapsed: false,
      children: [],
    };
    const { container } = render(() => (
      <ConsoleGroupView node={mockGroupNode} renderNode={() => <span />} />
    ));
    expect(container.textContent).toContain("<no label>");
  });

  it("renders the label using ConsoleTokenView when tokens are provided", () => {
    const mockGroupNode: ConsoleGroupNode = {
      type: "group",
      entry: mockOutputEntry,
      label: [{ type: "string", value: "My Custom Group" }],
      collapsed: false,
      children: [],
    };
    const { container } = render(() => (
      <ConsoleGroupView node={mockGroupNode} renderNode={() => <span />} />
    ));
    expect(container.textContent).toContain("My Custom Group");
  });

  it("passes defaultExpanded=true to ExpandableNode when collapsed is false", () => {
    const mockGroupNode: ConsoleGroupNode = {
      type: "group",
      entry: mockOutputEntry,
      label: [{ type: "string", value: "Group" }],
      collapsed: false, // console.group
      children: [
        {
          type: "leaf",
          entry: mockOutputEntry,
          rendered: { variant: "log", text: "Child Content" },
        },
      ],
    };
    const { container } = render(() => (
      <ConsoleGroupView
        node={mockGroupNode}
        renderNode={(childNode) => (
          <span>
            {childNode.type === "leaf" ? childNode.rendered.text : ""}
          </span>
        )}
      />
    ));
    // Since it's expanded by default, we should see the child
    expect(container.textContent).toContain("Child Content");
  });

  it("passes defaultExpanded=false to ExpandableNode when collapsed is true", () => {
    const mockGroupNode: ConsoleGroupNode = {
      type: "group",
      entry: mockOutputEntry,
      label: [{ type: "string", value: "Group" }],
      collapsed: true, // console.groupCollapsed
      children: [
        {
          type: "leaf",
          entry: mockOutputEntry,
          rendered: { variant: "log", text: "Child Content" },
        },
      ],
    };
    const { container } = render(() => (
      <ConsoleGroupView
        node={mockGroupNode}
        renderNode={(childNode) => (
          <span>
            {childNode.type === "leaf" ? childNode.rendered.text : ""}
          </span>
        )}
      />
    ));
    // Since it's collapsed by default, the child content should NOT be visible
    expect(container.textContent).not.toContain("Child Content");
  });

  it("renders children recursively via the renderNode callback", () => {
    const mockGroupNode: ConsoleGroupNode = {
      type: "group",
      entry: mockOutputEntry,
      label: [{ type: "string", value: "Parent Group" }],
      collapsed: false,
      children: [
        {
          type: "leaf",
          entry: mockOutputEntry,
          rendered: { variant: "log", text: "Child 1" },
        },
        {
          type: "leaf",
          entry: mockOutputEntry,
          rendered: { variant: "log", text: "Child 2" },
        },
      ],
    };
    const { container } = render(() => (
      <ConsoleGroupView
        node={mockGroupNode}
        renderNode={(childNode) => (
          <span>
            {childNode.type === "leaf" ? childNode.rendered.text : ""}
          </span>
        )}
      />
    ));
    expect(container.textContent).toContain("Child 1");
    expect(container.textContent).toContain("Child 2");
  });
});
