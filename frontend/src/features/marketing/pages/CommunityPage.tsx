import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ──────────────────────────── helpers ──────────────────────────── */

function getTodayDate(language: string): string {
  const d = new Date();
  return d.toLocaleDateString(language === "cn" ? "zh-CN" : language === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const COLUMN_VARIANTS = {
  left: { hidden: { opacity: 0, x: -15 }, visible: { opacity: 1, x: 0 } },
  center: { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } },
  right: { hidden: { opacity: 0, x: 15 }, visible: { opacity: 1, x: 0 } },
};

/* ──────────────────────────── page ──────────────────────────── */

export default function CommunityPage() {
  const { t, i18n } = useTranslation("marketing");
  const [email, setEmail] = useState("");

  const slackThreads = t("community.slack.threads", { returnObjects: true }) as {
    channel: string;
    title: string;
    preview: string;
  }[];
  const articles = t("community.articles.items", { returnObjects: true }) as {
    category: string;
    title: string;
    excerpt: string;
  }[];
  const questions = t("community.questions.items", { returnObjects: true }) as {
    topic: string;
    reply: string;
  }[];
  const changelogItems = t("community.changelog.items", { returnObjects: true }) as {
    category: string;
    text: string;
  }[];
  const featureRequests = t("community.featureRequests.items", { returnObjects: true }) as {
    name: string;
    votes: number;
  }[];
  const events = t("community.events.items", { returnObjects: true }) as {
    title: string;
    date: string;
    type: string;
  }[];
  const stats = t("community.stats", { returnObjects: true }) as {
    slackMembers: { value: string; label: string };
    messagesSent: { value: string; label: string };
    countries: { value: string; label: string };
  };
  const spotlight = t("community.spotlight", { returnObjects: true }) as {
    name: string;
    role: string;
    bio: string;
  };

  return (
    <ScrollArea className="h-full bg-white">
      <div className="min-h-full">
        {/* Newspaper header */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="px-6 md:px-8 pt-6 pb-4 border-b-[3px] border-double border-[#1A1A1A]"
        >
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
            <p className="text-sm text-[#6B6B6B]">{getTodayDate(i18n.language)}</p>
            <h1
              className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-center"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {t("community.header.title")}
            </h1>
            <div className="flex items-center gap-2 text-xs text-[#22C55E]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("community.header.operational")}
            </div>
          </div>
          {/* Tagline */}
          <p className="text-xs text-[#6B6B6B] text-center italic">
            {t("community.header.tagline")}
          </p>
        </motion.header>

        {/* 3-column layout */}
        <div className="flex flex-col lg:flex-row gap-6 p-6 md:p-8">
          {/* ───── Column 1: Left sidebar ───── */}
          <motion.aside
            variants={COLUMN_VARIANTS.left}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="lg:w-[25%] space-y-6"
          >
            {/* From the editor */}
            <div className="border border-[#D1D1D1] p-4 bg-[#FAFAF8] rounded-md">
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                {t("community.editor.welcome")}
              </p>
              <p className="text-xs text-[#9CA3AF] italic mt-2">
                {t("community.editor.signature")}
              </p>
            </div>

            {/* Hedgehog wisdom */}
            <div className="border-t border-[#E5E5E5] pt-4">
              <p className="text-sm text-[#1A1A1A] italic leading-relaxed">
                &ldquo;{t("community.wisdom.quote")}&rdquo;
              </p>
              <p className="text-xs text-[#9CA3AF] mt-2">{t("community.wisdom.attribution")}</p>
            </div>

            {/* From the Slack */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#1A1A1A]">
                {t("community.slack.title")}
              </h2>
              <div className="space-y-3">
                {slackThreads.map((thread) => (
                  <div key={thread.title} className="pb-3 border-b border-[#F0EDE6] last:border-0">
                    <Badge
                      variant="secondary"
                      className="text-[10px] text-[#9CA3AF] bg-[#F5F3EF] px-1 py-0 mb-1 font-normal"
                    >
                      {thread.channel}
                    </Badge>
                    <p className="text-sm font-medium text-[#1A1A1A] hover:text-[#2563EB] cursor-pointer leading-snug">
                      {thread.title}
                    </p>
                    <p className="text-xs text-[#6B6B6B] line-clamp-2 mt-1">{thread.preview}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Meet a team member */}
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

            {/* Upcoming events */}
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
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-auto font-normal"
                        >
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>

          {/* ───── Column 2: Main articles ───── */}
          <motion.section
            variants={COLUMN_VARIANTS.center}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="lg:w-[50%]"
          >
            {/* Featured article */}
            <motion.article
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 pb-6 border-b border-[#E5E5E5]"
            >
              <div className="w-full aspect-[16/10] bg-[#F5F3EF] rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                <img
                  src="/hedgehog-hero.png"
                  alt={t("community.header.title")}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs text-[#9CA3AF] uppercase tracking-wider">
                {articles[0]?.category}
              </span>
              <h2 className="text-xl font-bold text-[#1A1A1A] leading-tight hover:text-[#2563EB] cursor-pointer mt-1">
                {articles[0]?.title}
              </h2>
              <p className="text-sm text-[#6B6B6B] leading-relaxed mt-2 line-clamp-3">
                {articles[0]?.excerpt}
              </p>
            </motion.article>

            {/* Secondary articles */}
            <div className="space-y-0">
              {articles.slice(1).map((article, i) => (
                <motion.article
                  key={article.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: (i + 1) * 0.08 }}
                  className="flex gap-4 mb-6 pb-6 border-b border-[#F0EDE6] last:border-0"
                >
                  <div className="w-20 h-[60px] bg-[#F5F3EF] rounded shrink-0 overflow-hidden flex items-center justify-center">
                    <img src="/product-os-hero.png" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[#9CA3AF] uppercase tracking-wider">
                      {article.category}
                    </span>
                    <h3 className="text-sm font-bold text-[#1A1A1A] leading-snug hover:text-[#2563EB] cursor-pointer mt-0.5">
                      {article.title}
                    </h3>
                    <p className="text-xs text-[#6B6B6B] leading-relaxed mt-1 line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Community stats bar */}
            <div className="mt-6 bg-[#F5F3EF] rounded-lg p-4 flex items-center justify-around">
              <div className="text-center">
                <p className="text-lg font-bold text-[#1A1A1A]">{stats.slackMembers.value}</p>
                <p className="text-[10px] text-[#6B6B6B]">{stats.slackMembers.label}</p>
              </div>
              <div className="w-px h-8 bg-[#D1D1D1]" />
              <div className="text-center">
                <p className="text-lg font-bold text-[#1A1A1A]">{stats.messagesSent.value}</p>
                <p className="text-[10px] text-[#6B6B6B]">{stats.messagesSent.label}</p>
              </div>
              <div className="w-px h-8 bg-[#D1D1D1]" />
              <div className="text-center">
                <p className="text-lg font-bold text-[#1A1A1A]">{stats.countries.value}</p>
                <p className="text-[10px] text-[#6B6B6B]">{stats.countries.label}</p>
              </div>
            </div>
          </motion.section>

          {/* ───── Column 3: Right sidebar ───── */}
          <motion.aside
            variants={COLUMN_VARIANTS.right}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="lg:w-[25%] space-y-6"
          >
            {/* Newsletter subscribe */}
            <div className="border border-[#D1D1D1] p-4 bg-[#F0EDE6] rounded-md">
              <h2 className="text-sm font-semibold text-[#1A1A1A]">
                {t("community.newsletter.title")}
              </h2>
              <p className="text-xs text-[#F76E18] font-medium mt-0.5">
                {t("community.newsletter.subtitle")}
              </p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">{t("community.newsletter.body")}</p>
              <div className="mt-3 space-y-2">
                <Input
                  type="email"
                  placeholder={t("community.newsletter.placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border-[#D1D1D1] rounded px-3 py-2 text-sm h-auto"
                />
                <Button className="w-full bg-[#1A1A1A] text-white text-sm font-medium rounded px-3 py-2 hover:bg-[#333] h-auto">
                  {t("community.newsletter.cta")}
                </Button>
              </div>
            </div>

            {/* Join Slack */}
            <div className="border border-[#D1D1D1] p-4 bg-[#FAFAF8] rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5 text-[#F76E18]" />
                <h2 className="text-sm font-semibold text-[#1A1A1A]">
                  {t("community.slackJoin.title")}
                </h2>
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

            {/* Latest questions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[#1A1A1A]">
                  {t("community.questions.title")}
                </h2>
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

            {/* Changelog teaser */}
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

            {/* Feature requests */}
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

            {/* CEO musings */}
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
        </div>
      </div>
    </ScrollArea>
  );
}
