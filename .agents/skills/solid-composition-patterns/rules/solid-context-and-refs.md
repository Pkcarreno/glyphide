---
title: Compose Context Components and Ref Arrays
impact: CRITICAL
impactDescription: enforces mandatory context contracts and leak-free ref composition
tags: solidjs, context, refs, directives, onSettled
---

## Compose Context Components and Ref Arrays

In Solid 2.0, `createContext` returns a component you render directly as `<Ctx value={...}>`. Default-less `createContext<T>()` throws `ContextNotFoundError` when read outside an enclosing provider, turning missing providers into an immediate failure. Because `undefined` always means "not provided", model optional contexts explicitly with `null`: `createContext<T | null>(null)`.

For DOM element access and reusable element behaviors, pass a variable, callback, or nested array to `ref`. A `ref` callback runs untracked and owns nothing—create `onSettled` or reactive primitives inside the outer directive factory during component setup and return only the `(element) => void` callback.

**Pattern (direct context component, `null` optional context, and `ref` array with directive factory):**

```tsx
import { createContext, onSettled, useContext, type ParentProps, type Ref } from 'solid-js';

interface FocusGroupContextValue {
  register: (el: HTMLElement) => void;
}

// Optional context uses null (never undefined)
const FocusGroupContext = createContext<FocusGroupContextValue | null>(null);

// Directive factory owns setup/cleanup via onSettled; returned callback only stores the element
function autoSelectOnFocus() {
  let target: HTMLInputElement | undefined;

  onSettled(() => {
    const el = target;
    if (!el) return;
    const onFocus = () => el.select();
    el.addEventListener('focus', onFocus);
    return () => el.removeEventListener('focus', onFocus);
  });

  return (el: HTMLInputElement) => {
    target = el;
  };
}

function ComposerInput(props: { ref?: Ref<HTMLInputElement> }) {
  const group = useContext(FocusGroupContext);
  let input!: HTMLInputElement;

  return (
    <input
      ref={[
        (el) => (input = el),
        props.ref,
        group ? (el) => group.register(el) : undefined,
        autoSelectOnFocus(),
      ]}
    />
  );
}

// Mandatory context omits defaultValue so missing providers throw ContextNotFoundError
const ThemeContext = createContext<'light' | 'dark'>();

function ThemeScope(props: ParentProps<{ theme: 'light' | 'dark' }>) {
  return <ThemeContext value={props.theme}>{props.children}</ThemeContext>;
}
```

References: [createContext](https://docs.solidjs.com/reference/solid-js/components-context/create-context) · [ref](https://docs.solidjs.com/reference/solid-web/jsx-properties/ref) · [Components and JSX](https://docs.solidjs.com/concepts/components-and-jsx#refs-and-directives)
