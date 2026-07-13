import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, MessageCircle, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import type {
  CommunityChangelogItem,
  CommunityFeatureRequest,
  CommunityQuestion,
} from "./community-types";

const columnVariants = {
  hidden: { opacity: 0, x: 15 },
  visible: { opacity: 1, x: 0 },
};

export function CommunityRightColumn() {
  const { t, array } = useMarketingTranslation();
  const [email, setEmail] = useState("");

  const questions = array<CommunityQuestion>("community.questions.items");
  const changelogItems = array<CommunityChangelogItem>("community.changelog.items");
  const featureRequests = array<CommunityFeatureRequest>("community.featureRequests.items");

  return (
    <motion.aside
      variants={columnVariants}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className="lg:w-[25%] space-y-6"
    >
      <div className="border border-[#D1D1D1] p-4 bg-[#F0EDE6] rounded-md">
        <h2 className="text-sm font-semibold text-[#1A1A1A]">{t("community.newsletter.title")}</h2>
        <p className="text-xs text-[#F76E18] font-medium mt-0.5">
          {t("community.newsletter.subtitle")}
        </p>
        <p className="text-xs text-[#6B6B6B] mt-0.5">{t("community.newsletter.body")}</p>
        <div className="mt-3 space-y-2">
          <TextInput
            label={t("community.newsletter.title")}
            isLabelHidden
            type="email"
            placeholder={t("community.newsletter.placeholder")}
            value={email}
            onChange={setEmail}
          />
          <Button variant="primary" label={t("community.newsletter.cta")} className="w-full" />
        </div>
      </div>

      <div className="border border-[#D1D1D1] p-4 bg-[#FAFAF8] rounded-md">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-5 h-5 text-[#F76E18]" />
          <h2 className="text-sm font-semibold text-[#1A1A1A]">{t("community.slackJoin.title")}</h2>
        </div>
        <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
          {t("community.slackJoin.body")}
        </p>
        <button
          type="button"
          className="w-full text-center text-xs text-white bg-[#F76E18] hover:bg-[#E56310] font-medium px-3 py-2 rounded transition-colors"
        >
          {t("community.slackJoin.cta")}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#1A1A1A]">{t("community.questions.title")}</h2>
          <button type="button" className="text-xs text-[#2563EB] hover:underline">
            {t("community.questions.viewAll")} <ArrowRight className="w-3 h-3 inline" />
          </button>
        </div>
        <div>
          {questions.map((q) => (
            <div key={q.topic} className="py-2 border-b border-[#F0EDE6] last:border-0">
              <p className="text-sm text-[#1A1A1A] hover:text-[#2563EB] cursor-pointer">
                {q.topic}
              </p>
              <p className="text-xs text-[#9CA3AF]">
                {t("community.questions.reply", { time: q.reply })}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#1A1A1A] mb-2">
          {t("community.changelog.title")}
        </h2>
        <p className="text-xs text-[#6B6B6B] mb-3">{t("community.changelog.body")}</p>
        <div className="space-y-2">
          {changelogItems.map((item) => (
            <div key={item.text} className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full mt-1 shrink-0 bg-[#F76E18]" />
              <div>
                <span className="text-[10px] text-[#9CA3AF]">{item.category}:</span>
                <p className="text-xs text-[#1A1A1A]">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="text-xs text-[#2563EB] mt-2 hover:underline">
          {t("community.changelog.viewAll")} <ArrowRight className="w-3 h-3 inline" />
        </button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#1A1A1A] mb-2">
          {t("community.featureRequests.title")}
        </h2>
        <div>
          {featureRequests.map((req) => (
            <div
              key={req.name}
              className="flex justify-between items-center py-1.5 border-b border-[#F0EDE6] last:border-0"
            >
              <span className="text-xs text-[#1A1A1A]">{req.name}</span>
              <span className="text-xs text-[#6B6B6B] bg-[#F5F3EF] px-1.5 py-0.5 rounded flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {req.votes}
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="text-xs text-[#2563EB] mt-2 hover:underline">
          {t("community.featureRequests.voteCta")} <ArrowRight className="w-3 h-3 inline" />
        </button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#1A1A1A] mb-2">
          {t("community.ceoMusings.title")}
        </h2>
        <p className="text-sm text-[#1A1A1A] leading-relaxed italic">
          &ldquo;{t("community.ceoMusings.quote")}&rdquo;
        </p>
        <button
          type="button"
          className="text-xs text-[#2563EB] mt-2 hover:underline inline-flex items-center gap-0.5"
        >
          {t("community.ceoMusings.cta")} <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </motion.aside>
  );
}
