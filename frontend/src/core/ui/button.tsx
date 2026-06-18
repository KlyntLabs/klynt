import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

export function Button({
  variant = "primary",
  className,
  children,
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === "primary" && "bg-slate-900 text-white hover:bg-slate-800",
        variant === "secondary" && "border border-slate-300 hover:bg-slate-100",
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
}
