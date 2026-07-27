import { describe, expect, it } from "vitest";
import { PYTHON_DEFAULT_BUFFER_CODE } from "./python-default-buffer-code.ts";

const LOOP_REGEX =
  /for\s+\w+\s+in\s+range\s*\(\s*(1000|10000|100000|1000000)\b/;
const PRINT_MULTI_ARG_REGEX = /print\s*\([^)]*,[^)]*\)/;
const INT_LITERAL_REGEX = /\b42\b/;
const FLOAT_LITERAL_REGEX = /\b3\.14\b/;
const STRING_LITERAL_REGEX = /["'].*["']/;
const BOOL_LITERAL_REGEX = /\b(True|False)\b/;
const NONE_LITERAL_REGEX = /\bNone\b/;
const LIST_LITERAL_REGEX = /\[.*\]/;
const DICT_LITERAL_REGEX = /\{.*:.*\}/;
const TUPLE_LITERAL_REGEX = /\(.*,\s*.*\)/;
const SET_LITERAL_REGEX = /\{[^:{}]+\}/;
const DEF_REGEX = /def\s+\w+\s*\(/;
const RETURN_REGEX = /\breturn\b/;
const DEFAULT_ARG_REGEX = /def\s+\w+\s*\([^)]*=\s*[^),]+/;
const CLASS_REGEX = /class\s+\w+/;
const INIT_REGEX = /def\s+__init__\s*\(/;
const TRY_REGEX = /\btry\s*:/;
const EXCEPT_REGEX = /\bexcept\b/;
const EVAL_REGEX = /\beval\s*\(/;
const EXEC_REGEX = /\bexec\s*\(/;

describe("PYTHON_DEFAULT_BUFFER_CODE", () => {
  it("is a non-empty string", () => {
    expect(typeof PYTHON_DEFAULT_BUFFER_CODE).toBe("string");
    expect(PYTHON_DEFAULT_BUFFER_CODE.trim().length).toBeGreaterThan(0);
  });

  it("demonstrates print() with multiple arguments", () => {
    // Multi-arg print is the headline feature of MicroPython's console.
    expect(PYTHON_DEFAULT_BUFFER_CODE).toMatch(PRINT_MULTI_ARG_REGEX);
  });

  it("covers primitive types: int, float, str, bool, None", () => {
    // Spot-check a literal of each kind somewhere in the snippet.
    const code = PYTHON_DEFAULT_BUFFER_CODE;
    expect(code).toMatch(INT_LITERAL_REGEX);
    expect(code).toMatch(FLOAT_LITERAL_REGEX);
    expect(STRING_LITERAL_REGEX.test(code)).toBe(true);
    expect(BOOL_LITERAL_REGEX.test(code)).toBe(true);
    expect(NONE_LITERAL_REGEX.test(code)).toBe(true);
  });

  it("covers collections: list, dict, tuple, set", () => {
    const code = PYTHON_DEFAULT_BUFFER_CODE;
    expect(LIST_LITERAL_REGEX.test(code)).toBe(true);
    expect(DICT_LITERAL_REGEX.test(code)).toBe(true);
    expect(TUPLE_LITERAL_REGEX.test(code)).toBe(true);
    expect(SET_LITERAL_REGEX.test(code)).toBe(true);
  });

  it("covers functions: def, return, default args", () => {
    const code = PYTHON_DEFAULT_BUFFER_CODE;
    expect(DEF_REGEX.test(code)).toBe(true);
    expect(RETURN_REGEX.test(code)).toBe(true);
    // Default arg: parameter = literal
    expect(DEFAULT_ARG_REGEX.test(code)).toBe(true);
  });

  it("covers classes (basic OOP)", () => {
    const code = PYTHON_DEFAULT_BUFFER_CODE;
    expect(CLASS_REGEX.test(code)).toBe(true);
    expect(INIT_REGEX.test(code)).toBe(true);
  });

  it("covers error handling: try / except", () => {
    const code = PYTHON_DEFAULT_BUFFER_CODE;
    expect(TRY_REGEX.test(code)).toBe(true);
    expect(EXCEPT_REGEX.test(code)).toBe(true);
  });

  it("does not contain hostile objects that would crash a beginner tour", () => {
    // Trap getters, eval, exec, and dynamic code execution are out of scope.
    expect(EVAL_REGEX.test(PYTHON_DEFAULT_BUFFER_CODE)).toBe(false);
    expect(EXEC_REGEX.test(PYTHON_DEFAULT_BUFFER_CODE)).toBe(false);
  });

  it("does not contain performance traps (1000+ iteration loops)", () => {
    // Reject 1k+ loops that would visibly slow first paint.
    expect(LOOP_REGEX.test(PYTHON_DEFAULT_BUFFER_CODE)).toBe(false);
  });
});
