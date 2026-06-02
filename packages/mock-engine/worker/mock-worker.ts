/**
 * Mock engine worker entry point.
 * Runs inside a Web Worker context and communicates via postMessage.
 */

import { MockEngineAdapter } from "../src/mock-adapter.ts";

const adapter = new MockEngineAdapter();

adapter.setup(
  // Response sender - wraps response as postMessage payload
  (response) => {
    self.postMessage(response);
  },
  // Notification handler - sends fire-and-forget notifications
  (method, params) => {
    self.postMessage({
      jsonrpc: "2.0",
      method,
      params,
    });
  }
);

// Handle incoming messages from the orchestrator
self.onmessage = (event: MessageEvent) => {
  adapter.handleMessage(event.data);
};

// Signal worker is ready
self.postMessage({ type: "worker-ready" });
