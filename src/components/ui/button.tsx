import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--brand-button-radius,0.5rem)] text-sm font-semibold tracking-tight ring-offset-background transition-all duration-200 cubic-bezier(0.2,0,0,1) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-[1px] active:scale-[0.98] hover:scale-[1.03] hover:-translate-y-[1px]",
  {
    variants: {
      variant: {
        default: "border border-primary bg-primary text-primary-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--brand-button-hover-shadow,0_8px_24px_hsl(var(--primary)/0.22))]",
        destructive: "border border-destructive bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:text-destructive-foreground",
        outline: "border border-primary bg-transparent text-primary shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--brand-button-hover-shadow,0_8px_24px_hsl(var(--primary)/0.18))]",
        secondary: "border border-accent bg-accent/10 text-accent shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "border border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "h-auto border-0 bg-transparent p-0 text-primary underline-offset-4 shadow-none hover:text-accent hover:underline hover:bg-transparent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-ui-button="true"
        data-variant={variant || "default"}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
