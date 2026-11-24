import { configure } from "@solidjs/testing-library";
import { flush } from "solid-js";

configure({
  eventWrapper: (cb) => {
    const result = cb();
    flush();
    return result;
  },
});

if (typeof HTMLElement !== "undefined" && HTMLElement.prototype) {
  const originalClick = HTMLElement.prototype.click;
  HTMLElement.prototype.click = function (
    this: HTMLElement,
    ...args: unknown[]
  ) {
    const result = originalClick.apply(this, args as []);
    flush();
    return result;
  };
}
