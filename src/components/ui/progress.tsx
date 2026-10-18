"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/15",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="funil-bar-flow h-full w-full flex-1 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`,
        backgroundImage:
          "linear-gradient(90deg, var(--btn-gradient-from, #0e6f8a) 0%, var(--btn-gradient-to, #079ed4) 30%, #5bc4e8 50%, var(--btn-gradient-to, #079ed4) 70%, var(--btn-gradient-from, #0e6f8a) 100%)",
      }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
