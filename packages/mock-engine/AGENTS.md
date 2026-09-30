# @glyphide/mock-engine

Headless in-memory test engine designed to validate RPC protocol communication and orchestrator behaviors without WebAssembly overhead.

## Architecture

- **Test Double**: Provides a compliant execution engine with deterministic responses, controllable execution delay, and simulated error conditions.
- **Protocol Validation**: Used across unit and integration tests to ensure `@glyphide/orchestrator` and `@glyphide/rpc-protocol` contracts hold under all edge cases.
- **Do Not Use in Production**: Must only be included as a dev/test dependency.
