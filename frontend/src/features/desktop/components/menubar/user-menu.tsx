import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GlassDivider, GlassPanel } from "@/components/glass-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthModule } from "@/core/auth/auth-module";
import { routePaths } from "@/core/routing/route-paths";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { t } = useTranslation("home");
  const { user, isLoading, logout } = useAuthModule();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div
        className="size-7 animate-pulse rounded-full bg-muted"
        aria-hidden="true"
        data-testid="user-menu-loading"
      />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => navigate(routePaths.login)}
        className="flex h-8 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[12px] font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
      >
        {t("desktop.menubar.signIn")}
      </button>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const menuItems = [
    {
      icon: UserIcon,
      label: t("desktop.menubar.profile"),
      onClick: () => navigate(routePaths.dashboard),
    },
    {
      icon: Settings,
      label: t("desktop.menubar.settings"),
      onClick: () => {},
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 transition-colors",
          isOpen ? "bg-foreground/8" : "hover:bg-foreground/5"
        )}
      >
        <Avatar className="size-7 ring-1 ring-glass-border/50">
          <AvatarFallback className="bg-brand/10 text-[11px] font-semibold text-brand">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-[100px] truncate text-[12px] font-medium text-foreground/80">
          {user.name}
        </span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ originY: 0 }}
          >
            <GlassPanel
              variant="dropdown"
              radius="lg"
              className="absolute right-0 top-full mt-1.5 min-w-[220px] overflow-hidden p-1.5"
            >
              <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
                <Avatar className="size-9 ring-1 ring-glass-border/50">
                  <AvatarFallback className="bg-brand/10 text-xs font-semibold text-brand">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">{user.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <GlassDivider className="mb-1.5 mt-1" />

              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-foreground/90 transition-colors hover:bg-brand hover:text-brand-foreground"
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </button>
              ))}

              <GlassDivider className="my-1" />

              <button
                type="button"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-foreground/90 transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="size-3.5" />
                {t("desktop.menubar.signOut")}
              </button>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
