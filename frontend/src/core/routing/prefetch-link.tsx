import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PrefetchLinkProps extends LinkProps {
  prefetch?: "none" | "intent" | "render" | "viewport";
}

export function PrefetchLink({ prefetch = "intent", className, ...props }: PrefetchLinkProps) {
  return <Link prefetch={prefetch} className={cn(className)} {...props} />;
}
