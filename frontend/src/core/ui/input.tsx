import { cn, focusRing } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({ className, hasError, ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
        hasError && "border-destructive focus-visible:ring-destructive",
        focusRing,
        className
      )}
      aria-invalid={hasError ? true : undefined}
      {...props}
    />
  );
}
