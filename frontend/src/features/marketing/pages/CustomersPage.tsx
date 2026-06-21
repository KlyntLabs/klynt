import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CustomerRow, Product } from "@/features/marketing/data/customers";
import { allProducts, customerRows } from "@/features/marketing/data/customers";

/* ------------------------------------------------------------------ */
/*  Filter option types                                                */
/* ------------------------------------------------------------------ */
type ProductFilter = "Any" | Product;
type CaseStudyFilter = "Any" | "Has link" | "No link";
type FeaturedFilter = "Any" | "TRUE" | "FALSE";

/* ------------------------------------------------------------------ */
/*  Company logo placeholder (colored square with initials)            */
/* ------------------------------------------------------------------ */
function CompanyLogo({ customer }: { customer: CustomerRow }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ backgroundColor: customer.logoColor }}
      >
        {customer.logoInitials}
      </div>
      <span className="text-sm font-medium text-[#1A1A1A]">{customer.company}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product tag pills                                                  */
/* ------------------------------------------------------------------ */
function ProductTags({ products, tk }: { products: Product[]; tk: (key: string) => string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {products.map((p) => (
        <span
          key={p}
          className="inline-block bg-[#F5F3EF] text-[10px] text-[#6B6B6B] px-1.5 py-0.5 rounded"
        >
          {tk(`data.products.${p}`)}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Case study link                                                    */
/* ------------------------------------------------------------------ */
function CaseStudyLink({ hasLink, tk }: { hasLink: boolean; tk: (key: string) => string }) {
  if (!hasLink) {
    return <span className="text-sm text-[#9CA3AF]">&ndash;</span>;
  }
  return (
    <button
      type="button"
      aria-label={tk("customers.table.link")}
      className="inline-flex items-center gap-1 text-sm text-[#2563EB] hover:underline"
    >
      {tk("customers.table.link")} <ExternalLink className="w-3 h-3" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Dropdown component (shared)                                        */
/* ------------------------------------------------------------------ */
interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

function Dropdown({ value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 bg-white border border-[#D1D1D1] rounded px-2 py-1 text-sm font-medium text-[#1A1A1A] cursor-pointer hover:border-[#9CA3AF] transition-colors"
      >
        {selected?.label ?? value}
        <ChevronDown className="w-3 h-3 text-[#6B6B6B]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-10 mt-1 bg-white border border-[#D1D1D1] rounded-md shadow-lg py-1 min-w-[140px]"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-[#F5F3EF] transition-colors ${
                  opt.value === value ? "font-medium text-[#1A1A1A]" : "text-[#6B6B6B]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Customers Page                                                */
/* ------------------------------------------------------------------ */
export default function CustomersPage() {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);
  const [productFilter, setProductFilter] = useState<ProductFilter>("Any");
  const [caseStudyFilter, setCaseStudyFilter] = useState<CaseStudyFilter>("Any");
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>("Any");

  /* Featured set (match design.md: first 10 are featured) */
  const featuredIds = useMemo(() => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), []);

  const filteredRows = useMemo(() => {
    return customerRows.filter((row) => {
      /* Product filter */
      if (productFilter !== "Any" && !row.products.includes(productFilter)) {
        return false;
      }
      /* Case study filter */
      if (caseStudyFilter === "Has link" && !row.caseStudy) return false;
      if (caseStudyFilter === "No link" && row.caseStudy) return false;
      /* Featured filter */
      if (featuredFilter === "TRUE" && !featuredIds.has(row.id)) return false;
      if (featuredFilter === "FALSE" && featuredIds.has(row.id)) return false;
      return true;
    });
  }, [productFilter, caseStudyFilter, featuredFilter, featuredIds]);

  /* Sort rows by id */
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => a.id - b.id);
  }, [filteredRows]);

  const productOptions: DropdownOption[] = [
    { value: "Any", label: t("customers.filters.any") },
    ...allProducts.map((p) => ({ value: p, label: tk(`data.products.${p}`) })),
  ];
  const caseStudyOptions: DropdownOption[] = [
    { value: "Any", label: t("customers.filters.any") },
    { value: "Has link", label: t("customers.filters.hasLink") },
    { value: "No link", label: t("customers.filters.noLink") },
  ];
  const featuredOptions: DropdownOption[] = [
    { value: "Any", label: t("customers.filters.any") },
    { value: "TRUE", label: t("customers.filters.true") },
    { value: "FALSE", label: t("customers.filters.false") },
  ];

  return (
    <div className="w-full">
      {/* Filter Bar */}
      <div className="sticky top-0 z-[1] bg-white border-b border-[#E5E5E5] px-6 py-3">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-2 text-sm">
          <span className="text-[#6B6B6B]">{t("customers.filters.where")}</span>
          <span className="text-[#6B6B6B]">{t("customers.filters.productUsed")}</span>
          <span className="text-[#6B6B6B]">{t("customers.filters.includes")}</span>
          <Dropdown
            value={productFilter}
            options={productOptions}
            onChange={(v) => setProductFilter(v as ProductFilter)}
          />
          <span className="text-[#6B6B6B]">{t("customers.filters.and")}</span>
          <span className="text-[#6B6B6B]">{t("customers.filters.caseStudy")}</span>
          <span className="text-[#6B6B6B]">{t("customers.filters.equals")}</span>
          <Dropdown
            value={caseStudyFilter}
            options={caseStudyOptions}
            onChange={(v) => setCaseStudyFilter(v as CaseStudyFilter)}
          />
          <span className="text-[#6B6B6B]">{t("customers.filters.and")}</span>
          <span className="text-[#6B6B6B]">{t("customers.filters.featured")}</span>
          <span className="text-[#6B6B6B]">{t("customers.filters.equals")}</span>
          <Dropdown
            value={featuredFilter}
            options={featuredOptions}
            onChange={(v) => setFeaturedFilter(v as FeaturedFilter)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F5F3EF] border-b-2 border-[#E5E5E5]">
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-center w-[40px]">
                {t("customers.table.number")}
              </th>
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-left min-w-[180px]">
                {t("customers.table.company")}
              </th>
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-left min-w-[200px]">
                {t("customers.table.products")}
              </th>
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-left w-[100px]">
                {t("customers.table.caseStudy")}
              </th>
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-left min-w-[150px]">
                {t("customers.table.notes")}
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {sortedRows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="border-b border-[#F0EDE6] hover:bg-[#FAFAF8] transition-colors"
                >
                  <td className="text-sm text-[#9CA3AF] text-center px-6 py-3.5">{row.id}</td>
                  <td className="px-6 py-3.5">
                    <CompanyLogo customer={row} />
                  </td>
                  <td className="px-6 py-3.5">
                    <ProductTags products={row.products} tk={tk} />
                  </td>
                  <td className="px-6 py-3.5">
                    <CaseStudyLink hasLink={row.caseStudy} tk={tk} />
                  </td>
                  <td className="text-sm text-[#6B6B6B] px-6 py-3.5">{tk(row.notesKey)}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {sortedRows.length === 0 && (
        <div className="flex items-center justify-center py-16 text-[#9CA3AF] text-sm">
          {t("customers.table.empty")}
        </div>
      )}
    </div>
  );
}
