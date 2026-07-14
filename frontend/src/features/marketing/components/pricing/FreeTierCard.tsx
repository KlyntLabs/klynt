import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { FreeTierItem } from "@/features/marketing/lib/pricing-types";
import styles from "./free-tier-card.module.css";

interface FreeTierCardProps {
  item: FreeTierItem;
}

export function FreeTierCard({ item }: FreeTierCardProps) {
  return (
    <Card variant="muted" padding={3}>
      <HStack gap={3} align="center">
        <div className={styles.iconTile}>{item.icon}</div>
        <VStack gap={0} align="start" className={styles.copy}>
          {/*
           * The allowance is always green: the pre-migration `included ? green : green`
           * ternary had identical branches, so it never varied. Behaviour is unchanged.
           */}
          <Text type="label">{item.product}</Text>
          <Text type="supporting" weight="medium" className={styles.allowance}>
            {item.allowance}
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}
