import { render } from "@solidjs/testing-library";
import type { JSX } from "@solidjs/web";
import { children, createSignal, flush, Show } from "solid-js";
import { describe, expect, it } from "vitest";
import { hasResolvedChildren } from "./has-resolved-children.ts";

describe("hasResolvedChildren", () => {
  it("returns false for empty, boolean, and hidden Show children", () => {
    let emptyResult = true;
    let boolResult = true;
    let hiddenShowResult = true;

    function Probe(props: {
      children?: JSX.Element;
      onMeasure: (has: boolean) => void;
    }) {
      const resolved = children(() => props.children);
      props.onMeasure(hasResolvedChildren(resolved));
      return null;
    }

    render(() => (
      <>
        <Probe
          onMeasure={(has) => {
            emptyResult = has;
          }}
        />
        <Probe
          onMeasure={(has) => {
            boolResult = has;
          }}
        >
          {false}
        </Probe>
        <Probe
          onMeasure={(has) => {
            hiddenShowResult = has;
          }}
        >
          <Show when={false}>
            <span>Hidden</span>
          </Show>
        </Probe>
      </>
    ));

    expect(emptyResult).toBe(false);
    expect(boolResult).toBe(false);
    expect(hiddenShowResult).toBe(false);
  });

  it("tracks reactive children transitions and preserves numeric zero", () => {
    const [isVisible, setIsVisible] = createSignal(false);
    let latestResult = true;

    function Probe(props: { children?: JSX.Element }) {
      const resolved = children(() => props.children);
      return (
        <span>
          {(() => {
            latestResult = hasResolvedChildren(resolved);
            return latestResult ? "yes" : "no";
          })()}
        </span>
      );
    }

    const { container } = render(() => (
      <>
        <Probe>
          <Show when={isVisible()}>
            <span>Shown</span>
          </Show>
        </Probe>
        <Probe>{0}</Probe>
      </>
    ));

    expect(container.textContent).toBe("noyes");

    setIsVisible(true);
    flush();

    expect(container.textContent).toBe("yesyes");
    expect(latestResult).toBe(true);
  });
});
