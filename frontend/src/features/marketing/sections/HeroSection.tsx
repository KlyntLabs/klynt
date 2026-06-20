import { motion } from "framer-motion";
import { Check, Copy, Link as LinkIcon, Play, User } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { TypewriterText } from "@/features/marketing/components/TypewriterText";

interface HeroSectionProps {
  onOpenApp: (route: string, title?: string) => void;
}

export function HeroSection({ onOpenApp }: HeroSectionProps) {
  const { t } = useTranslation("marketing");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(t("home.hero.installCommand")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [t]);

  return (
    <section className="mb-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          className="flex-1 min-w-0"
        >
          {/* Logo Lockup */}
          <div className="flex items-center gap-2 mb-5">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label={t("home.hero.logoAlt")}
            >
              <title>{t("home.hero.logoAlt")}</title>
              <rect width="32" height="32" rx="6" fill="#1A1A2E" />
              <path d="M8 10h3v8h5v-8h3v12h-3v-4h-5v4H8V10z" fill="#F76E18" />
              <circle cx="22" cy="12" r="2" fill="#F76E18" />
            </svg>
            <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
              {t("home.hero.brand")}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold text-[#1A1A1A] leading-tight mb-3">
            {t("home.hero.title")}
          </h1>

          {/* Subheadline */}
          <p className="text-base text-[#6B6B6B] leading-relaxed mb-1">
            {t("home.hero.subtitle1")}
          </p>
          <p className="text-base text-[#6B6B6B] leading-relaxed mb-5">
            {t("home.hero.subtitle2")}
            <em className="text-[#1A1A1A]">
              <TypewriterText text={t("home.hero.subtitle2Emphasis")} speed={80} />
            </em>
            .
          </p>

          {/* CTA Row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex flex-wrap gap-3 mb-4"
          >
            <button
              type="button"
              onClick={() => onOpenApp("/pricing", t("home.hero.ctaPrimary"))}
              className="px-5 py-2.5 rounded-md bg-[#F76E18] hover:bg-[#E56310] text-white font-semibold transition-colors"
            >
              {t("home.hero.ctaPrimary")}
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-md border border-[#D1D1D1] bg-white text-[#1A1A1A] font-medium hover:bg-[#F5F3EF] transition-colors"
            >
              {t("home.hero.ctaSecondary")}
            </button>
          </motion.div>

          {/* Install Command */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 bg-[#F5F3EF] border border-[#E5E5E5] rounded-md px-4 py-2.5">
              <code className="text-sm font-mono text-[#1A1A1A] flex-1">
                {t("home.hero.installCommand")}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E5E5E5] transition-colors"
                title={t("home.hero.copyTooltip")}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#22C55E]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#6B6B6B]" />
                )}
              </button>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1.5">{t("home.hero.installHint")}</p>
          </motion.div>

          {/* Link Row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center gap-2 text-sm text-[#6B6B6B]"
          >
            <button
              type="button"
              onClick={() => onOpenApp("/docs", t("home.hero.links.mcp"))}
              className="text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <LinkIcon className="w-3.5 h-3.5" /> {t("home.hero.links.mcp")}
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => onOpenApp("/demo", t("home.hero.links.demo"))}
              className="text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" /> {t("home.hero.links.demo")}
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => onOpenApp("/talk-to-a-human", t("home.hero.links.talkToHuman"))}
              className="text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" /> {t("home.hero.links.talkToHuman")}
            </button>
          </motion.div>
        </motion.div>

        {/* Right: Hero Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center justify-center shrink-0"
        >
          <img
            src="/hedgehog-hero.png"
            alt={t("home.hero.mascotAlt")}
            width={1024}
            height={1024}
            fetchPriority="high"
            className="w-[260px] h-auto animate-bounce"
            style={{ animation: "float 3s ease-in-out infinite" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
