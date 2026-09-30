# @glyphide/quickjs-engine

Execution engine utilizing QuickJS compiled to WebAssembly (`quickjs-emscripten`) for sandboxed JavaScript evaluation.

## Architecture

- **Adapter / Worker Separation**:
  - `./adapter`: Host-side orchestrator adapter managing worker instantiation and options.
  - `./worker`: Web Worker entry point executing QuickJS WASM in an isolated thread.
- **Structured Console AST**:
  - Intercepts engine `console.*` calls and parses arguments into structured `ConsoleToken[]` AST tokens instead of serializing to flat strings.
- **Sandboxing & Lifecycle**:
  - Each run executes inside a fresh or isolated QuickJS context with execution limits.
  - Adheres strictly to the JSON-RPC 2.0 messages defined in `@glyphide/rpc-protocol`.
