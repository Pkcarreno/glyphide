import { encode as base64Encode } from "js-base64";
import { encode as fflateEncode } from "./codec.ts";

/**
 * Pre-built URL fixtures that exercise each supported version.
 * These exist to keep handler tests declarative and decoupled from
 * encoder/decoder implementation details. If the codec or
 * js-base64 versions change, regenerate `v3` and `v2` constants
 * using the helpers below.
 */

function v1Url(code: string, title: string): string {
  const state = { state: { code, title } };
  const doubleJson = JSON.stringify(JSON.stringify(state));
  const encoded = base64Encode(doubleJson, true);
  return `https://glyphide.com/#code=${encoded}`;
}

function v2Url(code: string, title?: string): string {
  const params = new URLSearchParams();
  params.set("c", base64Encode(code, true));
  if (title !== undefined) {
    params.set("t", base64Encode(title, true));
  }
  return `https://glyphide.com/?${params.toString()}`;
}

function v3Url(code: string, name: string, engine?: string): string {
  const params = new URLSearchParams();
  params.set("code", fflateEncode(code));
  params.set("name", fflateEncode(name));
  if (engine !== undefined) {
    params.set("engine", fflateEncode(engine));
  }
  return `https://glyphide.com/?${params.toString()}`;
}

export const FIXTURES = {
  v1: {
    simple: v1Url("console.log(1)", "Hello"),
    long: v1Url(
      "function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));",
      "Add Function"
    ),
    noTitle: v1Url("console.log(1)", ""),
    unicodeName: v1Url("print('hi')", "Título con ñ y 🚀"),
  },
  v2: {
    simple: v2Url("console.log(1)", "Hello"),
    codeOnly: v2Url("console.log(1)"),
    long: v2Url(
      "function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));",
      "Add Function"
    ),
  },
  v3: {
    quickjs: v3Url("console.log(1)", "Hello", "quickjs"),
    micropython: v3Url("print('hi')", "Greet", "micropython:python"),
    codeAndName: v3Url("console.log(1)", "Hello"),
  },
  invalid: {
    empty: "",
    whitespace: "   ",
    notAUrl: "not-a-url",
    unknownVersion: "https://glyphide.com/?foo=bar",
  },
} as const;
