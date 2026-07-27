import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileDrop } from "./FileDrop.tsx";

/** Top-level regexes for assertions — declared once to avoid re-allocation. */
const IDLE_TEXT_RE = /click or drop/i;

/**
 * Helper: simulates a user picking a file via the hidden <input type="file">.
 * jsdom does not implement `userEvent.upload`, so we attach a File to the
 * input via `Object.defineProperty` and dispatch the `change` event.
 */
function uploadFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });
  fireEvent.change(input);
}

/**
 * Helper: synthesizes a drop event with the given File. jsdom's drop
 * event normally has a null `dataTransfer`, so we attach a minimal shape
 * that the component reads.
 */
function dropFile(target: HTMLElement, file: File): void {
  fireEvent.drop(target, {
    dataTransfer: { files: [file], types: ["Files"] },
  });
}

/**
 * Tests for the FileDrop atom. Cover the 4 visual states, click-to-pick,
 * drag-and-drop transitions, validation, remove, and disabled behavior.
 */
describe("FileDrop", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the idle state with instructional text and dashed border", () => {
    const { getByTestId } = render(() => <FileDrop onFileSelected={vi.fn()} />);
    const zone = getByTestId("file-drop");
    expect(zone.getAttribute("data-state")).toBe("idle");
    expect(zone.textContent).toMatch(IDLE_TEXT_RE);
    expect(zone.className).toContain("border-dashed");
  });

  it("contains a hidden file input with the correct accept attribute", () => {
    const { container } = render(() => <FileDrop onFileSelected={vi.fn()} />);
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.accept).toBe(".js,.py");
    expect(input.style.display).toBe("none");
  });

  it("clicking the drop zone triggers the hidden file input click", () => {
    const clickSpy = vi.fn();
    const { container, getByTestId } = render(() => (
      <FileDrop onFileSelected={vi.fn()} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    input.click = clickSpy;

    fireEvent.click(getByTestId("file-drop"));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("upload with a valid file triggers onFileSelected and transitions to selected", () => {
    const onFileSelected = vi.fn();
    const { container, getByTestId } = render(() => (
      <FileDrop onFileSelected={onFileSelected} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    const file = new File(["print(1)"], "script.py", { type: "text/x-python" });

    uploadFile(input, file);

    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected.mock.calls[0][0]).toBeInstanceOf(File);
    expect(onFileSelected.mock.calls[0][0].name).toBe("script.py");
    expect(getByTestId("file-drop").getAttribute("data-state")).toBe(
      "selected"
    );
  });

  it("upload with an invalid extension shows error and does NOT call onFileSelected", () => {
    const onFileSelected = vi.fn();
    const onError = vi.fn();
    const { container, getByTestId } = render(() => (
      <FileDrop onError={onError} onFileSelected={onFileSelected} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    const file = new File(["x"], "notes.txt", { type: "text/plain" });

    uploadFile(input, file);

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    expect(getByTestId("file-drop").getAttribute("data-state")).toBe("error");
  });

  it("after selecting a file, the remove button clears the selection back to idle", () => {
    const onFileSelected = vi.fn();
    const { container, getByTestId } = render(() => (
      <FileDrop onFileSelected={onFileSelected} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    const file = new File(["x"], "hello.js", { type: "text/javascript" });
    uploadFile(input, file);

    expect(getByTestId("file-drop").getAttribute("data-state")).toBe(
      "selected"
    );
    const removeBtn = getByTestId("file-drop-remove");
    fireEvent.click(removeBtn);

    expect(getByTestId("file-drop").getAttribute("data-state")).toBe("idle");
    expect(onFileSelected).toHaveBeenCalledTimes(1); // not re-fired
  });

  it("shows the filename when a file is selected", () => {
    const { container, getByTestId } = render(() => (
      <FileDrop onFileSelected={vi.fn()} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    const file = new File(["x"], "my-script.js");
    uploadFile(input, file);

    expect(getByTestId("file-drop").textContent).toContain("my-script.js");
  });

  it("accept Enter and Space key presses to open the picker", () => {
    const clickSpy = vi.fn();
    const { container, getByTestId } = render(() => (
      <FileDrop onFileSelected={vi.fn()} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    input.click = clickSpy;
    const zone = getByTestId("file-drop");

    fireEvent.keyDown(zone, { key: "Enter" });
    fireEvent.keyDown(zone, { key: " " });
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it("dragenter transitions to drag-over, dragleave (counter=0) returns to idle", () => {
    const { getByTestId } = render(() => <FileDrop onFileSelected={vi.fn()} />);
    const zone = getByTestId("file-drop");

    fireEvent.dragEnter(zone, { dataTransfer: { types: ["Files"] } });
    expect(zone.getAttribute("data-state")).toBe("drag-over");

    fireEvent.dragLeave(zone, { dataTransfer: { types: ["Files"] } });
    expect(zone.getAttribute("data-state")).toBe("idle");
  });

  it("drop with a valid file calls onFileSelected and transitions to selected", () => {
    const onFileSelected = vi.fn();
    const file = new File(["x"], "app.py", { type: "text/x-python" });
    const { getByTestId } = render(() => (
      <FileDrop onFileSelected={onFileSelected} />
    ));
    const zone = getByTestId("file-drop");

    dropFile(zone, file);

    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(zone.getAttribute("data-state")).toBe("selected");
  });

  it("selected file displays filename with title attribute for tooltip", () => {
    const file = new File(["x"], "very-long-filename-that-needs-truncation.js");
    const { container } = render(() => <FileDrop onFileSelected={vi.fn()} />);
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;

    uploadFile(input, file);

    const filenameSpan = container.querySelector("span[title]");
    expect(filenameSpan).toBeTruthy();
    expect(filenameSpan?.getAttribute("title")).toBe(
      "very-long-filename-that-needs-truncation.js"
    );
  });

  it("drop with an invalid extension shows error and does NOT call onFileSelected", () => {
    const onFileSelected = vi.fn();
    const onError = vi.fn();
    const file = new File(["x"], "doc.txt");
    const { getByTestId } = render(() => (
      <FileDrop onError={onError} onFileSelected={onFileSelected} />
    ));
    const zone = getByTestId("file-drop");

    dropFile(zone, file);

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    expect(zone.getAttribute("data-state")).toBe("error");
  });

  it("when disabled, click does not open the picker", () => {
    const clickSpy = vi.fn();
    const { container, getByTestId } = render(() => (
      <FileDrop disabled onFileSelected={vi.fn()} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    input.click = clickSpy;
    fireEvent.click(getByTestId("file-drop"));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("size='full-width' applies the full-width CVA variant class", () => {
    const { getByTestId } = render(() => (
      <FileDrop onFileSelected={vi.fn()} size="full-width" />
    ));
    const zone = getByTestId("file-drop");
    expect(zone.className).toContain("w-full");
  });

  it("accept prop overrides the default .js,.py", () => {
    const { container } = render(() => (
      <FileDrop accept=".txt" onFileSelected={vi.fn()} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    expect(input.accept).toBe(".txt");
  });

  it("validation normalizes extensions case-insensitively (.PY accepted)", () => {
    const onFileSelected = vi.fn();
    const { container } = render(() => (
      <FileDrop onFileSelected={onFileSelected} />
    ));
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    const file = new File(["x"], "UPPER.PY");
    uploadFile(input, file);
    expect(onFileSelected).toHaveBeenCalled();
  });

  it("uses the File object from the drop event (does not depend on picker)", () => {
    const onFileSelected = vi.fn();
    const file = new File(["x"], "y.js");
    const { getByTestId } = render(() => (
      <FileDrop onFileSelected={onFileSelected} />
    ));
    dropFile(getByTestId("file-drop"), file);
    expect(onFileSelected.mock.calls[0][0]).toBeInstanceOf(File);
    expect(onFileSelected.mock.calls[0][0].name).toBe("y.js");
  });

  it("clicking remove button calls onFileRemoved callback", () => {
    const onFileSelected = vi.fn();
    const onFileRemoved = vi.fn();
    const file = new File(["x"], "test.js");
    const { getByTestId } = render(() => (
      <FileDrop onFileRemoved={onFileRemoved} onFileSelected={onFileSelected} />
    ));
    dropFile(getByTestId("file-drop"), file);
    expect(onFileSelected).toHaveBeenCalled();

    fireEvent.click(getByTestId("file-drop-remove"));
    expect(onFileRemoved).toHaveBeenCalled();
  });
});
