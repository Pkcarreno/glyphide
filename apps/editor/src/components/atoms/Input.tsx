import { splitProps, Show, JSX } from "solid-js";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../helpers/cn";

const inputWrapperVariants = cva(
  "flex items-center transition-colors text-on-surface",
  {
    variants: {
      variant: {
        default:
          "px-3 bg-surface border border-outline-variant rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
        ghost:
          "px-3 bg-transparent border-none focus-within:bg-surface-variant/30 rounded-lg",
        bottomBorder:
          "px-3 bg-transparent border-b border-outline-variant rounded-none",
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
   * The variant of the input.
   */
  variant?: VariantProps<typeof inputWrapperVariants>["variant"];
  /**
   * The size of the input.
   */
  inputSize?: VariantProps<typeof inputWrapperVariants>["size"];
  /**
   * Additional classes for the input wrapper element.
   */
  wrapperClass?: string;
  /**
   * Icon or element to render at the start of the input.
   */
  startIcon?: JSX.Element;
  /**
   * Icon or element to render at the end of the input.
   */
  endIcon?: JSX.Element;
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
        <div class="mr-2 flex items-center justify-center shrink-0 text-on-surface-variant">
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
        <div class="ml-2 flex items-center justify-center shrink-0 text-on-surface-variant">
          {local.endIcon}
        </div>
      </Show>
    </div>
  );
}
