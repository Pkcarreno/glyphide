import { describe, expect, it } from "vitest";
import { createNotificationModel } from "./notifications.ts";

describe("NotificationModel", () => {
  it("initializes with empty lists", () => {
    const model = createNotificationModel();
    expect(model.activeToasts().length).toBe(0);
  });

  it("adds a notification and sets it as active toast", () => {
    const model = createNotificationModel();
    model.dispatchNotification({
      title: "Test notification",
      type: "info",
    });

    const activeToasts = model.activeToasts();
    expect(activeToasts.length).toBe(1);
    expect(activeToasts[0].title).toBe("Test notification");
    expect(activeToasts[0].type).toBe("info");
    expect(activeToasts[0].timestamp).toBeTypeOf("number");
  });

  it("dismisses an active toast", () => {
    const model = createNotificationModel();
    model.dispatchNotification({ title: "To dismiss", type: "success" });
    const id = model.activeToasts()[0].id;

    expect(model.activeToasts().length).toBe(1);

    model.dismissToast(id);

    expect(model.activeToasts().length).toBe(0);
  });
});
