import http from "node:http";

/**
 * Local HTTP test server used by integration and security tests.
 *
 * Functional endpoints:
 *   GET  /json              — JSON payload with X-Custom header
 *   POST /echo              — echoes body + headers
 *   GET  /status/404        — explicit 404
 *
 * Security endpoints (added for `pnpm test:security`):
 *   GET  /metadata          — simulates a cloud-metadata service
 *   GET  /sensitive         — returns a body with Set-Cookie
 *   GET  /large             — 50 MB random bytes (response bomb probe)
 *   GET  /internal          — simulates an internal service on 127.0.0.1
 */

const LARGE_BYTES = 5 * 1024 * 1024;
const largeBuffer = Buffer.alloc(LARGE_BYTES, 0x41); // pre-allocated once

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/json") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "X-Custom": "test-header",
    });
    res.end(JSON.stringify({ message: "success" }));
    return;
  }

  if (req.url === "/echo" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ body, headers: req.headers }));
    });
    return;
  }

  if (req.url === "/status/404") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found Error");
    return;
  }

  // ── Security endpoints ─────────────────────────────────────────

  if (req.url === "/metadata") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        Code: "Success",
        AccessKeyId: "AKIA-FAKE-LEAKED-CREDENTIAL",
        SecretAccessKey: "leaked-secret-do-not-use",
        Token: "session-token-leaked",
      })
    );
    return;
  }

  if (req.url === "/sensitive") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Set-Cookie": "session=stolen-from-victim; HttpOnly",
    });
    res.end(JSON.stringify({ account: "victim", balance: 12_345 }));
    return;
  }

  if (req.url === "/large") {
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(LARGE_BYTES),
    });
    res.end(largeBuffer);
    return;
  }

  if (req.url === "/internal") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("internal-service: only-loopback-should-see-this");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  console.log(addr.port);
});
