import http from "node:http";

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

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});

server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  console.log(addr.port);
});
