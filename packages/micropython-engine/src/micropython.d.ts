declare module "@micropython/micropython-webassembly-pyscript/micropython.mjs" {
  export interface MicroPythonOptions {
    stderr?: (text: string) => void;
    stdout?: (text: string) => void;
    url?: string;
  }

  export interface MicroPythonInstance {
    runPython(code: string): void;
    runPythonAsync(code: string): Promise<void>;
  }

  export function loadMicroPython(
    options?: MicroPythonOptions
  ): Promise<MicroPythonInstance>;
}

declare module "@micropython/micropython-webassembly-pyscript/micropython.wasm?url" {
  const content: string;
  export default content;
}
