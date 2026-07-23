import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Represents a local HTTP mock server for integration tests.
 * Manages its own child process to avoid event loop deadlocks in synchronous requests.
 */
export interface TestServer {
  port: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  url: string;
}

const portRegex = /(\d+)/;

/**
 * Creates a new TestServer instance.
 * @returns A TestServer object capable of starting and stopping the mock server.
 */
export function createTestServer(): TestServer {
  let port = 0;
  let cp: ChildProcess | null = null;

  return {
    get port() {
      return port;
    },
    start: () =>
      new Promise<void>((resolve, reject) => {
        const scriptPath = path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "run-server.mjs"
        );
        cp = spawn("node", [scriptPath], {
          stdio: ["ignore", "pipe", "inherit"],
        });

        let output = "";
        cp.stdout?.on("data", (data: string | Buffer) => {
          output += data.toString();
          const match = output.match(portRegex);
          if (match && port === 0) {
            port = Number.parseInt(match[1], 10);
            resolve();
          }
        });

        cp.on("error", reject);
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        if (!cp) {
          resolve();
          return;
        }
        cp.on("exit", () => resolve());
        cp.kill();
      }),
    get url() {
      return `http://127.0.0.1:${port}`;
    },
  };
}
