import { motion } from "framer-motion";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import type { CommunityArticle, CommunityStats } from "./community-types";

const columnVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export function CommunityArticles() {
  const { t, array, object } = useMarketingTranslation();
  const articles = array<CommunityArticle>("community.articles.items");
  const stats = object<CommunityStats>("community.stats");

  const [featured, ...rest] = articles;

  return (
    <motion.section
      variants={columnVariants}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className="lg:w-[50%]"
    >
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 pb-6 border-b border-[#E5E5E5]"
      >
        <div className="w-full aspect-[16/10] bg-[#F5F3EF] rounded-lg overflow-hidden mb-4 flex items-center justify-center">
          <img
            src="/hedgehog-hero.webp"
            alt={t("community.header.title")}
            width={1024}
            height={1024}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-xs text-[#9CA3AF] uppercase tracking-wider">
          {featured?.category}
        </span>
        <h2 className="text-xl font-bold text-[#1A1A1A] leading-tight hover:text-[#2563EB] cursor-pointer mt-1">
          {featured?.title}
        </h2>
        <p className="text-sm text-[#6B6B6B] leading-relaxed mt-2 line-clamp-3">
          {featured?.excerpt}
        </p>
      </motion.article>

      <div className="space-y-0">
        {rest.map((article, i) => (
          <motion.article
            key={article.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (i + 1) * 0.08 }}
            className="flex gap-4 mb-6 pb-6 border-b border-[#F0EDE6] last:border-0"
          >
            <div className="w-20 h-[60px] bg-[#F5F3EF] rounded shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src="/product-os-hero.webp"
                alt=""
                width={1024}
                height={1024}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
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
  );
}
