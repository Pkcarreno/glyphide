/**
 * JavaScript source injected into the QuickJS runtime to serialize
 * console arguments into a structured AST (ConsoleToken[]).
 *
 * Runs inside the sandboxed WASM context, not in Node/browser.
 * The global `__glyphide_emit__` callback is bound by the adapter
 * before this code executes.
 */
export const consoleAstSource = `
(function() {
  "use strict";

  function tokenize(value, seen) {
    if (value === null) return { type: "null" };
    if (value === undefined) return { type: "undefined" };

    var t = typeof value;

    if (t === "string") return { type: "string", value: value };
    if (t === "number") return { type: "number", value: value };
    if (t === "boolean") return { type: "boolean", value: value };
    if (t === "bigint") return { type: "bigint", value: String(value) };
    if (t === "function") {
      var src = "";
      try { src = String(value); } catch(e) {}
      return { type: "function", name: value.name || "", source: src };
    }
    if (t === "symbol") return { type: "symbol", description: String(value) };

    // Object or array — check for circular references
    if (seen.has(value)) return { type: "circular" };
    seen.add(value);

    var classTag = Object.prototype.toString.call(value);

    if (classTag === "[object Date]") {
      seen.delete(value);
      return { type: "date", value: value.toISOString ? value.toISOString() : String(value) };
    }
    if (classTag === "[object RegExp]") {
      seen.delete(value);
      return { type: "regexp", source: value.source, flags: value.flags };
    }
    if (classTag === "[object Error]") {
      seen.delete(value);
      return { type: "error", name: value.name, message: value.message, stack: value.stack };
    }
    if (classTag === "[object Promise]") {
      seen.delete(value);
      return { type: "promise" };
    }
    if (classTag === "[object Map]") {
      var entries = [];
      value.forEach(function(v, k) {
        entries.push([tokenize(k, seen), tokenize(v, seen)]);
      });
      seen.delete(value);
      return { type: "map", entries: entries, size: value.size };
    }
    if (classTag === "[object Set]") {
      var elements = [];
      value.forEach(function(v) {
        elements.push(tokenize(v, seen));
      });
      seen.delete(value);
      return { type: "set", elements: elements, size: value.size };
    }

    if (Array.isArray(value)) {
      var elements = [];
      for (var i = 0; i < value.length; i++) {
        elements.push(tokenize(value[i], seen));
      }
      seen.delete(value);
      return { type: "array", elements: elements, length: value.length };
    }

    // Plain object — own properties only
    var properties = {};
    var keys = Object.keys(value);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      try {
        properties[key] = tokenize(value[key], seen);
      } catch (e) {
        properties[key] = { type: "string", value: "[Accessor Error]" };
      }
    }
    seen.delete(value);
    return { type: "object", properties: properties };
  }

  /**
   * WHATWG Console § 2.1 Formatter.
   * Processes format specifiers (%s, %d, %i, %f, %o, %O) in the first
   * argument when it is a string. Returns a new args array with
   * specifiers consumed.
   */
  function applyFormatting(args) {
    if (args.length === 0) return args;
    if (typeof args[0] !== "string") return args;

    var template = args[0];
    var substitutions = args.slice(1);
    var result = [];
    var subIndex = 0;
    var i = 0;
    var current = "";

    while (i < template.length) {
      if (template[i] === "%" && i + 1 < template.length && subIndex < substitutions.length) {
        var spec = template[i + 1];
        if (spec === "s") {
          current += String(substitutions[subIndex]);
          subIndex++;
          i += 2;
          continue;
        }
        if (spec === "d" || spec === "i") {
          current += String(parseInt(substitutions[subIndex], 10));
          subIndex++;
          i += 2;
          continue;
        }
        if (spec === "f") {
          current += String(parseFloat(substitutions[subIndex]));
          subIndex++;
          i += 2;
          continue;
        }
        if (spec === "o" || spec === "O") {
          // Optimally displayable / generic object formatting:
          // flush any accumulated string, then push the sub as its own arg
          if (current.length > 0) {
            result.push(current);
            current = "";
          }
          result.push(substitutions[subIndex]);
          subIndex++;
          i += 2;
          continue;
        }
        if (spec === "c") {
          // Ignore CSS styling
          subIndex++;
          i += 2;
          continue;
        }
        if (spec === "%") {
          current += "%";
          i += 2;
          continue;
        }
      }
      current += template[i];
      i++;
    }

    if (current.length > 0) {
      result.push(current);
    }

    // Append remaining unconsumed substitutions
    while (subIndex < substitutions.length) {
      result.push(substitutions[subIndex]);
      subIndex++;
    }

    return result;
  }

  function createLogger(method) {
    return function() {
      var args = [];
      for (var a = 0; a < arguments.length; a++) {
        args.push(arguments[a]);
      }

      var formatted = applyFormatting(args);
      var tokens = [];
      var seen = new WeakSet();
      for (var i = 0; i < formatted.length; i++) {
        tokens.push(tokenize(formatted[i], seen));
      }

      __glyphide_emit__(method, JSON.stringify(tokens));
    };
  }

  var console = {
    log: createLogger("log"),
    warn: createLogger("warn"),
    error: createLogger("error"),
    info: createLogger("info"),
  };

  globalThis.console = console;
})();
`;
