import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";

export default function CookieBanner() {
  const { cookieDismissed, dismissCookie } = useDesktopStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!cookieDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [cookieDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      dismissCookie();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && !cookieDismissed && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className="fixed bottom-4 right-4 z-[60] w-[380px] bg-white rounded-lg border border-[#D1D1D1] shadow-lg p-4"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#F0EDE6] transition-colors"
            aria-label="Dismiss cookie banner"
          >
            <X className="w-4 h-4 text-[#6B6B6B]" />
          </button>

          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2 pr-6">
            Legally-required cookie banner
          </h3>

          <p className="text-sm text-[#6B6B6B] mb-2">
            PostHog.com doesn&apos;t use third-party cookies, only a single in-house cookie. No data
            is sent to a third party.
          </p>

          <p className="text-sm text-[#6B6B6B] italic mb-3">
            (Ursula von der Leyen would be so proud.)
          </p>

          <div className="flex items-center gap-3">
            <img
              src="/ursula-cookie.png"
              alt="Ursula von der Leyen"
              className="w-16 h-16 rounded-md object-cover"
            />
            <div className="text-xs text-[#9CA3AF]">
              No cookies were harmed in the making of this banner.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
