import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { Shuffle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Customer } from "@/features/marketing/data/homeData";
import { engineerCustomers, vcCustomers } from "@/features/marketing/data/homeData";
import styles from "./customer-logos-section.module.css";

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

function LogoGroup({ label, customers }: { label: string; customers: Customer[] }) {
  return (
    <VStack gap={3} align="start">
      <Text
        type="supporting"
        size="xsm"
        weight="semibold"
        color="disabled"
        className={styles.eyebrow}
      >
        {label}
      </Text>
      <HStack gap={3} wrap="wrap">
        {customers.map((c) => (
          <Token key={c.id} label={c.logo} />
        ))}
      </HStack>
    </VStack>
  );
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
    <Section variant="transparent" padding={0} paddingBlock={6} dividers={["top"]}>
      <VStack gap={5} align="start">
        <HStack gap={4} align="center" justify="between" width="100%">
          <VStack gap={1} align="start">
            <Heading level={2}>{t("home.customers.title")}</Heading>
            <Text type="supporting">{t("home.customers.subtitle")}</Text>
          </VStack>
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon icon={Shuffle} />}
            label={t("home.customers.shuffle")}
            onClick={handleShuffle}
          />
        </HStack>

        <Grid columns={{ minWidth: 280, max: 2 }} gap={6} width="100%">
          <LogoGroup label={t("home.customers.vcLabel")} customers={shuffledVC} />
          <LogoGroup label={t("home.customers.engineerLabel")} customers={shuffledEng} />
        </Grid>

        <Button
          variant="ghost"
          size="sm"
          label={t("home.customers.openCustomers")}
          onClick={() => onOpenApp("/customers", t("home.customers.openCustomers"))}
        />
      </VStack>
    </Section>
  );
}
