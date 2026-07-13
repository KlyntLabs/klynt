import { Badge } from "@astryxdesign/core/Badge";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import type { CommunityEvent, CommunitySlackThread, CommunitySpotlight } from "./community-types";

const columnVariants = {
  hidden: { opacity: 0, x: -15 },
  visible: { opacity: 1, x: 0 },
};

export function CommunityLeftColumn() {
  const { t, array, object } = useMarketingTranslation();
  const slackThreads = array<CommunitySlackThread>("community.slack.threads");
  const spotlight = object<CommunitySpotlight>("community.spotlight");
  const events = array<CommunityEvent>("community.events.items");

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
      <div className="border border-[#D1D1D1] p-4 bg-[#FAFAF8] rounded-md">
        <p className="text-xs text-[#6B6B6B] leading-relaxed">{t("community.editor.welcome")}</p>
        <p className="text-xs text-[#9CA3AF] italic mt-2">{t("community.editor.signature")}</p>
      </div>

      <div className="border-t border-[#E5E5E5] pt-4">
        <p className="text-sm text-[#1A1A1A] italic leading-relaxed">
          &ldquo;{t("community.wisdom.quote")}&rdquo;
        </p>
        <p className="text-xs text-[#9CA3AF] mt-2">{t("community.wisdom.attribution")}</p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#1A1A1A]">
          {t("community.slack.title")}
        </h2>
        <div className="space-y-3">
          {slackThreads.map((thread) => (
            <div key={thread.title} className="pb-3 border-b border-[#F0EDE6] last:border-0">
              <Badge variant="neutral" label={thread.channel} className="mb-1" />
              <p className="text-sm font-medium text-[#1A1A1A] hover:text-[#2563EB] cursor-pointer leading-snug">
                {thread.title}
              </p>
              <p className="text-xs text-[#6B6B6B] line-clamp-2 mt-1">{thread.preview}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[#D1D1D1] p-4 bg-[#FAFAF8] rounded-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-[#E5E5E5] flex items-center justify-center text-sm font-semibold text-[#6B6B6B]">
            {spotlight.name[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{spotlight.name}</p>
            <p className="text-xs text-[#6B6B6B]">{spotlight.role}</p>
          </div>
        </div>
        <p className="text-xs text-[#6B6B6B] leading-relaxed">{spotlight.bio}</p>
        <button
          type="button"
          className="text-xs text-[#2563EB] mt-2 hover:underline inline-flex items-center gap-0.5"
        >
          {t("community.spotlight.cta", { name: spotlight.name })}{" "}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#1A1A1A]">
          {t("community.events.title")}
        </h2>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.title}
              className="flex items-start gap-2 pb-3 border-b border-[#F0EDE6] last:border-0"
            >
              <Calendar className="w-4 h-4 text-[#F76E18] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">{event.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#6B6B6B]">{event.date}</span>
                  <Badge variant="neutral" label={event.type} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.aside>
  );
}
