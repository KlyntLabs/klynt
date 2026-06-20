import { motion } from "framer-motion";
import { Headset } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContactCards, ContactForm, FaqSection } from "@/features/marketing/components/contact";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function TalkToHumanPage() {
  const { t } = useTranslation("marketing");

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── Hero ── */}
      <motion.div
        className="flex flex-col items-center px-8 pt-7 pb-5"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.h1
          className="text-3xl font-bold text-[#1A1A1A] text-center"
          variants={fadeUp}
          custom={0}
        >
          {t("talkToHuman.hero.title")}
        </motion.h1>
        <motion.p
          className="text-base text-[#6B6B6B] text-center mt-3 leading-relaxed max-w-sm"
          variants={fadeUp}
          custom={1}
        >
          {t("talkToHuman.hero.subtitle")}
        </motion.p>
        <motion.div className="mt-5" variants={fadeUp} custom={2}>
          <div className="w-16 h-16 rounded-full bg-[#F76E18]/10 flex items-center justify-center">
            <Headset className="w-8 h-8 text-[#F76E18]" />
          </div>
        </motion.div>
      </motion.div>

      <ContactCards />

      {/* ── Contact Form ── */}
      <motion.div
        className="px-8 py-6 border-t border-[#E5E5E5]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.4,
          duration: 0.35,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        }}
      >
        <h2 className="text-lg font-semibold text-[#1A1A1A]">{t("talkToHuman.form.title")}</h2>
        <p className="text-sm text-[#6B6B6B] mb-5">{t("talkToHuman.form.subtitle")}</p>
        <ContactForm />
      </motion.div>

      <FaqSection />

      {/* ── Footer note ── */}
      <div className="px-8 py-5 border-t border-[#E5E5E5] text-center">
        <p className="text-sm text-[#6B6B6B]">{t("talkToHuman.footer.selfServe")}</p>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          {t("talkToHuman.footer.linksBefore")}
          <a href="/docs" className="text-[#2563EB] hover:underline">
            {t("talkToHuman.footer.docs")}
          </a>
          {t("talkToHuman.footer.linksMiddle")}
          <a href="/community" className="text-[#2563EB] hover:underline">
            {t("talkToHuman.footer.community")}
          </a>
          {t("talkToHuman.footer.linksAfter")}
        </p>
      </div>
    </div>
  );
}
