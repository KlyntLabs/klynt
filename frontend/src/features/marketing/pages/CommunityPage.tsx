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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ──────────────────────────── data ──────────────────────────── */

const SLACK_THREADS = [
  {
    channel: "#devrel",
    title: "A great writeup on React Server Components",
    preview:
      "Read this a couple months ago, but just thought it worth sharing: great writeup on React Server Components",
  },
  {
    channel: "#where-in-the-world",
    title: "new cafe opened 5 minutes walk from home",
    preview: "new cafe opened 5 minutes walk from home",
  },
  {
    channel: "#engineering",
    title: "We shipped the new query engine",
    preview:
      "After 3 months of work, the new query engine is live. 10x faster on large event volumes.",
  },
];

const ARTICLES = [
  {
    category: "Blog",
    title: "Everything (and everyone) is build mode now",
    excerpt:
      "There's a future version of you who isn't boxed into one job function. Someone who has an idea in the morning and the means to ship it the same afternoon. Farfetched? Hardly. That version of you isn't waiting for 2030 \u2013 they exist today. They're in\u2026",
    featured: true,
  },
  {
    category: "Blog",
    title: "All social media metrics are bad",
    excerpt:
      "Picture this: your company's social media team excitedly informs you that stonks are up this month. You can see the screenshots. They're green. Holy smokes. We are killing it. Social media has been solved...",
    featured: false,
  },
  {
    category: "Blog",
    title: "I didn't understand the OS I built with AI until the MCP gave it analytics",
    excerpt:
      "For my birthday this year I got a Pimoroni Presto \u2014 a little developer gadget with a 240x240 touchscreen and not much else...",
    featured: false,
  },
  {
    category: "Tutorial",
    title: "How to set up feature flags in Next.js",
    excerpt:
      "A step-by-step guide to getting feature flags working in your Next.js application with PostHog...",
    featured: false,
  },
  {
    category: "Blog",
    title: "Why we stopped using UUIDs",
    excerpt:
      "UUIDs are great until they're not. Here's what we switched to and why it made everything faster...",
    featured: false,
  },
];

const QUESTIONS = [
  { topic: "Manual ticket creation", reply: "16 hours ago" },
  { topic: "Unable to export data", reply: "a day ago" },
  { topic: "Split ID", reply: "a day ago" },
  { topic: "Session replay not loading", reply: "2 days ago" },
];

const CHANGELOG_ITEMS = [
  {
    category: "Product analytics",
    text: "Search and filter the alerts list",
    dotColor: "bg-[#F76E18]",
  },
  { category: "Feature flags", text: "New UI for creating flags", dotColor: "bg-[#2563EB]" },
  { category: "Session replay", text: "Mobile network waterfall view", dotColor: "bg-[#22C55E]" },
];

const FEATURE_REQUESTS = [
  { name: "Product tours", votes: 695 },
  { name: "Customer support product", votes: 119 },
  { name: "PostHog CRM", votes: 110 },
];

const EVENTS = [
  { title: "Community Office Hours", date: "June 25, 2026", type: "Virtual" },
  { title: "PostHog Meetup: London", date: "July 8, 2026", type: "In-person" },
];

const SPOTLIGHT_MEMBER = {
  name: "Dana",
  role: "Technical Customer Success Manager",
  bio: "In a past life, Dana studied medicine. Now she helps teams get started with PostHog. In her downtime she's a founding member of PostHog's D&D club.",
};

/* ──────────────────────────── helpers ──────────────────────────── */

