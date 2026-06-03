import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationItem } from "../../core/models/notifications.ts";
import { Toaster } from "./Toaster.tsx";

const [mockActiveToasts, setMockActiveToasts] = createSignal<
  NotificationItem[]
>([]);
const mockDispatch = vi.fn();

vi.mock("../../core/context", () => ({
  useEditor: () => ({
    dispatcher: { dispatch: mockDispatch },
    notifications: {
      activeToasts: mockActiveToasts,
    },
  }),
}));

describe("Toaster", () => {
  beforeEach(() => {
    setMockActiveToasts([]);
    mockDispatch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders empty when no active toasts", () => {
    const { container } = render(() => <Toaster />);
    expect(container.querySelector(".max-w-sm")).toBeNull();
  });

  it("renders active toasts", () => {
    setMockActiveToasts([
      {
        id: "1",
        title: "Toast 1",
        timestamp: Date.now(),
        type: "info",
      },
      {
        id: "2",
        title: "Toast 2",
        timestamp: Date.now(),
        type: "success",
      },
    ]);

    const { getByText } = render(() => <Toaster />);

    expect(getByText("Toast 1")).toBeTruthy();
    expect(getByText("Toast 2")).toBeTruthy();
  });

  it("dispatches DISMISS_TOAST when a toast is closed", () => {
    setMockActiveToasts([
      {
        id: "toast-to-dismiss",
        title: "Toast to dismiss",
        timestamp: Date.now(),
        type: "info",
      },
    ]);

    const { getByRole } = render(() => <Toaster />);

    const closeButton = getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);

    expect(mockDispatch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "DISMISS_TOAST",
      id: "toast-to-dismiss",
    });
  });
});
