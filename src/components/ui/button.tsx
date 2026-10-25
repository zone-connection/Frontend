import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium cursor-pointer transition-[color,background-color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D3EBF5] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transform-none [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-0 bg-[#079ED4] text-white shadow-none hover:bg-[#0689b8]",
        destructive:
          "border border-[#E7C8C8] bg-white text-[#A33B3B] shadow-none hover:bg-[#F8ECEC] dark:border-red-400/30 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-500/10",
        outline:
          "border border-[#E2E8EC] bg-white text-[#16324A] shadow-none hover:border-[#B7D7E6] hover:bg-[#F3FAFD] dark:border-white/15 dark:bg-[#1c2430] dark:text-[#f8fafc] dark:hover:border-[#079ED4]/50 dark:hover:bg-[#243044] dark:hover:text-[#f8fafc] [&_svg]:text-[#079ED4]",
        secondary:
          "border border-[#E2E8EC] bg-white text-[#16324A] shadow-none hover:bg-[#F3FAFD] dark:border-white/15 dark:bg-[#1c2430] dark:text-[#f8fafc] dark:hover:bg-[#243044] dark:hover:text-[#f8fafc] [&_svg]:text-[#079ED4]",
        ghost:
          "text-[#5C6B76] hover:bg-[#F3FAFD] hover:text-[#0B3148] dark:text-[#94a3b8] dark:hover:bg-[#1c2430] dark:hover:text-[#f8fafc]",
        link: "text-[#05749E] underline-offset-4 hover:underline dark:text-[#7DD3FC]",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-9 px-3",
        lg: "h-10 px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : null}
            {loading && loadingText ? loadingText : children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
