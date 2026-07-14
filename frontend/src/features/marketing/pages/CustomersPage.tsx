import { Badge } from "@astryxdesign/core/Badge";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Selector } from "@astryxdesign/core/Selector";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CustomerRow, Product } from "@/features/marketing/data/customers";
import { allProducts, customerRows } from "@/features/marketing/data/customers";
import styles from "./customers-page.module.css";

/**
 * The company logo plate. Astryx's spacing scale stops at 48px and its size props take plain
 * pixel numbers (`SizeValue`: "numbers are treated as pixels"), so the square rides `width`/
 * `height` on the stack rather than the stylesheet.
 */
const LOGO_SIZE = 28;

/* ------------------------------------------------------------------ */
/*  Filter option types                                                */
/* ------------------------------------------------------------------ */
type ProductFilter = "Any" | Product;
type CaseStudyFilter = "Any" | "Has link" | "No link";
type FeaturedFilter = "Any" | "TRUE" | "FALSE";

/** Astryx's Table requires an index signature on its row type. */
interface CustomerTableRow extends CustomerRow {
  [key: string]: unknown;
}

type Translate = (key: string) => string;

/* ------------------------------------------------------------------ */
/*  Company logo placeholder (tinted square with initials)             */
/* ------------------------------------------------------------------ */
const LOGO_TINTS = [
  styles.logoBlue,
  styles.logoCyan,
  styles.logoGreen,
  styles.logoOrange,
  styles.logoPink,
  styles.logoPurple,
  styles.logoTeal,
  styles.logoYellow,
];

function CompanyLogo({ customer }: { customer: CustomerRow }) {
  const tint = LOGO_TINTS[customer.id % LOGO_TINTS.length];
  return (
    <HStack gap={2} align="center">
      <HStack
        as="span"
        width={LOGO_SIZE}
        height={LOGO_SIZE}
        align="center"
        justify="center"
        className={`${styles.logo} ${tint}`}
        aria-hidden="true"
      >
        <Text as="span" size="2xs" weight="bold" color="inherit">
          {customer.logoInitials}
        </Text>
      </HStack>
      <Text type="label" weight="medium">
        {customer.company}
      </Text>
    </HStack>
  );
}

/* ------------------------------------------------------------------ */
/*  Product tag pills                                                  */
/* ------------------------------------------------------------------ */
function ProductTags({ products, tk }: { products: Product[]; tk: Translate }) {
  return (
    <HStack gap={1} wrap="wrap">
      {products.map((p) => (
        <Badge key={p} variant="neutral" label={tk(`data.products.${p}`)} />
      ))}
    </HStack>
  );
}

/* ------------------------------------------------------------------ */
/*  Case study link                                                    */
/* ------------------------------------------------------------------ */
function CaseStudyLink({ hasLink, tk }: { hasLink: boolean; tk: Translate }) {
  if (!hasLink) {
    return <Text color="disabled">&ndash;</Text>;
  }
  return (
    <Link>
      <HStack as="span" gap={1} align="center">
        {tk("customers.table.link")}
        <Icon icon={ExternalLink} size="xsm" aria-hidden="true" />
      </HStack>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Customers Page                                                */
/* ------------------------------------------------------------------ */
export default function CustomersPage() {
  const { t } = useTranslation("marketing");
  const tk: Translate = (key) => t(key as never);
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
    return [...filteredRows].sort((a, b) => a.id - b.id) as CustomerTableRow[];
  }, [filteredRows]);

  const productOptions = [
    { value: "Any", label: t("customers.filters.any") },
    ...allProducts.map((p) => ({ value: p, label: tk(`data.products.${p}`) })),
  ];
  const caseStudyOptions = [
    { value: "Any", label: t("customers.filters.any") },
    { value: "Has link", label: t("customers.filters.hasLink") },
    { value: "No link", label: t("customers.filters.noLink") },
  ];
  const featuredOptions = [
    { value: "Any", label: t("customers.filters.any") },
    { value: "TRUE", label: t("customers.filters.true") },
    { value: "FALSE", label: t("customers.filters.false") },
  ];

  const columns: TableColumn<CustomerTableRow>[] = [
    {
      key: "id",
      header: t("customers.table.number"),
      width: pixel(56),
      align: "center",
      renderCell: (row) => (
        <Text type="supporting" size="sm" hasTabularNumbers>
          {row.id}
        </Text>
      ),
    },
    {
      key: "company",
      header: t("customers.table.company"),
      width: proportional(1, { minWidth: 180 }),
      renderCell: (row) => <CompanyLogo customer={row} />,
    },
    {
      key: "products",
      header: t("customers.table.products"),
      width: proportional(1.5, { minWidth: 200 }),
      renderCell: (row) => <ProductTags products={row.products} tk={tk} />,
    },
    {
      key: "caseStudy",
      header: t("customers.table.caseStudy"),
      width: pixel(120),
      renderCell: (row) => <CaseStudyLink hasLink={row.caseStudy} tk={tk} />,
    },
    {
      key: "notes",
      header: t("customers.table.notes"),
      width: proportional(1.5, { minWidth: 150 }),
      renderCell: (row) => <Text color="secondary">{tk(row.notesKey)}</Text>,
    },
  ];

  return (
    <VStack gap={0} width="100%">
      {/* Filter Bar — a Section carries the surface and the bottom divider; only `position:
          sticky` is left in CSS, and that is structure, not a value. */}
      <Section dividers={["bottom"]} padding={6} paddingBlock={3} className={styles.filterBar}>
        <HStack align="center" wrap="wrap" gap={2}>
          <Text color="secondary">{t("customers.filters.where")}</Text>
          <Text color="secondary">{t("customers.filters.productUsed")}</Text>
          <Text color="secondary">{t("customers.filters.includes")}</Text>
          <Selector
            label={t("customers.filters.productUsed")}
            isLabelHidden
            size="sm"
            value={productFilter}
            options={productOptions}
            onChange={(v) => setProductFilter(v as ProductFilter)}
          />
          <Text color="secondary">{t("customers.filters.and")}</Text>
          <Text color="secondary">{t("customers.filters.caseStudy")}</Text>
          <Text color="secondary">{t("customers.filters.equals")}</Text>
          <Selector
            label={t("customers.filters.caseStudy")}
            isLabelHidden
            size="sm"
            value={caseStudyFilter}
            options={caseStudyOptions}
            onChange={(v) => setCaseStudyFilter(v as CaseStudyFilter)}
          />
          <Text color="secondary">{t("customers.filters.and")}</Text>
          <Text color="secondary">{t("customers.filters.featured")}</Text>
          <Text color="secondary">{t("customers.filters.equals")}</Text>
          <Selector
            label={t("customers.filters.featured")}
            isLabelHidden
            size="sm"
            value={featuredFilter}
            options={featuredOptions}
            onChange={(v) => setFeaturedFilter(v as FeaturedFilter)}
          />
        </HStack>
      </Section>

      {/* Data Table — isScrollable is Astryx's own overflow prop, so the scroll region needs
          no CSS at all. */}
      <VStack isScrollable width="100%">
        <Table
          data={sortedRows}
          columns={columns}
          idKey={(row) => row.id}
          density="balanced"
          dividers="rows"
          hasHover
        />
      </VStack>

      {/* Empty state */}
      {sortedRows.length === 0 && <EmptyState title={t("customers.table.empty")} />}
    </VStack>
  );
}
