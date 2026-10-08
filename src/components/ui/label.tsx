"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { FormFieldIconContext, iconForLabel } from "@/lib/form-field-icons";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, children, ...props }, ref) => {
  const inForm = React.useContext(FormFieldIconContext);
  const Icon = inForm ? iconForLabel(children) : null;
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), Icon && "inline-flex items-center gap-1.5", className)}
      {...props}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
      {children}
    </LabelPrimitive.Root>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
