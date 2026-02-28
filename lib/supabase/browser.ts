import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: true
  },
});

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          domain: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          domain?: string;
          name?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          company_id: string | null;
          city: string | null;
          is_verified: boolean;
          is_active: boolean;
          is_admin: boolean;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          company_id?: string | null;
          city?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          is_admin?: boolean;
          onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          company_id?: string | null;
          city?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          is_admin?: boolean;
          onboarded?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          text: string;
          category: 'housing' | 'buy_sell' | 'recommendations';
          visibility: 'company' | 'all';
          image_url: string | null;
          is_flagged: boolean;
          flag_reasons: string[];
          is_removed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          text: string;
          category: 'housing' | 'buy_sell' | 'recommendations';
          visibility: 'company' | 'all';
          image_url?: string | null;
          is_flagged?: boolean;
          flag_reasons?: string[];
          is_removed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          text?: string;
          category?: 'housing' | 'buy_sell' | 'recommendations';
          visibility?: 'company' | 'all';
          image_url?: string | null;
          is_flagged?: boolean;
          flag_reasons?: string[];
          is_removed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          text: string;
          is_removed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          text: string;
          is_removed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          text?: string;
          is_removed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          post_id: string | null;
          comment_id: string | null;
          reason: string;
          status: 'pending' | 'reviewed' | 'dismissed';
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          reason: string;
          status?: 'pending' | 'reviewed' | 'dismissed';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          post_id?: string | null;
          comment_id?: string | null;
          reason?: string;
          status?: 'pending' | 'reviewed' | 'dismissed';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
