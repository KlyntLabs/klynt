import { Link, type LinkProps } from "react-router-dom";

interface PrefetchLinkProps extends LinkProps {
  prefetch?: "none" | "intent" | "render" | "viewport";
}

export function PrefetchLink({ prefetch = "intent", ...props }: PrefetchLinkProps) {
  return <Link prefetch={prefetch} {...props} />;
}
