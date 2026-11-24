import type {
  ComponentProps as WebComponentProps,
  JSX as WebJSX,
  ValidComponent as WebValidComponent,
} from "@solidjs/web";

declare module "solid-js" {
  export type ValidComponent = WebValidComponent;
  export type ComponentProps<T extends WebValidComponent> =
    WebComponentProps<T>;
  export type JSXElement = WebJSX.Element;
  // biome-ignore lint/style/noNamespace: Ambient type augmentation for third-party libraries
  export namespace JSX {
    export type Element = WebJSX.Element;
    export type ArrayElement = WebJSX.ArrayElement;
    export type FunctionElement = WebJSX.FunctionElement;
    export type HTMLAttributes<T> = WebJSX.HTMLAttributes<T>;
    export type ButtonHTMLAttributes<T> = WebJSX.ButtonHTMLAttributes<T>;
    export type InputHTMLAttributes<T> = WebJSX.InputHTMLAttributes<T>;
    export type SelectHTMLAttributes<T> = WebJSX.SelectHTMLAttributes<T>;
    export type TextareaHTMLAttributes<T> = WebJSX.TextareaHTMLAttributes<T>;
    export type AnchorHTMLAttributes<T> = WebJSX.AnchorHTMLAttributes<T>;
    export type SVGAttributes<T> = WebJSX.SVGAttributes<T>;
    export type SvgSVGAttributes<T> = WebJSX.SvgSVGAttributes<T>;
    export type AriaAttributes = WebJSX.AriaAttributes;
    export type CSSProperties = WebJSX.CSSProperties;
    export type IntrinsicElements = WebJSX.IntrinsicElements;
  }
}

// biome-ignore lint/correctness/noUnresolvedImports: Ambient module augmentation for third-party libraries
declare module "solid-js/jsx-runtime" {
  export type { JSX } from "@solidjs/web";
}
