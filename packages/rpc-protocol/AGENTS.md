# @glyphide/rpc-protocol

Standard JSON-RPC 2.0 protocol definitions, constants, and type guards for the Glyphide Execution System.

## Principles & Invariants

- **Pure Contract**: Zero runtime external dependencies. Defines types, error codes, and guard functions only.
- **Engine & Platform Agnostic**: Must never import engine-specific (QuickJS, MicroPython) or platform-specific (DOM, Node, Web Worker) types.
- **Strict Validation**: All messages passing through the wire must have corresponding runtime type guards in `./guards`. Never rely on unsafe type assertions (`as unknown as ...`) for protocol decoding.
