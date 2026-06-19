import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Lock,
  Music,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ──────────────────────────── types ──────────────────────────── */

interface TrashItem {
  id: string;
  filename: string;
  type: "markdown" | "image" | "spreadsheet" | "audio" | "pdf" | "json" | "csv" | "txt";
  size: string;
  dateDeleted: string;
  description: string;
  content: string;
  redacted?: boolean;
  redactedReason?: string;
}

/* ──────────────────────────── data ──────────────────────────── */

function makeContent(lines: string[]): string {
  return lines.join("\n");
}

const TRASH_ITEMS: TrashItem[] = [
  {
    id: "1",
    filename: "bad-logo-1.svg",
    type: "image",
    size: "12 KB",
    dateDeleted: "2022-07-01",
    description: "Our first logo attempt. It was... a choice.",
    content: makeContent([
      '[SVG IMAGE: A hedgehog drawn in MS Paint with approximately 47 poorly-aligned circles for "spines". The color palette appears to be "all of them". When shown to focus groups, 100% of participants asked "is that a potato?"]',
      "",
      "We keep this as a reminder that design is hard, and also that we should never let James near vector graphics software.",
    ]),
  },
  {
    id: "2",
    filename: "bad-logo-2.svg",
    type: "image",
    size: "24 KB",
    dateDeleted: "2022-07-15",
    description: "The sequel. Somehow worse.",
    content: makeContent([
      '[SVG IMAGE: An abstract "minimalist" hedgehog that looks suspiciously like a hairbrush. One intern said it looked "corporate." James took that as a compliment. It was not meant as one.]',
      "",
      'The lesson: when someone says your logo looks "corporate," they mean it looks like a mid-2000s enterprise software company that sells printer toner.',
    ]),
  },
  {
    id: "3",
    filename: "honest-job-description.md",
    type: "markdown",
    size: "4 KB",
    dateDeleted: "2023-06-14",
    description: "What our job descriptions would say if we were honest",
    content: makeContent([
      "# Honest Job Descriptions",
      "",
      "## Senior Frontend Engineer",
      "You'll fix CSS bugs introduced by people who don't test their changes. You'll attend meetings that could have been emails. You'll explain to the CEO why we can't \"just add AI\" to everything. You'll become emotionally attached to a linter config.",
      "",
      "## Product Designer",
      "You'll make beautiful mockups that engineers will implement with... varying degrees of fidelity. You'll say \"this doesn't match the design\" at least 4 times per sprint. You'll learn that \"pixel perfect\" is a state of mind, not a reality.",
      "",
      "## DevRel",
      "You'll write blog posts at 2 AM. You'll answer the same question in Slack 47 times with the same enthusiasm each time. You'll become weirdly good at making GIFs. You'll explain what PostHog is to your family and they'll still say you \"work in computers.\"",
      "",
      "[HR said we couldn't publish this. Cowards.]",
    ]),
  },
  {
    id: "4",
    filename: "vc-pitch-deck.pdf",
    type: "pdf",
    size: "2.1 MB",
    dateDeleted: "2022-09-10",
    description: "Our actual pitch deck. We can't believe they invested.",
    content: makeContent([
      "[PDF: 12 slides]",
      "",
      'Slide 1: "PostHog" — with that bad logo #1',
      'Slide 2: "Product analytics, but open source"',
      "Slide 3: [REDACTED — too embarrassing]",
      "Slide 4: TAM slide with a completely made-up number",
      'Slide 5: "Competition: everyone, but we are better"',
      'Slide 6: "Team: two guys who met at YC"',
      "Slide 7: Financial projections that were off by 400%",
      'Slide 8: "The ask: money please"',
      'Slide 9: "Thank you" slide (comic sans)',
      "Slide 10-12: Appendix of hedgehog memes",
      "",
      'Somehow this worked. We raised $12M off this deck. The VC later admitted they invested because "the name was memorable." We choose to believe it was our compelling vision.',
    ]),
  },
  {
    id: "5",
    filename: "tim-cook-email.md",
    type: "markdown",
    size: "2 KB",
    dateDeleted: "2023-01-20",
    description: "That time we emailed Tim Cook",
    content: makeContent([
      "# Email to Tim Cook",
      "",
      "**From:** james@posthog.com",
      "**To:** tim@apple.com",
      '**Subject:** "We should talk"',
      "",
      "Hi Tim,",
      "",
      "Love the work you are doing with the iPhone. Big fan. We make product analytics software. Have you considered adding better analytics to Xcode? Also, would love to put PostHog on the App Store. Can you expedite the review?",
      "",
      "Also — any chance you could mention us in the keynote? Even a small shoutout would be great.",
      "",
      "Best,",
      "James",
      "",
      "---",
      "",
      "**Reply from:** donotreply@apple.com",
      "**Subject:** Re: Auto-reply: Out of office",
      "",
      "[No response received. We waited 847 days before giving up.]",
    ]),
  },
  {
    id: "6",
    filename: "failed-experiments.csv",
    type: "csv",
    size: "8 KB",
    dateDeleted: "2023-08-22",
    description: "All the experiments that went nowhere",
    content: makeContent([
      "experiment_name,result,notes",
      '"Auto-generating release notes from commit messages","FAILED","Every release note was just \'fix stuff\' 47 times"',
      '"AI-powered support bot","FAILED","It told a customer to \'try turning it off and on again\' for a billing question"',
      '"Hedgehog-themed error pages","PARTIAL SUCCESS","Users loved them but they increased panic by 30%"',
      '"Predictive churn analysis","FAILED","Predicted 100% churn for our own team after looking at our bug backlog"',
      '"Voice-activated dashboards","FAILED","The mic kept picking up office dog barks as commands"',
      '"QR codes on all error messages","FAILED","No one has ever scanned a QR code in their life, apparently"',
    ]),
  },
  {
    id: "7",
    filename: "rejected-taglines.txt",
    type: "txt",
    size: "1 KB",
    dateDeleted: "2023-03-15",
    description: "Taglines that didn't make the cut",
    content: makeContent([
      "PostHog: We are not a cult",
      "PostHog: Like Google Analytics but you own your data",
      "PostHog: The everything app (trademark issues)",
      "PostHog: So easy even your PM can use it",
      "PostHog: Hedgehogs > Unicorns",
      "PostHog: Now with 47% fewer bugs",
      "PostHog: The DevTool-iest DevTool that ever DevTooled",
      "PostHog: Your data pipeline's spirit animal",
      "PostHog: We read your commits so you don't have to",
      "PostHog: Making product engineers cry (tears of joy, mostly)",
    ]),
  },
  {
    id: "8",
    filename: "hr-incidents.pdf",
    type: "pdf",
    size: "[REDACTED]",
    dateDeleted: "[REDACTED]",
    description: "[REDACTED]",
    content: "[REDACTED]",
    redacted: true,
    redactedReason:
      "This file has been redacted per Legal's request. If you are reading this, please stop. We mean it.",
  },
  {
    id: "9",
    filename: "ceo-browser-history.csv",
    type: "csv",
    size: "[REDACTED]",
    dateDeleted: "[REDACTED]",
    description: "[REDACTED FOR LEGAL REASONS]",
    content: "[REDACTED FOR LEGAL REASONS]",
    redacted: true,
    redactedReason:
      "Seriously? You thought we would keep this? The CEO's browser history is stored on a separate server, in a bunker, guarded by a very judgmental sysadmin.",
  },
  {
    id: "10",
    filename: "human-readable-tos.md",
    type: "markdown",
    size: "2 KB",
    dateDeleted: "2023-05-17",
    description: "Our terms of service, translated to human English",
    content: makeContent([
      "# Terms of Service (Human Version)",
      "",
      "1. Don't be evil.",
      "2. We won't sell your data. We are not Facebook.",
      "3. If you break something, tell us. We don't judge (much).",
      "4. We reserve the right to make dad jokes in the UI.",
      "5. Free tier means free. No credit card trickery.",
      "6. If you hit the free tier limits, either upgrade or get really good at data compression.",
      "7. You own your data. We just hold it for you, like a very secure, very digital piggy bank.",
      "8. No hedgehogs were harmed in the making of this software.",
      "",
      'Legal team said this "isn\'t legally binding." We disagree. A pinky promise is legally binding in our hearts.',
    ]),
  },
  {
    id: "11",
    filename: "cofounder-dms.json",
    type: "json",
    size: "6 KB",
    dateDeleted: "2024-01-10",
    description: "The DMs that started a company",
    content: makeContent([
      "{",
      '  "messages": [',
      "    {",
      '      "from": "james",',
      '      "to": "tim",',
      '      "timestamp": "2019-11-03T02:14:00Z",',
      '      "text": "yo what if we made analytics but like... not terrible?"',
      "    },",
      "    {",
      '      "from": "tim",',
      '      "to": "james",',
      '      "timestamp": "2019-11-03T02:15:00Z",',
      '      "text": "i\'m listening"',
      "    },",
      "    {",
      '      "from": "james",',
      '      "to": "tim",',
      '      "timestamp": "2019-11-03T02:16:00Z",',
      '      "text": "open source. developer-first. no sales team. just vibes."',
      "    },",
      "    {",
      '      "from": "tim",',
      '      "to": "james",',
      '      "timestamp": "2019-11-03T02:17:00Z",',
      '      "text": "that\'s the worst idea i\'ve heard all week. let\'s do it."',
      "    },",
      "    {",
      '      "from": "james",',
      '      "to": "tim",',
      '      "timestamp": "2019-11-03T02:18:00Z",',
      '      "text": "yc application due in 3 days. think we can build a demo?"',
      "    },",
      "    {",
      '      "from": "tim",',
      '      "to": "james",',
      '      "timestamp": "2019-11-03T02:19:00Z",',
      '      "text": "sleep is for the weak"',
      "    }",
      "  ],",
      '  "result": "$27,000,000,000 idea conceived at 2am"',
      "}",
    ]),
  },
  {
    id: "12",
    filename: "why-we-use-posthog.md",
    type: "markdown",
    size: "3 KB",
    dateDeleted: "2023-10-31",
    description: "Meta, but make it self-aware",
    content: makeContent([
      "# Why We Use PostHog (At PostHog)",
      "",
      "We use PostHog to track how people use PostHog so we can make PostHog better. This is not a tongue twister; it is our actual job.",
      "",
      "## How meta is it?",
      "",
      "- We use PostHog analytics to analyze PostHog usage",
      "- We use PostHog session replay to watch people use PostHog session replay",
      "- We use PostHog feature flags to roll out new PostHog features",
      "- We use PostHog experiments to test which PostHog experiments work best",
      "",
      "## Metrics we track:",
      "",
      "1. How many people track metrics",
      "2. The conversion rate of our conversion rate tracking",
      "3. Whether our session replay replays sessions correctly",
      "4. If our feature flag for feature flags is flagged correctly",
      "",
      "*This document was deleted because it caused an infinite recursion in our analytics pipeline.*",
    ]),
  },
];

