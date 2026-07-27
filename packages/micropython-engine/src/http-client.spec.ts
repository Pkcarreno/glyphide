/// <reference path="./micropython.d.ts" />
import { loadMicroPython } from "@micropython/micropython-webassembly-pyscript/micropython.mjs";
import wasmUrl from "@micropython/micropython-webassembly-pyscript/micropython.wasm?url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  captureHostApis,
  installHttpClient,
  restoreHostApis,
} from "./http-client.ts";

declare global {
  var testOutput: boolean | string;
  var testOutputRequests: boolean | string;
  var testOutputUrllib: boolean | string;
}

/**
 * Minimal mock for XMLHttpRequest for tests running in Node environment
 */
class MockXMLHttpRequest {
  status = 0;
  statusText = "";
  responseText = "";
  _url = "";
  _method = "";
  _headers: Record<string, string> = {};

  open(method: string, url: string, _async: boolean) {
    this._method = method;
    this._url = url;
  }

  setRequestHeader(key: string, value: string) {
    this._headers[key] = value;
  }

  send(_body: string | null) {
    if (this._url === "https://api.example.com/data") {
      this.status = 200;
      this.statusText = "OK";
      this.responseText = JSON.stringify({
        method: this._method,
        success: true,
      });
    } else {
      this.status = 404;
      this.statusText = "Not Found";
      this.responseText = "Not Found";
    }
  }

  getAllResponseHeaders() {
    return "Content-Type: application/json\\r\\nServer: MockServer\\r\\n";
  }
}

describe("http-client", () => {
  const originalXHR = globalThis.XMLHttpRequest;

  beforeEach(() => {
    globalThis.XMLHttpRequest =
      MockXMLHttpRequest as unknown as typeof XMLHttpRequest;
  });

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXHR;
  });

  it("should provide urequests module to MicroPython", async () => {
    const resolvedWasmUrl = wasmUrl.startsWith("/@fs")
      ? wasmUrl.replace("/@fs", "")
      : wasmUrl;

    const mp = await loadMicroPython({
      stderr: console.error,
      stdout: console.log,
      url: resolvedWasmUrl,
    });

    installHttpClient(mp);

    mp.runPython(`
import urequests
try:
    res = urequests.get("https://api.example.com/data")
    data = res.json()
    import js
    js.globalThis.testOutput = data["success"]
except Exception as e:
    import js
    js.globalThis.testOutput = str(e)
`);

    expect(globalThis.testOutput).toBe(true);
  });

  it("should provide requests and urllib.request modules", async () => {
    const resolvedWasmUrl = wasmUrl.startsWith("/@fs")
      ? wasmUrl.replace("/@fs", "")
      : wasmUrl;

    const mp = await loadMicroPython({
      stderr: console.error,
      stdout: console.log,
      url: resolvedWasmUrl,
    });

    installHttpClient(mp);

    mp.runPython(`
import requests
import urllib.request
import js

try:
    res = requests.post("https://api.example.com/data", json={"test": 123})
    data = res.json()

    urllib_res = urllib.request.urlopen("https://api.example.com/data")
    urllib_text = urllib_res.read().decode('utf-8')

    js.globalThis.testOutputRequests = data["success"]
    js.globalThis.testOutputUrllib = "success" in urllib_text
except Exception as e:
    js.globalThis.testOutputRequests = str(e)
    js.globalThis.testOutputUrllib = str(e)
`);

    expect(globalThis.testOutputRequests).toBe(true);
    expect(globalThis.testOutputUrllib).toBe(true);
  });

  it("should capture and restore host APIs correctly", () => {
    captureHostApis();

    const capturedFetch = globalThis.fetch;
    const capturedXHR = globalThis.XMLHttpRequest;

    (globalThis as Record<string, unknown>).fetch = undefined;
    (globalThis as Record<string, unknown>).XMLHttpRequest = undefined;

    expect(globalThis.fetch).toBeUndefined();
    expect(globalThis.XMLHttpRequest).toBeUndefined();

    restoreHostApis();

    expect(globalThis.fetch).toBe(capturedFetch);
    expect(globalThis.XMLHttpRequest).toBe(capturedXHR);
  });
});
