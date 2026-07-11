import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GlassDivider, GlassPanel } from "@/components/glass-panel";
import type { MenuGroup, MenuItem } from "./menu-helpers";

export function MenuDropdown({
  group,
  isOpen,
  onClose,
  onItemClick,
}: {
  group: MenuGroup;
  isOpen: boolean;
  onClose: () => void;
  onItemClick: (item: MenuItem) => void;
}) {
  const { t } = useTranslation("home");

  return (
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
            className="absolute top-full left-0 mt-1.5 min-w-[220px] overflow-hidden p-1.5"
            role="menu"
          >
            {group.items.map((item, idx) =>
              item.separator ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: separators have no unique identifier
                <GlassDivider key={`sep-${idx}`} />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onItemClick(item);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-1.5 text-[13px] text-foreground/90 transition-colors hover:bg-brand hover:text-brand-foreground"
                  role="menuitem"
                >
                  <span>{t(item.label as never)}</span>
                  {item.shortcut && (
                    <span className="text-[11px] text-muted-foreground">{item.shortcut}</span>
                  )}
                </button>
              )
            )}
          </GlassPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
