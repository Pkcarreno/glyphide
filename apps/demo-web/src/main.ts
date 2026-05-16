import type { OutputType } from "@glyphide/orchestrator";
import { EngineOrchestrator } from "@glyphide/orchestrator";
import { createQuickJSWorker } from "@glyphide/quickjs-engine/adapter";
import "./styles.css";

const codeInput = document.getElementById("code-input") as HTMLTextAreaElement;
const runButton = document.getElementById("run-btn") as HTMLButtonElement;
const interruptButton = document.getElementById(
  "interrupt-btn"
) as HTMLButtonElement;
const clearButton = document.getElementById("clear-btn") as HTMLButtonElement;
const outputPanel = document.getElementById("output-panel") as HTMLDivElement;
const statusElement = document.getElementById(
  "engine-status"
) as HTMLDivElement;

codeInput.value = [
  'console.log("Hello from QuickJS! 🚀");',
  "const sum = (a, b) => a + b;",
  'console.log("2 + 3 =", sum(2, 3));',
  'console.warn("This is a warning");',
  "",
  "// Try uncommenting the line below:",
  '// fetch("https://httpbin.org/get").then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));',
].join("\n");

type EngineState = "idle" | "initializing" | "running" | "error";

let engineInitialized = false;
let currentState: EngineState = "idle";

const orchestrator = new EngineOrchestrator({
  createWorker: createQuickJSWorker,
  events: {
    onOutput: (content, type) => appendOutput(content, type),
  },
});

function setEngineState(state: EngineState): void {
  currentState = state;
  statusElement.className = `status ${state}`;

  const statusText = statusElement.querySelector(
    ".status-text"
  ) as HTMLSpanElement;

  const labels: Record<EngineState, string> = {
    idle: "Idle",
    initializing: "Initializing…",
    running: "Running",
    error: "Error",
  };
  statusText.textContent = labels[state];

  runButton.disabled = state === "initializing" || state === "running";
  interruptButton.disabled = state !== "running";
}

function appendOutput(
  content: string,
  type: OutputType | "error" | "system"
): void {
  // Remove placeholder if present
  const placeholder = outputPanel.querySelector(".output-placeholder");
  if (placeholder) {
    placeholder.remove();
  }

  const line = document.createElement("div");
  line.className = `output-line ${type}`;
  line.textContent = content;
  outputPanel.appendChild(line);

  // Auto-scroll to bottom
  outputPanel.scrollTop = outputPanel.scrollHeight;
}

function addSeparator(): void {
  const placeholder = outputPanel.querySelector(".output-placeholder");
  if (placeholder) {
    return;
  }

  const separator = document.createElement("hr");
  separator.className = "output-separator";
  outputPanel.appendChild(separator);
}

function clearOutput(): void {
  outputPanel.innerHTML = `
    <div class="output-placeholder">
      Output will appear here after execution.
    </div>
  `;
}

async function executeCode(): Promise<void> {
  const code = codeInput.value.trim();
  if (!code) {
    return;
  }

  try {
    if (engineInitialized) {
      await orchestrator.reset();
    } else {
      setEngineState("initializing");
      appendOutput("Initializing QuickJS engine…", "system");
      await orchestrator.init();
      engineInitialized = true;
      appendOutput("Engine ready.", "system");
      addSeparator();
    }

    setEngineState("running");
    await orchestrator.run(code);
    setEngineState("idle");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendOutput(message, "error");
    setEngineState("idle");
  }

  addSeparator();
}

async function interruptExecution(): Promise<void> {
  if (currentState !== "running") {
    return;
  }

  try {
    await orchestrator.interrupt();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendOutput(`Interrupt failed: ${message}`, "error");
  }
}

runButton.addEventListener("click", () => {
  executeCode();
});

interruptButton.addEventListener("click", () => {
  interruptExecution();
});

clearButton.addEventListener("click", () => {
  clearOutput();
});

// Ctrl+Enter / Cmd+Enter shortcut to run
codeInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    executeCode();
  }
});
