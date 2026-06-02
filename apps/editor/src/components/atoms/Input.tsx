import { cva, type VariantProps } from "class-variance-authority";
import { type JSX, Show, splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const inputWrapperVariants = cva(
  "flex items-center text-on-surface transition-colors",
  {
    variants: {
      variant: {
        default:
          "rounded-lg border border-outline-variant bg-surface px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
        ghost:
          "rounded-lg border-none bg-transparent px-3 focus-within:bg-surface-variant/30",
        bottomBorder:
          "rounded-none border-outline-variant border-b bg-transparent px-3",
      },
      size: {
        sm: "h-8 text-xs",
        default: "h-10 text-sm",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
  const [local, rest] = splitProps(props, [
    "class",
    "wrapperClass",
    "variant",
    "inputSize",
    "startIcon",
    "endIcon",
  ]);

  return (
    <div
      class={cn(
        inputWrapperVariants({ variant: local.variant, size: local.inputSize }),
        local.wrapperClass
      )}
    >
      <Show when={local.startIcon}>
        <div class="mr-2 flex shrink-0 items-center justify-center text-on-surface-variant">
          {local.startIcon}
        </div>
      </Show>
      <input
        class={cn(
          "flex h-full w-full bg-transparent outline-none placeholder:text-on-surface-variant/40 disabled:cursor-not-allowed disabled:opacity-50",
          local.class
        )}
        {...rest}
      />
      <Show when={local.endIcon}>
        <div class="ml-2 flex shrink-0 items-center justify-center text-on-surface-variant">
          {local.endIcon}
        </div>
      </Show>
    </div>
  );
}
