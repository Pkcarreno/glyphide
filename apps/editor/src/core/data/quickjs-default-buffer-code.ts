/**
 * Curated beginner-friendly QuickJS default code that auto-populates the
 * buffer for new projects. Edited from `ref/Console Capability Test.js`.
 *
 * Tour order: primitives → circular references → collections → special
 * objects → functions → extended console API → grouping → tables → traces
 * → timers → counters & assertions.
 *
 * @public
 */
export const QUICKJS_DEFAULT_BUFFER_CODE = `// Welcome to Glyphide.
// This is the default starter snippet. Every new project begins with this
// code in the buffer so you can see how the engine prints values without
// having to write anything from scratch.
//
// You can disable this default in Settings → Editor → Default Code on New
// Project. New projects will then open with an empty buffer.

// 1. Primitives — console.log accepts any value, separated by spaces.
console.log("String", 42, true, null, undefined, Symbol("id"), 9007199254740991n);

// 2. Circular references — JSON.stringify would throw here. The console
// renders them with a special "[Circular]" marker instead.
const nodeA = { id: "A" };
const nodeB = { id: "B", parent: nodeA };
nodeA.child = nodeB;
console.log("Circular Object:", nodeA);

// 3. Maps and Sets — collections with identity (reference) semantics.
const dataMap = new Map([
  ["key", "value"],
  [{ isObject: true }, "reference"],
]);
const uniqueValues = new Set([1, 1, 2, { a: 1 }]);
console.log("Map:", dataMap);
console.log("Set:", uniqueValues);

// 4. Special objects — Regex, Date, and native Error types.
console.log("Regex:", /^[a-zA-Z]+$/gi);
console.log("Date:", new Date());
console.log("Native Error:", new TypeError("The provided type is invalid"));

// 5. Functions — names, signatures, and bodies are preserved on display.
console.log("Classic Function:", function calculateSum(a, b) { return a + b; });
console.log("Async Arrow:", async (x) => await x);
console.log("Generator:", function* generateSequence() { yield 1; });

// 6. Extended console API — info, warn, error, debug each have their own
// icon and level in the output panel.
console.info("Informational message");
console.warn("Deprecation warning");
console.error("Simulated network failure");
console.debug("Low-level trace");

// 7. Grouping — nest related log lines under a collapsible header.
console.group("Initialization Phase");
console.log("Loading JS engine...");
console.groupCollapsed("Dependencies");
console.log("Module A: OK");
console.log("Module B: OK");
console.groupEnd();
console.log("Engine ready.");
console.groupEnd();

// 8. Tables — render arrays of objects as a structured grid.
console.table([
  { id: 1, engine: "V8", status: "active" },
  { id: 2, engine: "SpiderMonkey", status: "inactive", extra: "ignored" },
]);

// 9. Stack traces — console.trace shows the call path that led here.
function startProcess() { continueProcess(); }
function continueProcess() { logCurrentTrace(); }
function logCurrentTrace() { console.trace("Current execution trace"); }
startProcess();

// 10. Timers — measure how long a block of work takes.
console.time("Quick operation");
let total = 0;
for (let index = 0; index < 1000; index++) {
  total += index;
}
console.timeEnd("Quick operation");

// 11. Counters and assertions — useful for quick sanity checks.
console.count("Render");
console.count("Render");

console.assert(1 === 2, "Failed assertion: 1 is not equal to 2");

// Edit anything above, then press Ctrl/Cmd + Enter to run your code.
`;
