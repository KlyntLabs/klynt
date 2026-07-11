import { forwardRef } from "react";
import { Link } from "react-router-dom";

/**
 * Adapter registered with Astryx's LinkProvider. Astryx renders links as
 * <Component href=... className=... style=... children=...>; React Router's
 * Link expects `to`. This maps href→to for in-app paths and falls back to a
 * plain <a> for external/absolute URLs and hash/mailto links.
 */
export const RouterLink = forwardRef<
  HTMLAnchorElement,
  { href?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>
>(function RouterLink({ href, children, ...rest }, ref) {
  const isInternal = !!href && href.startsWith("/") && !href.startsWith("//");
  if (isInternal) {
    return (
      <Link to={href} ref={ref} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} ref={ref} {...rest}>
      {children}
    </a>
  );
});
