# @glyphide/orchestrator

Main-thread controller managing execution engines, Web Worker lifecycles, and asynchronous RPC promise resolution.

## Architecture

- **Worker Lifecycle**: Controls worker thread instantiation, readiness handshake, task execution, timeouts, and graceful termination.
- **Promise Registry**: Tracks in-flight RPC requests with timeout guards, ensuring promises resolve or reject cleanly without leaking listeners.
- **Message Bus**: Dispatches and subscribes to events across threads using `@glyphide/rpc-protocol`.
- **Boundary**: Completely engine-agnostic. The orchestrator communicates exclusively via RPC message contracts and must never depend directly on specific engine implementations or DOM APIs.
