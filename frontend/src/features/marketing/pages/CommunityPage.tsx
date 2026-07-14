import { Section } from "@astryxdesign/core/Section";
import { VStack } from "@astryxdesign/core/VStack";
import {
  CommunityArticles,
  CommunityHeader,
  CommunityLeftColumn,
  CommunityRightColumn,
} from "@/features/marketing/components/community";
import styles from "./community-page.module.css";

export default function CommunityPage() {
  return (
    <VStack height="100%" isScrollable>
      <Section padding={0} minHeight="100%">
        <CommunityHeader />
        <div className={styles.columns}>
          <CommunityLeftColumn />
          <CommunityArticles />
          <CommunityRightColumn />
        </div>
      </Section>
    </VStack>
  );
}
