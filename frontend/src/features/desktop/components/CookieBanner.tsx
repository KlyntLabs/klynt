import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const COOKIE_DISMISSED_KEY = "cookie-dismissed";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
}

function isCookieDismissed(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(COOKIE_DISMISSED_KEY) === "true";
}

function dismissCookie(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(COOKIE_DISMISSED_KEY, "true");
}

export default function CookieBanner() {
  const [dismissed, setDismissed] = useState(isCookieDismissed);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation("home");

  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      dismissCookie();
      setDismissed(true);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && !dismissed && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className="fixed bottom-4 right-4 z-[60] w-[380px] bg-white rounded-lg border border-[#D1D1D1] shadow-lg p-4"
        >
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#F0EDE6] transition-colors"
            aria-label={t("desktop.cookieBanner.dismiss")}
          >
            <X className="w-4 h-4 text-[#6B6B6B]" />
          </button>

          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2 pr-6">
            {t("desktop.cookieBanner.heading")}
          </h3>

          <p className="text-sm text-[#6B6B6B] mb-2">{t("desktop.cookieBanner.body")}</p>

          <p className="text-sm text-[#6B6B6B] italic mb-3">{t("desktop.cookieBanner.aside")}</p>

          <div className="flex items-center gap-3">
            <img
              src="/ursula-cookie.webp"
              alt={t("desktop.cookieBanner.ursulaAlt")}
              width={1024}
              height={1024}
              loading="lazy"
              decoding="async"
              className="w-16 h-16 rounded-md object-cover"
            />
            <div className="text-xs text-[#9CA3AF]">{t("desktop.cookieBanner.footer")}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
