export type FeedTab = "city" | "company";

export interface FeedCursor {
  createdAt: string;
  id: string;
}

export interface FeedCompany {
  id?: string;
  name: string;
  domain: string;
}

export interface FeedUser {
  id: string;
  full_name: string;
  email: string;
  city: string;
  avatar_url?: string | null;
  vouch_points: number;
  is_admin: boolean;
  is_verified: boolean;
  onboarded: boolean;
  company_id: string | null;
  linkedin_url?: string | null;
  phone_number?: string | null;
  is_profile_complete: boolean;
  profile_completion_percentage: number;
  company: FeedCompany;
}

export interface FeedComment {
  id: string;
  text: string;
  created_at: string;
  user: { id: string; full_name: string; avatar_url?: string | null };
}

export interface FeedPost {
  id: string;
  user_id: string;
  text: string;
  category: "housing" | "buy_sell" | "recommendations" | "jobs";
  sub_category?: "flatmates" | "rentals" | "sale" | "pg" | "hiring" | "seeking_referral" | "offering_referral" | "seeking_job" | null;
  visibility: "company" | "all";
  image_urls: string[];
  is_flagged: boolean;
  flag_reasons: string[];
  created_at: string;
  updated_at?: string;
  status?: "active" | "closed";
  user: {
    id: string;
    full_name: string;
    city: string;
    avatar_url?: string | null;
    vouch_points?: number;
    is_admin: boolean;
    is_verified: boolean;
    company_id: string | null;
    company: FeedCompany;
  };
  comment_count: number;
  vouch_count: number;
  save_count: number;
  view_count: number;
  comments?: FeedComment[];
}

export interface FeedFilters {
  tab: FeedTab;
  category: string;
  subCategory: string;
  search: string;
  city: string;
  cursor?: FeedCursor | null;
  limit?: number;
}

export interface FeedPageData {
  posts: FeedPost[];
  hasMore: boolean;
  nextCursor: string | null;
}
