/**
 * Curated beginner-friendly default code for the MicroPython engine.
 * Mirrors the structure of `QUICKJS_DEFAULT_BUFFER_CODE` so users get the
 * same orientation tour when they switch engines on a pristine buffer.
 *
 * Tour order: print() with multiple args → primitives → collections
 * → functions → classes → error handling.
 *
 * @public
 */
export const PYTHON_DEFAULT_BUFFER_CODE = `# Welcome to Glyphide.
# This is the default starter snippet for the MicroPython engine.
# Every new Python project begins with this code in the buffer so you can
# see how the engine prints values without having to write anything from
# scratch.
#
# You can disable this default in Settings → Editor → Default Code on New
# Project. New projects will then open with an empty buffer.

# 1. print() — accepts multiple arguments, joined with spaces and a newline.
print("Hello", "MicroPython", 42)

# 2. Primitives — int, float, str, bool, None.
print(42)            # int
print(3.14)          # float
print("text")        # str
print(True, False)   # bool
print(None)          # None (singleton)

# 3. Collections — list (mutable, ordered), dict (key/value),
#    tuple (immutable), set (unique, unordered).
print([1, 2, 3])                      # list
print({"name": "Ada", "age": 36})     # dict
print((1, 2, 3))                      # tuple
print({"a", "b", "a"})                # set (duplicates collapse)

# 4. Functions — def, return, and default arguments.
def greet(name="world"):
    return "Hello, " + name

print(greet())
print(greet("Glyphide"))

# 5. Classes — basic OOP with __init__ and an instance method.
class Counter:
    def __init__(self, start=0):
        self.value = start

    def step(self, delta=1):
        self.value += delta
        return self.value

c = Counter(10)
print(c.step())
print(c.step(5))

# 6. Error handling — try / except catches runtime errors without crashing.
try:
    result = 10 / 0
except ZeroDivisionError as error:
    print("Caught:", error)

# Edit anything above, then press Ctrl/Cmd + Enter to run your code.
`;
