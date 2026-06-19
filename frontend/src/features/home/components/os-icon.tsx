import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn, focusRing } from "@/lib/utils";

interface OsIconProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

export function OsIcon({ to, icon: Icon, label }: OsIconProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 rounded p-2 text-center text-foreground transition-transform hover:-translate-y-1",
        focusRing
      )}
    >
      <Icon aria-hidden="true" className="h-8 w-8" />
      <span className="text-xs font-bold">{label}</span>
    </Link>
  );
}
