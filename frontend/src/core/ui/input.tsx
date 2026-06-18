import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400",
          hasError && "border-red-500 focus:ring-red-400",
          className
        )}
        aria-invalid={hasError ? true : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
