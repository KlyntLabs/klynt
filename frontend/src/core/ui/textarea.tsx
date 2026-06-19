import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
  ref?: React.Ref<HTMLTextAreaElement>;
}

export function Textarea({ className, hasError, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm shadow-hard-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        hasError && "border-destructive focus-visible:ring-destructive",
        className
      )}
      aria-invalid={hasError ? true : undefined}
      {...props}
    />
  );
}
