---
name: naming-convention
description: Standard rules to follow when naming variables, functions, classes, and other code elements. Use it when you are about to make any changes to the codebase or when the user asks you to check the code, use it as a validation check to make sure your codebase is consistent and readable.
license: MIT
metadata:
  author: web-quality-skills
  version: "1.0"
---

# Naming Convention

Help to make your codebase consistent and readable.

## Philosophy

- S-I-D: Short, Intuitive, Descriptive.
- English: Maintain industry consistency.
- No Vague: Ban `foo`, `temp`, `data`, `a`, `x`.
- No Contractions: `onItemClick` > `onItmClk`.
- Clarity: Prioritize intent description over brevity.

## Rules & Grammar

- Variables: Nouns/Noun phrases (`userAge`, `totalSales`).
- Functions: Verbs/Verb phrases (`calculatePrice`, `handleLogin`).
- Booleans: Use positive phrasing (`isActive`, not `isNotInactive`). Prefixes: `is`, `has`, `can`, `should`.
- Cardinality: Singular for items (`user`), Plural for collections (`users`).
- Context: Avoid duplication. `User.save()`, not `User.saveUser()`.

## A/HC/LC Pattern

Structure: `[Prefix] + Action + HighContext + [LowContext]`

- `get`: Access data immediately.
- `set`: Declarative value assignment.
- `remove`: From collection (Counterpart: `add`).
- `delete`: Permanent erasure (Counterpart: `create`).
- `compose`: Create new data from existing.
- `handle`: Event callbacks.

## Vocabulary

- Suffixes: Manager, Handler, Provider, Builder, Factory, Cache, Proxy, Service.
- Modifiers: `-able` (capability), `-less` (absence), `-er/-or` (agent), `-ed` (state).
- Traits: Abstract, Base, Immutable, Core, Standalone, Scalable, Thread-Safe.

## Metaphors

- Use tangible analogies: _Honeypot_ (bait), _Sandbox_ (isolation), _Garbage Collector_ (cleanup), _Breadcrumb_ (navigation), _Tree_ (hierarchy).

---

**GOLDEN RULE**: A name must fully describe what the code represents or does.