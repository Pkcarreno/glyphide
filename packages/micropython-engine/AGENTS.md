# @glyphide/micropython-engine

Execution engine utilizing MicroPython compiled to WebAssembly for sandboxed Python evaluation.

## Architecture

- **Adapter / Worker Separation**:
  - `./adapter`: Host-side orchestrator adapter managing worker instantiation, lifecycle, and execution options.
  - `./worker`: Web Worker entry point running the MicroPython WASM runtime.
- **I/O Streaming**:
  - Captures Python standard streams (`stdout`, `stderr`) and converts them into typed engine output events.
- **Sandboxing & Lifecycle**:
  - Enforces execution timeouts and lifecycle cleanup.
  - Adheres strictly to the JSON-RPC 2.0 messages defined in `@glyphide/rpc-protocol`.
