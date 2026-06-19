import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-lg border-2 border-border p-4 shadow-hard", {
  variants: {
    variant: {
      default: "bg-background text-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      success: "bg-success text-success-foreground",
      warning: "bg-warning text-warning-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  ref?: React.Ref<HTMLDivElement>;
}

export function Alert({ className, ref, variant, ...props }: AlertProps) {
  return (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  ref?: React.Ref<HTMLHeadingElement>;
}

export function AlertTitle({ className, ref, ...props }: AlertTitleProps) {
  return (
    <h5
      ref={ref}
      className={cn("mb-1 text-base font-bold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  ref?: React.Ref<HTMLParagraphElement>;
}

export function AlertDescription({ className, ref, ...props }: AlertDescriptionProps) {
  return <p ref={ref} className={cn("text-sm", className)} {...props} />;
}
