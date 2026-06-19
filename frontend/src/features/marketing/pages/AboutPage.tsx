import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  Construction,
  ExternalLink,
  FileText,
  Globe,
  Users,
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "about", label: "About" },
  { id: "roadmap", label: "Roadmap" },
  { id: "wip", label: "WIP" },
  { id: "changelog", label: "Changelog" },
  { id: "people", label: "People" },
  { id: "teams", label: "Teams" },
  { id: "handbook", label: "Handbook" },
  { id: "blog", label: "Blog" },
  { id: "media", label: "Media" },
  { id: "careers", label: "Careers" },
];

const COMING_SOON_ICONS: Record<string, React.ReactNode> = {
  roadmap: <Calendar className="w-8 h-8 text-[#9CA3AF]" />,
  wip: <Construction className="w-8 h-8 text-[#9CA3AF]" />,
  changelog: <Calendar className="w-8 h-8 text-[#9CA3AF]" />,
  people: <Users className="w-8 h-8 text-[#9CA3AF]" />,
  teams: <Users className="w-8 h-8 text-[#9CA3AF]" />,
  handbook: <BookOpen className="w-8 h-8 text-[#9CA3AF]" />,
  blog: <FileText className="w-8 h-8 text-[#9CA3AF]" />,
  media: <Globe className="w-8 h-8 text-[#9CA3AF]" />,
  careers: <Briefcase className="w-8 h-8 text-[#9CA3AF]" />,
};

const TIMELINE = [
  {
    year: "2020",
    title: "Hatched in Y Combinator's W20 batch",
    description: "Two friends with a vision to help product engineers.",
  },
  {
    year: "2020",
    title: "Launched on Hacker News",
    description:
      "Our first analytics product hit the front page. The response was overwhelming. 4 weeks after writing the first line of code.",
  },
  {
    year: "2021-2023",
    title: "Grew beyond analytics",
    description:
      "Added session replay, feature flags, experiments, and more \u2014 becoming a full product OS.",
  },
  {
    year: "2024+",
    title: "The product OS",
    description:
      "10+ products, 190,254+ teams, and counting. Building the everything store for product engineers.",
  },
];

const TEAM_COUNT = "190254";

function ComingSoonPlaceholder({ tabId }: { tabId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-4">
        {COMING_SOON_ICONS[tabId] || <Construction className="w-8 h-8 text-[#9CA3AF]" />}
      </div>
      <p className="text-[#9CA3AF] text-sm">
        Coming soon &mdash; this section is under construction
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-lg">🚧</span>
      </div>
    </motion.div>
  );
}

function AboutTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <ScrollArea className="h-full">
        <div className="p-6 md:p-8">
          {/* Founder header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">
                From the desk of
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E5E5E5] flex items-center justify-center text-sm font-semibold text-[#6B6B6B]">
                  JH
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#1A1A1A]">James Hawkins</p>
                  <p className="text-sm text-[#6B6B6B]">Co-founder</p>
                </div>
              </div>
            </div>
            <a
              href="https://x.com/james406"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#2563EB] hover:underline inline-flex items-center gap-1"
            >
              james406 <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Main content - two column on larger screens */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left: Letter content */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#1A1A1A] leading-tight mb-6">
                We&apos;re here to help product engineers build successful products
              </h1>

              <p className="text-base text-[#1A1A1A] font-medium mb-4">
                Literally every piece of SaaS that a product engineer needs.
              </p>

              <p className="text-base text-[#6B6B6B] leading-relaxed mb-4">
                This includes tools for building products, talking to customers, and making sense of
                all your customer data.
              </p>

              <p className="text-base text-[#1A1A1A] font-medium mb-6">
                PostHog is a single platform for people who build things.
              </p>

              <a
                href="/products"
                className="inline-flex items-center gap-1 bg-[#F76E18] text-white font-medium px-4 py-2 rounded-md hover:bg-[#E56310] transition-colors text-sm mb-8"
              >
                Explore product suite <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Right: Hedgehog illustration */}
            <div className="flex flex-col items-center md:w-[240px] shrink-0">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <img
                  src="/hedgehog-hero.png"
                  alt="PostHog hedgehog mascot"
                  className="w-full max-w-[200px] md:max-w-[240px]"
                />
              </motion.div>
              <p className="text-sm text-[#9CA3AF] italic text-center mt-2">
                There are other dev tool companies, but they not like us 🎵
              </p>
            </div>
          </div>

          {/* Company story section */}
          <div className="mt-12 pt-8 border-t border-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">So how did we get here?</h2>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-[#E5E5E5]" />

              <div className="space-y-6">
                {TIMELINE.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    className="relative flex gap-4"
                  >
                    {/* Dot */}
                    <div className="w-[32px] h-[32px] rounded-full bg-[#F76E18] flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <span className="inline-block bg-[#F5F3EF] text-xs font-medium px-2 py-1 rounded mb-1">
                        {item.year}
                      </span>
                      <h3 className="text-base font-semibold text-[#1A1A1A]">{item.title}</h3>
                      <p className="text-sm text-[#6B6B6B] mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats callout */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="mt-8 bg-[#F5F3EF] rounded-lg p-6 text-center"
            >
              <p className="text-4xl font-bold text-[#F76E18]">{TEAM_COUNT}+</p>
              <p className="text-sm text-[#6B6B6B] mt-1">teams using PostHog</p>
            </motion.div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState("about");

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Sub-navigation tabs */}
      <div className="shrink-0 border-b border-[#E5E5E5] bg-[#F5F3EF] overflow-x-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent h-auto p-0 rounded-none w-full flex">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "flex-shrink-0 rounded-none border-t-2 border-transparent px-3 py-2.5 text-xs font-medium transition-colors data-[state=active]:shadow-none",
                  activeTab === tab.id
                    ? "bg-white border-t-[#F76E18] text-[#1A1A1A] font-medium"
                    : "bg-transparent text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAFAF8]"
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            {activeTab === "about" ? (
              <TabsContent key="about" value="about" className="mt-0 p-0">
                <AboutTab />
              </TabsContent>
            ) : (
              <TabsContent key={activeTab} value={activeTab} className="mt-0 p-0">
                <ComingSoonPlaceholder tabId={activeTab} />
              </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}
