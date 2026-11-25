import type { JSX } from "@solidjs/web";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { omit, Show } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const inputWrapperVariants = cva(
  "text-on-surface flex items-center transition-colors",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-7 text-xs",
        lg: "h-9 text-sm",
        sm: "h-6 text-xs",
      },
      variant: {
        bottomBorder:
          "border-outline-variant rounded-none border-b bg-transparent px-2",
        default:
          "border-outline-variant bg-surface focus-within:ring-primary/30 rounded-sm border px-2 focus-within:ring-2",
        ghost:
          "focus-within:bg-surface-variant/30 rounded-sm border-none bg-transparent px-2",
      },
    },
  }
);

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Icon or element to render at the end of the input.
   */
  endIcon?: JSX.Element;
  /**
   * The size of the input.
   */
  inputSize?: VariantProps<typeof inputWrapperVariants>["size"];
  /**
   * Icon or element to render at the start of the input.
   */
  startIcon?: JSX.Element;
  /**
   * The variant of the input.
   */
  variant?: VariantProps<typeof inputWrapperVariants>["variant"];
  /**
   * Additional classes for the input wrapper element.
   */
  wrapperClass?: string;
}

/**
 * A highly reusable input primitive applying SOLID principles.
 * Handles variants for standard inputs, ghost inputs, and bottom-bordered inputs.
 */
export function Input(props: InputProps) {
  const rest = omit(
    props,
    "class",
    "wrapperClass",
    "variant",
    "inputSize",
    "startIcon",
    "endIcon"
  );

  return (
    <div
      class={cn(
        inputWrapperVariants({ size: props.inputSize, variant: props.variant }),
        props.wrapperClass
      )}
    >
      <Show when={props.startIcon}>
        <div class="text-on-surface-variant mr-2 flex shrink-0 items-center justify-center">
          {props.startIcon}
        </div>
      </Show>
      <input
        class={cn(
          "placeholder:text-on-surface-variant/40 flex h-full w-full bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-50",
          props.class
        )}
        {...rest}
      />
      <Show when={props.endIcon}>
        <div class="text-on-surface-variant ml-2 flex shrink-0 items-center justify-center">
          {props.endIcon}
        </div>
      </Show>
    </div>
  );
}
