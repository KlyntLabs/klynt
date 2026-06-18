import { cn } from "@/lib/utils";
import { Link, type LinkProps } from "react-router-dom";

interface PrefetchLinkProps extends LinkProps {
  prefetch?: "none" | "intent" | "render" | "viewport";
}

export function PrefetchLink({ prefetch = "intent", className, ...props }: PrefetchLinkProps) {
  return <Link prefetch={prefetch} className={cn(className)} {...props} />;
}
