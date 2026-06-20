import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

export function InstallCard() {
  const { t } = useTranslation("marketing");
  const [copied, setCopied] = useState(false);
  const [showFrameworks, setShowFrameworks] = useState(false);

  const command = t("products.hero.installCommand");
  const frameworks = t("products.hero.frameworks", { returnObjects: true }) as string[];

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <div className="border border-[#D1D1D1] rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 bg-[#F5F3EF] hover:bg-[#EBE8E2] rounded-md text-sm font-medium transition-colors"
        >
          {t("products.hero.getStarted")} <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-[#F5F3EF] rounded-md px-3 py-2 text-sm font-mono text-[#1A1A1A]">
          {command}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="h-9 w-9 flex items-center justify-center rounded-md bg-[#F5F3EF] hover:bg-[#EBE8E2] transition-colors border border-[#D1D1D1]"
          title={t("products.hero.copyTooltip")}
        >
          {copied ? (
            <Check className="w-4 h-4 text-[#22C55E]" />
          ) : (
            <Copy className="w-4 h-4 text-[#6B6B6B]" />
          )}
        </button>
      </div>
      <div className="text-xs text-[#6B6B6B]">
        {t("products.hero.supports")}{" "}
        <button type="button" className="text-[#2563EB] hover:underline">
          Next.js
        </button>
        ,{" "}
        <button type="button" className="text-[#2563EB] hover:underline">
          React
        </button>
        ,{" "}
        <button type="button" className="text-[#2563EB] hover:underline">
          Python
        </button>
        , {t("products.hero.and")}{" "}
        <button
          type="button"
          onClick={() => setShowFrameworks(!showFrameworks)}
          className="text-[#2563EB] hover:underline font-medium"
        >
          {t("products.hero.more")}
        </button>
        <AnimatePresence>
          {showFrameworks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 mt-2">
                {frameworks.map((fw) => (
                  <span
                    key={fw}
                    className="px-2 py-0.5 bg-[#F5F3EF] rounded text-[11px] text-[#6B6B6B]"
                  >
                    {fw}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
