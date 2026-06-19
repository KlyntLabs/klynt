import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({ className, hasError, ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm shadow-hard-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        hasError && "border-destructive focus-visible:ring-destructive",
        className
      )}
      aria-invalid={hasError ? true : undefined}
      {...props}
    />
  );
}
