import { useTranslation } from "react-i18next";

export function DataStackSection() {
  const { t } = useTranslation("marketing");
  const dataStackItems = t("home.dataStack.items", { returnObjects: true }) as unknown as string[];

  return (
    <section className="mb-8 pt-6 border-t border-[#E5E5E5]">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">{t("home.dataStack.title")}</h2>
      <p className="text-base text-[#6B6B6B] mb-2">{t("home.dataStack.body1")}</p>
      <p className="text-sm text-[#6B6B6B] mb-4">{t("home.dataStack.body2")}</p>
      <p className="text-sm text-[#6B6B6B] mb-4">{t("home.dataStack.body3")}</p>

      <ul className="space-y-1 mb-4">
        {dataStackItems.map((item) => (
          <li key={item} className="flex items-center gap-3 py-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 32 32"
              fill="none"
              aria-label={t("home.dataStack.includedAlt")}
            >
              <title>{t("home.dataStack.includedAlt")}</title>
              <rect width="32" height="32" rx="6" fill="#F76E18" />
              <path d="M8 16l6 6 10-10" stroke="white" strokeWidth="3" fill="none" />
            </svg>
            <span className="text-sm font-medium">{item}</span>
          </li>
        ))}
      </ul>

      <button type="button" className="text-sm text-[#2563EB] hover:underline">
        {t("home.dataStack.readmeLink")}
      </button>
    </section>
  );
}
