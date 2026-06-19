import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomerRow } from "@/features/marketing/data/customers";
import { allProducts, customerRows } from "@/features/marketing/data/customers";

/* ------------------------------------------------------------------ */
/*  Filter option types                                                */
/* ------------------------------------------------------------------ */
type ProductFilter = "Any" | string;
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
function ProductTags({ products }: { products: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {products.map((p) => (
        <span
          key={p}
          className="inline-block bg-[#F5F3EF] text-[10px] text-[#6B6B6B] px-1.5 py-0.5 rounded"
        >
          {p}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Case study link                                                    */
/* ------------------------------------------------------------------ */
function CaseStudyLink({ hasLink }: { hasLink: boolean }) {
  if (!hasLink) {
    return <span className="text-sm text-[#9CA3AF]">&ndash;</span>;
  }
  return (
    <a
      href="#"
      aria-label="Open case study"
      onClick={(e) => e.preventDefault()}
      className="inline-flex items-center gap-1 text-sm text-[#2563EB] hover:underline"
    >
      Link <ExternalLink className="w-3 h-3" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Dropdown component (shared)                                        */
/* ------------------------------------------------------------------ */
interface DropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function Dropdown({ value, options, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        {value}
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
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-[#F5F3EF] transition-colors ${
                  opt === value ? "font-medium text-[#1A1A1A]" : "text-[#6B6B6B]"
                }`}
              >
                {opt}
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

  const productOptions = ["Any", ...allProducts];
  const caseStudyOptions: CaseStudyFilter[] = ["Any", "Has link", "No link"];
  const featuredOptions: FeaturedFilter[] = ["Any", "TRUE", "FALSE"];

  return (
    <div className="w-full">
      {/* Filter Bar */}
      <div className="sticky top-0 z-[1] bg-white border-b border-[#E5E5E5] px-6 py-3">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-2 text-sm">
          <span className="text-[#6B6B6B]">where</span>
          <span className="text-[#6B6B6B]">product(s) used</span>
          <span className="text-[#6B6B6B]">includes</span>
          <Dropdown value={productFilter} options={productOptions} onChange={setProductFilter} />
          <span className="text-[#6B6B6B]">and</span>
          <span className="text-[#6B6B6B]">case study</span>
          <span className="text-[#6B6B6B]">equals</span>
          <Dropdown
            value={caseStudyFilter}
            options={caseStudyOptions}
            onChange={(v) => setCaseStudyFilter(v as CaseStudyFilter)}
          />
          <span className="text-[#6B6B6B]">and</span>
          <span className="text-[#6B6B6B]">featured</span>
          <span className="text-[#6B6B6B]">equals</span>
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
                #
              </th>
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-left min-w-[180px]">
                Company name
              </th>
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-left min-w-[200px]">
                Product(s) used
              </th>
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-left w-[100px]">
                Case study
              </th>
              <th className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider px-6 py-3 text-left min-w-[150px]">
                Notes
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
                    <ProductTags products={row.products} />
                  </td>
                  <td className="px-6 py-3.5">
                    <CaseStudyLink hasLink={row.caseStudy} />
                  </td>
                  <td className="text-sm text-[#6B6B6B] px-6 py-3.5">{row.notes}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {sortedRows.length === 0 && (
        <div className="flex items-center justify-center py-16 text-[#9CA3AF] text-sm">
          No customers match the selected filters.
        </div>
      )}
    </div>
  );
}
