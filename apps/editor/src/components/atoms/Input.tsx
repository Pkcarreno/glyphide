import { cva, type VariantProps } from "class-variance-authority";
import { type JSX, Show, splitProps } from "solid-js";
import { cn } from "../../helpers/cn.ts";

const inputWrapperVariants = cva(
  "flex items-center text-on-surface transition-colors",
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
          "rounded-none border-outline-variant border-b bg-transparent px-2",
        default:
          "rounded-sm border border-outline-variant bg-surface px-2 focus-within:ring-2 focus-within:ring-primary/30",
        ghost:
          "rounded-sm border-none bg-transparent px-2 focus-within:bg-surface-variant/30",
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
        inputWrapperVariants({ size: local.inputSize, variant: local.variant }),
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
