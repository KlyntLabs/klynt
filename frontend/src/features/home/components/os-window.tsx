import { cn } from "@/lib/utils";

interface OsWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function OsWindow({ title, children, className }: OsWindowProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border-2 border-border bg-card text-card-foreground shadow-hard",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b-2 border-border bg-primary px-3 py-2">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-border bg-background" />
        <span className="h-3.5 w-3.5 rounded-full border-2 border-border bg-background" />
        <span className="h-3.5 w-3.5 rounded-full border-2 border-border bg-background" />
        <span className="flex-1 truncate text-center text-sm font-bold text-primary-foreground">
          {title}
        </span>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
