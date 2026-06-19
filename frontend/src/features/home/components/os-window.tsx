import { useId } from "react";
import { cn } from "@/lib/utils";

interface OsWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function WindowDot() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 rounded-full border-2 border-border bg-background"
    />
  );
}

export function OsWindow({ title, children, className }: OsWindowProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "overflow-hidden rounded-lg border-2 border-border bg-card text-card-foreground shadow-hard",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b-2 border-border bg-primary px-3 py-2">
        <WindowDot />
        <WindowDot />
        <WindowDot />
        <span
          id={titleId}
          className="flex-1 truncate text-center text-sm font-bold text-primary-foreground"
        >
          {title}
        </span>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
