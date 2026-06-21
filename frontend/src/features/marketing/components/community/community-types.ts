export interface CommunityArticle {
  category: string;
  title: string;
  excerpt: string;
}

export interface CommunitySlackThread {
  channel: string;
  title: string;
  preview: string;
}

export interface CommunityQuestion {
  topic: string;
  reply: string;
}

export interface CommunityChangelogItem {
  category: string;
  text: string;
}

export interface CommunityFeatureRequest {
  name: string;
  votes: number;
}

export interface CommunityEvent {
  title: string;
  date: string;
  type: string;
}

export interface CommunityStat {
  value: string;
  label: string;
}

export interface CommunityStats {
  slackMembers: CommunityStat;
  messagesSent: CommunityStat;
  countries: CommunityStat;
}

export interface CommunitySpotlight {
  name: string;
  role: string;
  bio: string;
}
