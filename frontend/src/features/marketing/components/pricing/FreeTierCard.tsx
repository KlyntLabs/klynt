import type { FreeTierItem } from "@/features/marketing/lib/pricing-types";

interface FreeTierCardProps {
  item: FreeTierItem;
}

export function FreeTierCard({ item }: FreeTierCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F5F3EF]">
      <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-[#6B6B6B] shrink-0">
        {item.icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#1A1A1A]">{item.product}</div>
        <div
          className={`text-xs font-medium ${item.included ? "text-[#22C55E]" : "text-[#22C55E]"}`}
        >
          {item.allowance}
        </div>
      </div>
    </div>
  );
}
