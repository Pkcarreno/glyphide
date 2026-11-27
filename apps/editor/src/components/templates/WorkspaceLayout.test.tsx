import { cleanup, render } from "@solidjs/testing-library";
import { flush, resetErrorHalt } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceLayout, WorkspaceLayout } from "./WorkspaceLayout.tsx";

const DEFAULT_INNER_WIDTH = window.innerWidth;

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
    writable: true,
  });
}

function dragSeparator(separator: HTMLElement, movementX: number) {
  separator.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      pointerId: 1,
    })
  );
  separator.dispatchEvent(
    new PointerEvent("pointermove", {
      bubbles: true,
      movementX,
      pointerId: 1,
    })
  );
  separator.dispatchEvent(
    new PointerEvent("pointerup", {
      bubbles: true,
      pointerId: 1,
    })
  );
}

describe("WorkspaceLayout", () => {
  const DummyChild = (props: { text: string }) => <div>{props.text}</div>;

  beforeEach(() => {
    setViewportWidth(1024);
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    resetErrorHalt();
    setViewportWidth(DEFAULT_INNER_WIDTH);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  it("when rendered, displays all compound subcomponent children", () => {
    const { getByText } = render(() => (
      <WorkspaceLayout.Root>
        <WorkspaceLayout.Header>
          <DummyChild text="Header" />
        </WorkspaceLayout.Header>
        <WorkspaceLayout.Main>
          <WorkspaceLayout.Editor>
            <DummyChild text="Editor" />
          </WorkspaceLayout.Editor>
          <WorkspaceLayout.Resizer />
          <WorkspaceLayout.Console>
            <DummyChild text="Console" />
          </WorkspaceLayout.Console>
        </WorkspaceLayout.Main>
        <WorkspaceLayout.StatusBar>
          <DummyChild text="Status" />
        </WorkspaceLayout.StatusBar>
      </WorkspaceLayout.Root>
    ));

    expect(getByText("Header")).toBeTruthy();
    expect(getByText("Editor")).toBeTruthy();
    expect(getByText("Console")).toBeTruthy();
    expect(getByText("Status")).toBeTruthy();
  });

  it("when rendered, uses flex-col on mobile and flex-row on desktop", () => {
    const { container } = render(() => (
      <WorkspaceLayout.Root>
        <WorkspaceLayout.Header>
          <div />
        </WorkspaceLayout.Header>
        <WorkspaceLayout.Main>
          <WorkspaceLayout.Editor>
            <div />
          </WorkspaceLayout.Editor>
          <WorkspaceLayout.Resizer />
          <WorkspaceLayout.Console>
            <div />
          </WorkspaceLayout.Console>
        </WorkspaceLayout.Main>
        <WorkspaceLayout.StatusBar>
          <div />
        </WorkspaceLayout.StatusBar>
      </WorkspaceLayout.Root>
    ));

    const main = container.querySelector("main");
    expect(main?.className).toContain("flex-col");
    expect(main?.className).toContain("md:flex-row");
  });

  it("when custom class is provided, merges it to root and subcomponents", () => {
    const { container, getByRole, getByTestId } = render(() => (
      <WorkspaceLayout.Root class="custom-theme">
        <WorkspaceLayout.Header class="custom-header" data-testid="header">
          <div />
        </WorkspaceLayout.Header>
        <WorkspaceLayout.Main class="custom-main">
          <WorkspaceLayout.Editor class="custom-editor" data-testid="editor">
            <div />
          </WorkspaceLayout.Editor>
          <WorkspaceLayout.Resizer class="custom-resizer" />
          <WorkspaceLayout.Console class="custom-console" data-testid="console">
            <div />
          </WorkspaceLayout.Console>
        </WorkspaceLayout.Main>
        <WorkspaceLayout.StatusBar class="custom-status" data-testid="status">
          <div />
        </WorkspaceLayout.StatusBar>
      </WorkspaceLayout.Root>
    ));

    expect(container.firstElementChild?.className).toContain("custom-theme");
    expect(container.firstElementChild?.className).toContain("flex-col");
    expect(getByTestId("header").className).toContain("custom-header");
    expect(getByRole("main").className).toContain("custom-main");
    expect(getByTestId("editor").className).toContain("custom-editor");
    expect(getByRole("separator").className).toContain("custom-resizer");
    expect(getByTestId("console").className).toContain("custom-console");
    expect(getByTestId("status").className).toContain("custom-status");
  });

  it("when rendered, uses h-dvh instead of h-screen", () => {
    const { container } = render(() => (
      <WorkspaceLayout.Root>
        <WorkspaceLayout.Main>
          <WorkspaceLayout.Editor>
            <div />
          </WorkspaceLayout.Editor>
        </WorkspaceLayout.Main>
      </WorkspaceLayout.Root>
    ));

    expect(container.firstElementChild?.className).toContain("h-dvh");
    expect(container.firstElementChild?.className).not.toContain("h-screen");
  });

  it("when rendered, wraps children in SafeAreaContainer", () => {
    const { container } = render(() => (
      <WorkspaceLayout.Root>
        <WorkspaceLayout.Main>
          <WorkspaceLayout.Editor>
            <div />
          </WorkspaceLayout.Editor>
        </WorkspaceLayout.Main>
      </WorkspaceLayout.Root>
    ));

    const safeAreaContainer = container.querySelector("div.pt-safearea-t");
    expect(safeAreaContainer).toBeTruthy();
  });

  it("sets default --editor-size CSS variable to 50% and supports defaultEditorSize", () => {
    const { container: defaultContainer } = render(() => (
      <WorkspaceLayout.Root>
        <WorkspaceLayout.Main>
          <WorkspaceLayout.Editor>
            <div />
          </WorkspaceLayout.Editor>
        </WorkspaceLayout.Main>
      </WorkspaceLayout.Root>
    ));

    expect(
      (
        defaultContainer.firstElementChild as HTMLElement
      ).style.getPropertyValue("--editor-size")
    ).toBe("50%");

    cleanup();

    const { container: customContainer } = render(() => (
      <WorkspaceLayout.Root defaultEditorSize={65}>
        <WorkspaceLayout.Main>
          <WorkspaceLayout.Editor>
            <div />
          </WorkspaceLayout.Editor>
        </WorkspaceLayout.Main>
      </WorkspaceLayout.Root>
    ));

    expect(
      (customContainer.firstElementChild as HTMLElement).style.getPropertyValue(
        "--editor-size"
      )
    ).toBe("65%");
  });

  it("resizes editor pane and clamps between 10% and 90% when dragging Resizer on desktop", () => {
    const onResizeDelta = vi.fn();
    const onResizeEnd = vi.fn();
    let mainRef: HTMLElement | undefined;

    const { container, getByRole } = render(() => (
      <WorkspaceLayout.Root>
        <WorkspaceLayout.Main
          ref={(el) => {
            mainRef = el;
          }}
        >
          <WorkspaceLayout.Editor>
            <div />
          </WorkspaceLayout.Editor>
          <WorkspaceLayout.Resizer
            onResizeDelta={onResizeDelta}
            onResizeEnd={onResizeEnd}
          />
          <WorkspaceLayout.Console>
            <div />
          </WorkspaceLayout.Console>
        </WorkspaceLayout.Main>
      </WorkspaceLayout.Root>
    ));

    const root = container.firstElementChild as HTMLElement;
    const main = getByRole("main");
    expect(mainRef).toBe(main);

    Object.defineProperty(main, "clientWidth", {
      configurable: true,
      value: 1000,
    });

    const separator = getByRole("separator");
    dragSeparator(separator, 150);
    flush();

    expect(root.style.getPropertyValue("--editor-size")).toBe("65%");
    expect(onResizeDelta).toHaveBeenCalledWith(150);
    expect(onResizeEnd).toHaveBeenCalledOnce();

    dragSeparator(separator, 500);
    flush();
    expect(root.style.getPropertyValue("--editor-size")).toBe("90%");

    dragSeparator(separator, -1000);
    flush();
    expect(root.style.getPropertyValue("--editor-size")).toBe("10%");
  });

  it("ignores resize deltas on mobile viewports or zero-width containers", () => {
    const { container, getByRole } = render(() => (
      <WorkspaceLayout.Root>
        <WorkspaceLayout.Main>
          <WorkspaceLayout.Editor>
            <div />
          </WorkspaceLayout.Editor>
          <WorkspaceLayout.Resizer />
          <WorkspaceLayout.Console>
            <div />
          </WorkspaceLayout.Console>
        </WorkspaceLayout.Main>
      </WorkspaceLayout.Root>
    ));

    const root = container.firstElementChild as HTMLElement;
    const main = getByRole("main");
    const separator = getByRole("separator");

    Object.defineProperty(main, "clientWidth", {
      configurable: true,
      value: 0,
    });
    dragSeparator(separator, 100);
    flush();
    expect(root.style.getPropertyValue("--editor-size")).toBe("50%");

    Object.defineProperty(main, "clientWidth", {
      configurable: true,
      value: 500,
    });
    setViewportWidth(640);
    dragSeparator(separator, 100);
    flush();
    expect(root.style.getPropertyValue("--editor-size")).toBe("50%");
  });
});

describe("WorkspaceLayout context contract", () => {
  it("throws native ContextNotFoundError when useWorkspaceLayout is called outside WorkspaceLayout.Root", () => {
    function OrphanConsumer() {
      useWorkspaceLayout();
      return null;
    }

    let caught: unknown;
    try {
      render(() => <OrphanConsumer />);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).constructor.name).toBe("ContextNotFoundError");
    expect((caught as Error).message).toContain(
      "has no provider above this read"
    );
  });

  it("throws native ContextNotFoundError when a subcomponent is rendered outside WorkspaceLayout.Root", () => {
    let caught: unknown;
    try {
      render(() => (
        <WorkspaceLayout.Editor>
          <div>Orphan</div>
        </WorkspaceLayout.Editor>
      ));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).constructor.name).toBe("ContextNotFoundError");
  });
});
