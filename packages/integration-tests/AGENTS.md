# @glyphide/integration-tests

Dedicated workspace package for cross-engine integration tests and runtime security validation.

## Architecture

- **Engine Validation**: Exercises real orchestrator execution across all supported engines (`quickjs-engine`, `micropython-engine`, `mock-engine`).
- **Security & Sandboxing**: Includes dedicated security test suites (`pnpm test:security`) verifying isolation barriers:
  - Infinite loop timeouts and worker termination.
  - Memory boundary enforcement.
  - Global scope sanitization and prototype pollution defense.
- **Environment**: Runs under `happy-dom` to simulate web worker messaging in a headless CI environment.
