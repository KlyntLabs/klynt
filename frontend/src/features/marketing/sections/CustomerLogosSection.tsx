import { Shuffle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { engineerCustomers, vcCustomers } from "@/features/marketing/data/homeData";

interface CustomerLogosSectionProps {
  onOpenApp: (route: string, title?: string) => void;
}

function shuffleArray<T>(prev: T[]): T[] {
  const arr = [...prev];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function CustomerLogosSection({ onOpenApp }: CustomerLogosSectionProps) {
  const { t } = useTranslation("marketing");
  const [shuffledVC, setShuffledVC] = useState(vcCustomers);
  const [shuffledEng, setShuffledEng] = useState(engineerCustomers);

  const handleShuffle = useCallback(() => {
    setShuffledVC((prev) => shuffleArray(prev));
    setShuffledEng((prev) => shuffleArray(prev));
  }, []);

  return (
    <section className="mb-8 pt-6 border-t border-[#E5E5E5]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">{t("home.customers.title")}</h2>
          <p className="text-sm text-[#6B6B6B] mt-1">{t("home.customers.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={handleShuffle}
          className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors shrink-0"
        >
          <Shuffle className="w-4 h-4" />
          {t("home.customers.shuffle")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
            {t("home.customers.vcLabel")}
          </p>
          <div className="flex flex-wrap gap-3">
            {shuffledVC.map((c) => (
              <div
                key={c.id}
                className="h-8 px-3 flex items-center bg-[#F5F3EF] rounded-md text-sm font-medium text-[#6B6B6B] grayscale hover:grayscale-0 transition-all duration-200 cursor-pointer"
              >
                {c.logo}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
            {t("home.customers.engineerLabel")}
          </p>
          <div className="flex flex-wrap gap-3">
            {shuffledEng.map((c) => (
              <div
                key={c.id}
                className="h-8 px-3 flex items-center bg-[#F5F3EF] rounded-md text-sm font-medium text-[#6B6B6B] grayscale hover:grayscale-0 transition-all duration-200 cursor-pointer"
              >
                {c.logo}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpenApp("/customers", t("home.customers.openCustomers"))}
        className="text-sm text-[#2563EB] hover:underline mt-4 inline-block"
      >
        {t("home.customers.openCustomers")}
      </button>
    </section>
  );
}
