# @glyphide/url-migration

Framework-agnostic library that detects, parses, and re-encodes legacy Glyphide share URLs into the modern format.

## Architecture

- **Versioned Handlers**: Each URL format version has a dedicated handler under `src/handlers/` (`v1`, `v2`, `v3`) implementing a common parser/migration interface.
- **Handler Registry**: New URL formats must register in `src/handlers/registry.ts`. Detection routes incoming query payloads to the matching handler.
- **Portability**: Must remain purely functional and isomorphic (running equally in browser, Node, and test environments) with zero framework bindings.