/* ──────────────────────────── helpers ──────────────────────────── */

function getFileIcon(type: TrashItem["type"]) {
  switch (type) {
    case "image":
      return <ImageIcon className="w-8 h-8 text-[#2563EB]" />;
    case "spreadsheet":
    case "csv":
      return <FileSpreadsheet className="w-8 h-8 text-[#22C55E]" />;
    case "audio":
      return <Music className="w-8 h-8 text-[#F76E18]" />;
    case "pdf":
      return <FileText className="w-8 h-8 text-[#DC2626]" />;
    default:
      return <FileText className="w-8 h-8 text-[#6B6B6B]" />;
  }
}

function getFileTypeLabel(type: TrashItem["type"]) {
  switch (type) {
    case "markdown":
      return "Markdown";
    case "image":
      return "Image";
    case "spreadsheet":
      return "Spreadsheet";
    case "audio":
      return "Audio";
    case "pdf":
      return "PDF";
    case "json":
      return "JSON";
    case "csv":
      return "CSV";
    case "txt":
      return "Text";
    default:
      return type;
  }
}

/* ──────────────────────────── page ──────────────────────────── */

export default function TrashPage() {
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between px-6 py-4 bg-[#F5F3EF] border-b border-[#E5E5E5] shrink-0"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-[#6B6B6B]" />
          <span className="text-sm font-semibold text-[#1A1A1A]">Trash</span>
        </div>
        <span className="text-xs text-[#6B6B6B]">Deleted items</span>
        <Badge
          variant="secondary"
          className="bg-[#E5E5E5] text-[#6B6B6B] text-xs px-2 py-0.5 rounded-full font-normal"
        >
          {TRASH_ITEMS.length} items
        </Badge>
      </motion.div>

      {/* Subtitle */}
      <div className="px-6 py-3 border-b border-[#E5E5E5] shrink-0">
        <p className="text-xs text-[#6B6B6B]">
          Things we have deleted from the site but could not bear to destroy
        </p>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {TRASH_ITEMS.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedItem(item)}
                className="flex flex-col items-center p-4 border border-[#E5E5E5] rounded-md bg-white hover:shadow-sm hover:bg-[#FAFAF8] hover:border-[#D1D1D1] transition-all text-left cursor-pointer"
              >
                {item.redacted ? (
                  <Lock className="w-8 h-8 text-[#9CA3AF]" />
                ) : (
                  getFileIcon(item.type)
                )}
                <p className="text-xs font-medium text-center mt-3 break-words w-full line-clamp-2">
                  {item.filename}
                </p>
                <p className="text-[10px] text-[#9CA3AF] text-center mt-1">
                  {item.redacted ? "[REDACTED]" : getFileTypeLabel(item.type)}
                </p>
                <div className="flex justify-between w-full mt-2 text-[10px] text-[#9CA3AF]">
                  <span>{item.size}</span>
                  <span>{item.dateDeleted}</span>
                </div>
                {!item.redacted && (
                  <p className="text-[10px] text-[#6B6B6B] text-center mt-2 line-clamp-2 leading-tight">
                    {item.description}
                  </p>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Detail Modal */}
      <Dialog open={selectedItem !== null} onOpenChange={() => setSelectedItem(null)}>
        <AnimatePresence>
          {selectedItem && (
            <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  {selectedItem.redacted ? (
                    <Lock className="w-4 h-4 text-[#9CA3AF]" />
                  ) : (
                    getFileIcon(selectedItem.type)
                  )}
                  <span className="truncate">{selectedItem.filename}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedItem.redacted ? selectedItem.redactedReason : selectedItem.description}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto my-4">
                {selectedItem.redacted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-[#F76E18] mb-3" />
                    <p className="text-sm font-medium text-[#1A1A1A]">Nice try!</p>
                    <p className="text-xs text-[#6B6B6B] mt-1">{selectedItem.redactedReason}</p>
                  </div>
                ) : (
                  <div className="bg-[#F5F3EF] rounded-md p-4">
                    <pre className="text-xs text-[#1A1A1A] whitespace-pre-wrap leading-relaxed font-mono">
                      {selectedItem.content}
                    </pre>
                  </div>
                )}
              </div>

              <div className="shrink-0 pt-3 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="text-[10px] text-[#9CA3AF]">
                  {selectedItem.type.toUpperCase()} &bull; {selectedItem.size} &bull; Deleted{" "}
                  {selectedItem.dateDeleted}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  disabled
                  className="text-xs text-[#9CA3AF] bg-[#F0EDE6] px-3 py-1.5 rounded cursor-not-allowed opacity-60"
                  title="You can't restore from trash. That's not how trash works."
                >
                  Restore
                </button>
              </div>
            </DialogContent>
          )}
        </AnimatePresence>
      </Dialog>
    </div>
  );
}
