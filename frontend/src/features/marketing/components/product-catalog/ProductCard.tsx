import type { ProductItem } from "@/features/marketing/data/products";
import { ProductIcon } from "./ProductIcon";

interface ProductCardProps {
  product: ProductItem;
  tk: (key: string) => string;
}

export function ProductCard({ product, tk }: ProductCardProps) {
  return (
    <a
      href={product.route}
      className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-[#E5E5E5] hover:bg-[#FAFAF8] transition-all cursor-pointer group"
    >
      <ProductIcon name={product.icon} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#1A1A1A] group-hover:text-[#2563EB] transition-colors">
          {tk(product.labelKey)}
        </div>
        {product.descriptionKey && (
          <div className="text-xs text-[#9CA3AF] truncate">{tk(product.descriptionKey)}</div>
        )}
      </div>
    </a>
  );
}
