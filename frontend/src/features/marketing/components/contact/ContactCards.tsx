import { motion } from "framer-motion";
import { ArrowRight, Github, Mail, MessageCircle } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

interface ContactCardDef {
  key: string;
  icon: React.ReactNode;
  iconBg: string;
  href: string;
  external: boolean;
}

export function ContactCards() {
  const { t } = useMarketingTranslation();

  const cards: ContactCardDef[] = [
    {
      key: "discord",
      icon: <MessageCircle className="w-5 h-5 text-[#5865F2]" />,
      iconBg: "bg-[#5865F2]/10",
      href: "https://discord.gg/klynt",
      external: true,
    },
    {
      key: "email",
      icon: <Mail className="w-5 h-5 text-[#F76E18]" />,
      iconBg: "bg-[#F76E18]/10",
      href: "mailto:hey@klynt.com",
      external: false,
    },
    {
      key: "github",
      icon: <Github className="w-5 h-5 text-[#1A1A1A]" />,
      iconBg: "bg-[#1A1A1A]/10",
      href: "https://github.com/Klynt/klynt-edu/issues",
      external: true,
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-3 gap-4 px-8 pb-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {cards.map((card) => (
        <motion.div
          key={card.key}
          className="border border-[#E5E5E5] rounded-xl p-5 bg-white flex flex-col"
          variants={staggerItem}
        >
          <div className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center`}>
            {card.icon}
          </div>
          <h2 className="text-sm font-semibold text-[#1A1A1A] mt-3">
            {t(`talkToHuman.contactCards.${card.key}.title` as never)}
          </h2>
          <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed flex-1">
            {t(`talkToHuman.contactCards.${card.key}.body` as never)}
          </p>
          <a
            href={card.href}
            {...(card.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : { target: undefined, rel: undefined })}
            className="text-xs text-[#2563EB] mt-3 inline-flex items-center gap-0.5 hover:underline"
          >
            {t(`talkToHuman.contactCards.${card.key}.link` as never)}{" "}
            <ArrowRight className="w-3 h-3" />
          </a>
        </motion.div>
      ))}
    </motion.div>
  );
}
