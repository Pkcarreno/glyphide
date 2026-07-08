import { describe, expect, it } from "vitest";
import type { FileIoPort, FileReadResult } from "../ports/file-io.ts";

/**
 * A contract validation test: ensures FileIoPort exposes the
 * methods required by the File Backup Flow spec.
 *
 * We don't run logic here — the real coverage lives in the
 * browser adapter test (`file-io.test.ts` in adapters/).
 * This test only enforces the type-level surface so a refactor
 * that accidentally drops a method fails CI immediately.
 */
describe("FileIoPort — contract surface", () => {
  it("exposes readFile() and writeFile() methods", () => {
    const port: FileIoPort = {
      readFile: () => Promise.resolve(makeReadResult()),
      writeFile: () => Promise.resolve(),
    };

    expect(typeof port.readFile).toBe("function");
    expect(typeof port.writeFile).toBe("function");
  });

  it("readFile resolves to FileReadResult with name, content, and extension", async () => {
    const port: FileIoPort = {
      readFile: () => Promise.resolve(makeReadResult()),
      writeFile: () => Promise.resolve(),
    };

    const result = await port.readFile();
    expect(result.name).toBe("example.js");
    expect(result.content).toBe("console.log(1)");
    expect(result.extension).toBe(".js");
  });

  it("writeFile accepts a filename and content string", async () => {
    let captured: { filename: string; content: string } | null = null;
    const port: FileIoPort = {
      readFile: () => Promise.resolve(makeReadResult()),
      writeFile: (filename, content) => {
        captured = { filename, content };
        return Promise.resolve();
      },
    };

    await port.writeFile("myproject.py", "print('hi')");
    expect(captured).toEqual({
      filename: "myproject.py",
      content: "print('hi')",
    });
  });

  it("FileReadResult shape is exactly { name, content, extension }", () => {
    const result: FileReadResult = makeReadResult();
    expect(Object.keys(result).sort()).toEqual(
      ["content", "extension", "name"].sort()
    );
  });
});

function makeReadResult(): FileReadResult {
  return { name: "example.js", content: "console.log(1)", extension: ".js" };
}
