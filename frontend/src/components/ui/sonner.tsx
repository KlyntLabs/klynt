import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function getDocumentTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const Toaster = ({ theme, ...props }: ToasterProps) => {
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(getDocumentTheme());

  React.useEffect(() => {
    setResolvedTheme(getDocumentTheme());
    const root = window.document.documentElement;
    const observer = new MutationObserver(() => {
      setResolvedTheme(getDocumentTheme());
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme ?? resolvedTheme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
