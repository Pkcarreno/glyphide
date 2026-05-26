import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../../helpers/cn";

interface EditorPaneProps extends JSX.HTMLAttributes<HTMLElement> {
  class?: string;
}

/**
 * Main code editor organism.
 * Currently renders a static skeleton mimicking a code editor
 * based on the design mockups.
 */
function EditorPane(props: EditorPaneProps) {
  const [local, rest] = splitProps(props, ["class"]);

  return (
    <section
      class={cn(
        "flex-1 bg-editor-bg h-full overflow-hidden flex flex-col",
        local.class,
      )}
      {...rest}
    >
      <div class="flex-1 overflow-auto p-4 font-mono text-code-mobile md:text-code-desktop leading-relaxed select-text">
        <div class="flex">
          <div class="w-8 shrink-0 text-outline text-right pr-4 select-none opacity-50 flex flex-col">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
          </div>
          <div class="flex-1">
            <div class="whitespace-pre">
              <span class="text-token-keyword">import</span>{" "}
              <span class="text-on-surface">{"{"}</span>{" "}
              <span class="text-on-surface">serve</span>{" "}
              <span class="text-on-surface">{"}"}</span>{" "}
              <span class="text-token-keyword">from</span>{" "}
              <span class="text-token-string">"@glyphide/quickjs"</span>
              <span class="text-on-surface">;</span>
            </div>
            <div class="whitespace-pre"> </div>
            <div class="whitespace-pre">
              <span class="text-token-comment">
                // Basic HTTP server example
              </span>
            </div>
            <div class="whitespace-pre">
              <span class="text-on-surface">serve(</span>
              <span class="text-token-keyword">async</span>{" "}
              <span class="text-on-surface">(req)</span>{" "}
              <span class="text-token-keyword">=&gt;</span>{" "}
              <span class="text-on-surface">{"{"}</span>
            </div>
            <div class="whitespace-pre">
              {"  "}
              <span class="text-token-keyword">return</span>{" "}
              <span class="text-token-keyword">new</span>{" "}
              <span class="text-token-function">Response</span>
              <span class="text-on-surface">(</span>
              <span class="text-token-string">"Hello from QuickJS!"</span>
              <span class="text-on-surface">);</span>
            </div>
            <div class="whitespace-pre">
              <span class="text-on-surface">{"}"});</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { EditorPane, type EditorPaneProps };