function getTodayDate(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
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
  const [email, setEmail] = useState("");

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
            <p className="text-sm text-[#6B6B6B]">{getTodayDate()}</p>
            <h1
              className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-center"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              The PostHog Gazette
            </h1>
            <div className="flex items-center gap-2 text-xs text-[#22C55E]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All systems operational
            </div>
          </div>
          {/* Tagline */}
          <p className="text-xs text-[#6B6B6B] text-center italic">
            PostHog&apos;s community newspaper. Stories, updates, and musings from the team.
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
                Welcome to Inside PostHog — our community newspaper. Explore our latest posts,
                community questions, and everything else that&apos;s happening in the world of
                PostHog.
              </p>
              <p className="text-xs text-[#9CA3AF] italic mt-2">— Andy, Editor-in-Chief</p>
            </div>

            {/* Hedgehog wisdom */}
            <div className="border-t border-[#E5E5E5] pt-4">
              <p className="text-sm text-[#1A1A1A] italic leading-relaxed">
                &ldquo;Why scurry through life when you can forage? Take time to sniff the
                mealworms. When things feel overwhelming, just curl into a ball.&rdquo;
              </p>
              <p className="text-xs text-[#9CA3AF] mt-2">— Max, our resident hedgehog</p>
            </div>

            {/* From the Slack */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#1A1A1A]">
                From the PostHog Slack
              </h3>
              <div className="space-y-3">
                {SLACK_THREADS.map((thread) => (
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
                  {SPOTLIGHT_MEMBER.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{SPOTLIGHT_MEMBER.name}</p>
                  <p className="text-xs text-[#6B6B6B]">{SPOTLIGHT_MEMBER.role}</p>
                </div>
              </div>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">{SPOTLIGHT_MEMBER.bio}</p>
              <button className="text-xs text-[#2563EB] mt-2 hover:underline inline-flex items-center gap-0.5">
                Learn more about {SPOTLIGHT_MEMBER.name} <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Upcoming events */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[#1A1A1A]">
                Upcoming events
              </h3>
              <div className="space-y-3">
                {EVENTS.map((event) => (
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
                  alt="PostHog hedgehog"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs text-[#9CA3AF] uppercase tracking-wider">
                {ARTICLES[0].category}
              </span>
              <h2 className="text-xl font-bold text-[#1A1A1A] leading-tight hover:text-[#2563EB] cursor-pointer mt-1">
                {ARTICLES[0].title}
              </h2>
              <p className="text-sm text-[#6B6B6B] leading-relaxed mt-2 line-clamp-3">
                {ARTICLES[0].excerpt}
              </p>
            </motion.article>

            {/* Secondary articles */}
            <div className="space-y-0">
              {ARTICLES.slice(1).map((article, i) => (
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
                <p className="text-lg font-bold text-[#1A1A1A]">12k+</p>
                <p className="text-[10px] text-[#6B6B6B]">Slack members</p>
              </div>
              <div className="w-px h-8 bg-[#D1D1D1]" />
              <div className="text-center">
                <p className="text-lg font-bold text-[#1A1A1A]">2.4M</p>
                <p className="text-[10px] text-[#6B6B6B]">Messages sent</p>
              </div>
              <div className="w-px h-8 bg-[#D1D1D1]" />
              <div className="text-center">
                <p className="text-lg font-bold text-[#1A1A1A]">500+</p>
                <p className="text-[10px] text-[#6B6B6B]">Countries</p>
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
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Subscribe to our newsletter</h3>
              <p className="text-xs text-[#F76E18] font-medium mt-0.5">Product for Engineers</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Read by 100,000+ founders and builders
              </p>
              <div className="mt-3 space-y-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border-[#D1D1D1] rounded px-3 py-2 text-sm h-auto"
                />
                <Button className="w-full bg-[#1A1A1A] text-white text-sm font-medium rounded px-3 py-2 hover:bg-[#333] h-auto">
                  Subscribe
                </Button>
              </div>
            </div>

            {/* Join Slack */}
            <div className="border border-[#D1D1D1] p-4 bg-[#FAFAF8] rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5 text-[#F76E18]" />
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Join our Slack</h3>
              </div>
              <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
                Get help, share ideas, and hang out with 12,000+ product engineers.
              </p>
              <button className="w-full text-center text-xs text-white bg-[#F76E18] hover:bg-[#E56310] font-medium px-3 py-2 rounded transition-colors">
                Join Slack community
              </button>
            </div>

            {/* Latest questions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Latest questions</h3>
                <button className="text-xs text-[#2563EB] hover:underline">
                  View all <ArrowRight className="w-3 h-3 inline" />
                </button>
              </div>
              <div>
                {QUESTIONS.map((q) => (
                  <div key={q.topic} className="py-2 border-b border-[#F0EDE6] last:border-0">
                    <p className="text-sm text-[#1A1A1A] hover:text-[#2563EB] cursor-pointer">
                      {q.topic}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">Last reply {q.reply}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Changelog teaser */}
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Latest changelog</h3>
              <p className="text-xs text-[#6B6B6B] mb-3">
                Here&apos;s what we&apos;ve shipped in the last two weeks.
              </p>
              <div className="space-y-2">
                {CHANGELOG_ITEMS.map((item) => (
                  <div key={item.text} className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${item.dotColor}`} />
                    <div>
                      <span className="text-[10px] text-[#9CA3AF]">{item.category}:</span>
                      <p className="text-xs text-[#1A1A1A]">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="text-xs text-[#2563EB] mt-2 hover:underline">
                View full changelog <ArrowRight className="w-3 h-3 inline" />
              </button>
            </div>

            {/* Feature requests */}
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Latest feature requests</h3>
              <div>
                {FEATURE_REQUESTS.map((req) => (
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
              <button className="text-xs text-[#2563EB] mt-2 hover:underline">
                Vote on the roadmap <ArrowRight className="w-3 h-3 inline" />
              </button>
            </div>

            {/* CEO musings */}
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Musings from the CEO</h3>
              <p className="text-sm text-[#1A1A1A] leading-relaxed italic">
                &ldquo;nobody will remember: your salary, how &apos;busy you were&apos;, how many
                hours you worked. people will remember: if you hopped on a quick call, when you
                hopped on a quick call, how many quick calls you hopped on, how you made them feel
                when you hopped on a quick call&rdquo;
              </p>
              <button className="text-xs text-[#2563EB] mt-2 hover:underline inline-flex items-center gap-0.5">
                Follow James on X <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </motion.aside>
        </div>
      </div>
    </ScrollArea>
  );
}
