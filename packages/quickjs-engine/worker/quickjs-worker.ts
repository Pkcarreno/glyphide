import { QuickJSEngineAdapter } from "../src/quickjs-adapter.ts";

const adapter = new QuickJSEngineAdapter();

adapter.setup(
  (response) => {
    self.postMessage(response);
  },
  (method, params) => {
    self.postMessage({
      jsonrpc: "2.0",
      method,
      params,
    });
  }
);

self.onmessage = (event: MessageEvent) => {
  adapter.handleMessage(event.data);
};

self.postMessage({ type: "worker-ready" });
