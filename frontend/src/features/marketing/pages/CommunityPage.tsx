import { ScrollArea } from "@/components/scroll-area";
import {
  CommunityArticles,
  CommunityHeader,
  CommunityLeftColumn,
  CommunityRightColumn,
} from "@/features/marketing/components/community";

export default function CommunityPage() {
  return (
    <ScrollArea className="h-full bg-white">
      <div className="min-h-full">
        <CommunityHeader />
        <div className="flex flex-col lg:flex-row gap-6 p-6 md:p-8">
          <CommunityLeftColumn />
          <CommunityArticles />
          <CommunityRightColumn />
        </div>
      </div>
    </ScrollArea>
  );
}
