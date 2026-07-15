import { Grid } from "@astryxdesign/core/Grid";
import { Section } from "@astryxdesign/core/Section";
import { VStack } from "@astryxdesign/core/VStack";
import {
  CommunityArticles,
  CommunityHeader,
  CommunityLeftColumn,
  CommunityRightColumn,
} from "@/features/marketing/components/community";

/**
 * The narrowest a Gazette column may get before the layout drops to fewer columns. Astryx's Grid
 * reflows on the container it is given, so the page's two breakpoints — 768px (padding) and 1024px
 * (three-up) — are gone, and community-page.module.css with them.
 */
const COLUMN_MIN_WIDTH = 280;
const COLUMN_MAX = 3;

export default function CommunityPage() {
  return (
    <VStack height="100%" isScrollable>
      <Section padding={0} minHeight="100%">
        <CommunityHeader />
        {/* Three columns when there is room, two when there is less, one when there is least —
            Grid decides from the container. The rails and the main column are equal tracks now;
            they were 25 / 50 / 25 at the old 1024px breakpoint. */}
        <VStack padding={6}>
          <Grid columns={{ minWidth: COLUMN_MIN_WIDTH, max: COLUMN_MAX }} gap={6}>
            <CommunityLeftColumn />
            <CommunityArticles />
            <CommunityRightColumn />
          </Grid>
        </VStack>
      </Section>
    </VStack>
  );
}
