import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { DocCategory, DocItem } from "@/features/marketing/data/docs";
import { allDocCategories } from "@/features/marketing/data/docs";

/* ------------------------------------------------------------------ */
/*  Doc Card Component                                                  */
/* ------------------------------------------------------------------ */
function DocCard({ item }: { item: DocItem }) {
  const Icon = item.icon;
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.01 }}
      className="flex flex-col items-center justify-center gap-2 border border-[#E5E5E5] rounded-md bg-white p-4 cursor-pointer hover:bg-[#FAFAF8] hover:border-[#D1D1D1] hover:shadow-sm transition-all duration-150 text-center min-h-[100px]"
    >
      <div className="w-10 h-10 rounded-full bg-[#F5F3EF] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#6B6B6B]" />
      </div>
      <span className="text-sm font-medium text-[#1A1A1A] leading-tight">{item.label}</span>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Accordion Section Component                                         */
/* ------------------------------------------------------------------ */
function DocSection({
  category,
  defaultOpen = false,
}: {
  category: DocCategory;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      {/* Section Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-3 cursor-pointer text-sm font-semibold text-[#1A1A1A] hover:text-[#2563EB] transition-colors w-full"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
        )}
        <span>{category.name}</span>
      </button>

      {/* Card Grid */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.04,
                  },
                },
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
            >
              {category.items.map((item) => (
                <motion.div
                  key={item.label}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <DocCard item={item} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Right Sidebar Component                                             */
/* ------------------------------------------------------------------ */
function DocsSidebar() {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="w-[260px] shrink-0"
    >
      <div className="border border-[#E5E5E5] rounded-lg bg-white p-5">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">About our docs</h3>

        <div className="space-y-3">
          <div className="flex gap-2.5">
            <ExternalLink className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-[#1A1A1A]">On our website</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                You can search docs using the search bar above, or browse by category.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <BookOpen className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-[#1A1A1A]">In the product</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Look for the help icon (?) in the app to access contextual documentation.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Sparkles className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-[#1A1A1A]">Ask PostHog AI</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Our AI assistant can answer questions about any of our docs.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Users className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-[#1A1A1A]">Community forums</p>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Join our community to ask questions and share knowledge.
              </p>
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="mt-6 pt-4 border-t border-[#E5E5E5]">
          <p className="text-xs text-[#9CA3AF]">Our docs are a perpetual work in progress.</p>
          <p className="text-xs text-[#9CA3AF] mt-1.5">
            The Docs &amp; Wizard Team is responsible for what you see here.
          </p>
          <p className="text-xs text-[#9CA3AF] mt-1.5">
            Found an issue?{" "}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-[#2563EB] hover:underline"
            >
              Let us know!
            </a>
          </p>
        </div>
      </div>
    </motion.aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Docs Page                                                      */
/* ------------------------------------------------------------------ */
export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="w-full">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative w-full h-[200px] flex items-center justify-center overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(45deg, #B8321A, #B8321A 12px, #C93A1E 12px, #C93A1E 24px)",
        }}
      >
        {/* Isometric office illustration placeholder */}
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          src="/hedgehog-garden.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Title */}
        <h1
          className="relative z-10 text-4xl font-bold text-white drop-shadow-lg"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
        >
          Documentation
        </h1>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="px-6 py-5"
      >
        <div className="relative max-w-[720px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search the docs..."
            className="w-full bg-white border border-[#D1D1D1] rounded-lg px-4 py-3 pl-11 pr-24 text-base text-[#1A1A1A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#F5F3EF] hover:bg-[#EBE8E2] text-sm font-medium text-[#1A1A1A] px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1.5"
          >
            Ask AI <Sparkles className="w-3.5 h-3.5 text-[#F76E18]" />
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="px-6 pb-8 flex gap-6">
        {/* Category Sections */}
        <div className="flex-1 min-w-0">
          {allDocCategories.map((category, i) => (
            <DocSection key={category.name} category={category} defaultOpen={i === 0} />
          ))}
        </div>

        {/* Right Sidebar (hidden on narrow windows) */}
        <div className="hidden lg:block">
          <DocsSidebar />
        </div>
      </div>
    </div>
  );
}
