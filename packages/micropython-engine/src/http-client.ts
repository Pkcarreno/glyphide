import type { MicroPythonInstance } from "@micropython/micropython-webassembly-pyscript/micropython.mjs";

interface SyncFetchRequest {
  body?: string;
  headers?: Record<string, string>;
  method: string;
  timeout?: number;
  url: string;
}

interface SyncFetchResponse {
  error?: string;
  headers: Record<string, string>;
  status: number;
  statusText: string;
  text: string;
}

declare global {
  var __micropython_fetch_sync: (reqStr: string) => string;
}

const NEWLINE_REGEX = /[\r\n]+/;

let HostXMLHttpRequest: typeof XMLHttpRequest;

/**
 * Captures the host's XMLHttpRequest constructor before it is deleted by the security layer.
 * @public
 */
export function captureHostXMLHttpRequest(): void {
  if (!HostXMLHttpRequest) {
    HostXMLHttpRequest =
      typeof XMLHttpRequest === "undefined"
        ? ((globalThis as Record<string, unknown>)
            .XMLHttpRequest as typeof XMLHttpRequest)
        : XMLHttpRequest;
  }
}

/**
 * Installs an HTTP client bridge for MicroPython to perform synchronous network requests.
 *
 * MicroPython in PyScript lacks native HTTP support. We inject standard Python network
 * modules into its Virtual File System (VFS) and route their internal HTTP calls through
 * a synchronous XMLHttpRequest in JavaScript.
 *
 * @param mp - The MicroPython runtime instance
 */
export function installHttpClient(mp: MicroPythonInstance): void {
  if (!HostXMLHttpRequest) {
    captureHostXMLHttpRequest();
  }

  globalThis.__micropython_fetch_sync = (reqStr: string): string => {
    try {
      const req: SyncFetchRequest = JSON.parse(reqStr);
      const xhr = new HostXMLHttpRequest();
      xhr.open(req.method, req.url, false);

      if (req.headers) {
        for (const [key, value] of Object.entries(req.headers)) {
          xhr.setRequestHeader(key, value);
        }
      }

      xhr.send(req.body ?? null);

      const headersString = xhr.getAllResponseHeaders();
      const headersArr = headersString.trim().split(NEWLINE_REGEX);
      const headers: Record<string, string> = {};

      for (const line of headersArr) {
        if (!line) {
          continue;
        }
        const parts = line.split(": ");
        const header = parts.shift();
        const value = parts.join(": ");
        if (header) {
          headers[header.toLowerCase()] = value;
        }
      }

      const response: SyncFetchResponse = {
        headers,
        status: xhr.status,
        statusText: xhr.statusText,
        text: xhr.responseText,
      };

      return JSON.stringify(response);
    } catch (error) {
      const errorResponse: SyncFetchResponse = {
        error: error instanceof Error ? error.message : String(error),
        headers: {},
        status: 0,
        statusText: "Error",
        text: "",
      };
      return JSON.stringify(errorResponse);
    }
  };

  const pythonShim = `
import sys
import json as _json
import js

class Response:
    def __init__(self, raw):
        self.status_code = raw["status"]
        self.reason = raw["statusText"]
        self.headers = raw.get("headers", {})
        self.text = raw.get("text", "")
        self.content = self.text.encode('utf-8')
        
    def json(self):
        return _json.loads(self.text)
        
    def close(self):
        pass

class RequestException(Exception):
    pass

def request(method, url, data=None, json=None, headers=None, stream=None, auth=None, timeout=None):
    if headers is None:
        headers = {}
        
    if json is not None:
        data = _json.dumps(json)
        headers["Content-Type"] = "application/json"
        
    req_dict = {
        "method": method.upper(),
        "url": url,
        "headers": headers
    }
    
    if data is not None:
        req_dict["body"] = data if isinstance(data, str) else str(data)
        
    if timeout is not None:
        req_dict["timeout"] = timeout
        
    req_str = _json.dumps(req_dict)
    raw_res_str = js.__micropython_fetch_sync(req_str)
    raw_res = _json.loads(raw_res_str)
    
    if "error" in raw_res and raw_res["error"]:
        raise RequestException(f"Network request failed: {raw_res['error']}")
        
    return Response(raw_res)

def get(url, **kwargs):
    return request("GET", url, **kwargs)

def post(url, **kwargs):
    return request("POST", url, **kwargs)

def put(url, **kwargs):
    return request("PUT", url, **kwargs)

def patch(url, **kwargs):
    return request("PATCH", url, **kwargs)

def delete(url, **kwargs):
    return request("DELETE", url, **kwargs)

def head(url, **kwargs):
    return request("HEAD", url, **kwargs)

class _Module:
    pass

requests_mod = _Module()
requests_mod.get = get
requests_mod.post = post
requests_mod.put = put
requests_mod.patch = patch
requests_mod.delete = delete
requests_mod.head = head
requests_mod.request = request
requests_mod.Response = Response
requests_mod.RequestException = RequestException

sys.modules["requests"] = requests_mod
sys.modules["urequests"] = requests_mod

# Provide basic urllib.request compatibility
urllib_request_mod = _Module()

class HTTPResponse:
    def __init__(self, text):
        self._text = text
    def read(self):
        return self._text.encode('utf-8')

class Request:
    def __init__(self, url, data=None, headers=None):
        self.full_url = url
        self.data = data
        self.headers = headers or {}
        self.method = "POST" if data else "GET"

def urlopen(url, data=None, timeout=None):
    if isinstance(url, Request):
        req_obj = url
        res = request(req_obj.method, req_obj.full_url, data=req_obj.data, headers=req_obj.headers, timeout=timeout)
    else:
        res = request("POST" if data else "GET", url, data=data, timeout=timeout)
    
    return HTTPResponse(res.text)

urllib_request_mod.urlopen = urlopen
urllib_request_mod.Request = Request

if "urllib" not in sys.modules:
    urllib_mod = _Module()
    sys.modules["urllib"] = urllib_mod
sys.modules["urllib"].request = urllib_request_mod
sys.modules["urllib.request"] = urllib_request_mod
`;

  mp.runPython(pythonShim);
}
