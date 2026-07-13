import { VStack } from "@astryxdesign/core/VStack";
import {
  CommunityArticles,
  CommunityHeader,
  CommunityLeftColumn,
  CommunityRightColumn,
} from "@/features/marketing/components/community";

export default function CommunityPage() {
  return (
    <VStack height="100%" isScrollable className="h-full bg-white">
      <div className="min-h-full">
        <CommunityHeader />
        <div className="flex flex-col lg:flex-row gap-6 p-6 md:p-8">
          <CommunityLeftColumn />
          <CommunityArticles />
          <CommunityRightColumn />
        </div>
      </div>
    </VStack>
  );
}
