import { BarChart3 } from "lucide-react";
import { productIconMap } from "./constants";

interface ProductIconProps {
  name: string;
}

export function ProductIcon({ name }: ProductIconProps) {
  const config = productIconMap[name] || {
    icon: <BarChart3 className="w-4 h-4" />,
    bg: "bg-[#F3F4F6]",
    color: "text-[#374151]",
  };

  return (
    <div
      className={`w-8 h-8 rounded-lg ${config.bg} ${config.color} flex items-center justify-center shrink-0`}
    >
      {config.icon}
    </div>
  );
}
