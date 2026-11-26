import { describe, expect, it, vi } from "vitest";
import { composeEventHandlers } from "./compose-event-handlers.ts";

describe("composeEventHandlers", () => {
  it("runs internal and external handlers in order", () => {
    const order: string[] = [];
    const internal = vi.fn(() => order.push("internal"));
    const external = vi.fn(() => order.push("external"));

    const composed = composeEventHandlers(internal, external);
    const event = new MouseEvent("click");
    composed(event);

    expect(internal).toHaveBeenCalledWith(event);
    expect(external).toHaveBeenCalledWith(event);
    expect(order).toEqual(["internal", "external"]);
  });

  it("skips undefined handlers without throwing", () => {
    const internal = vi.fn();
    const composed = composeEventHandlers(internal, undefined);
    const event = new MouseEvent("click");

    composed(event);

    expect(internal).toHaveBeenCalledOnce();
    expect(internal).toHaveBeenCalledWith(event);
  });

  it("handles when only external handler is provided", () => {
    const external = vi.fn();
    const composed = composeEventHandlers(undefined, external);
    const event = new MouseEvent("click");

    composed(event);

    expect(external).toHaveBeenCalledOnce();
    expect(external).toHaveBeenCalledWith(event);
  });

  it("handles when all handlers are undefined", () => {
    const composed = composeEventHandlers(undefined, undefined);
    expect(() => composed(new MouseEvent("click"))).not.toThrow();
  });

  it("invokes Solid bound [handler, data] tuple handlers", () => {
    const order: string[] = [];
    const internal = vi.fn(() => order.push("internal"));
    const bound = vi.fn((data: string, _event: MouseEvent) => {
      order.push(`external:${data}`);
    });

    const composed = composeEventHandlers(internal, [bound, "item-1"]);
    const event = new MouseEvent("click");
    composed(event);

    expect(internal).toHaveBeenCalledWith(event);
    expect(bound).toHaveBeenCalledWith("item-1", event);
    expect(order).toEqual(["internal", "external:item-1"]);
  });
});
