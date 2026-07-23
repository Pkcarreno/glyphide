import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationItem } from "../../core/models/notifications.ts";
import { Toast } from "./Toast.tsx";

describe("Toast", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const baseNotification: NotificationItem = {
    id: "test-id",
    timestamp: Date.now(),
    title: "Test Title",
    type: "info",
  };

  it("renders title and description correctly", () => {
    const notification = {
      ...baseNotification,
      description: "Test Description",
    };

    const { getByText } = render(() => (
      <Toast notification={notification} onClose={vi.fn()} />
    ));

    expect(getByText("Test Title")).toBeTruthy();
    expect(getByText("Test Description")).toBeTruthy();
  });

  it("does not render action button when action is absent", () => {
    const { queryByRole } = render(() => (
      <Toast notification={baseNotification} onClose={vi.fn()} />
    ));

    const buttons = queryByRole("button", { name: "Close" });
    expect(buttons).toBeTruthy();
    expect(document.querySelectorAll("button").length).toBe(1);
  });

  it("renders action button and triggers callbacks on click", () => {
    const mockActionClick = vi.fn();
    const mockOnClose = vi.fn();
    vi.useFakeTimers();

    const notificationWithAction: NotificationItem = {
      ...baseNotification,
      action: {
        label: "Retry",
        onClick: mockActionClick,
      },
    };

    const { getByRole } = render(() => (
      <Toast notification={notificationWithAction} onClose={mockOnClose} />
    ));

    const actionButton = getByRole("button", { name: "Retry" });
    expect(actionButton).toBeTruthy();

    fireEvent.click(actionButton);

    expect(mockActionClick).toHaveBeenCalledOnce();

    expect(mockOnClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(mockOnClose).toHaveBeenCalledWith("test-id");
  });

  it("triggers onClose after timeout when close button is clicked", () => {
    const mockOnClose = vi.fn();
    vi.useFakeTimers();

    const { getByRole } = render(() => (
      <Toast notification={baseNotification} onClose={mockOnClose} />
    ));

    const closeButton = getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);

    expect(mockOnClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(mockOnClose).toHaveBeenCalledWith("test-id");
  });
});
