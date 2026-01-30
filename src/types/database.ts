export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ERSStage = 'healing' | 'rebuilding' | 'ready';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          phone: string | null;
          email_verified: boolean;
          phone_verified: boolean;
          is_active: boolean;
          is_suspended: boolean;
          suspension_reason: string | null;
          has_accepted_terms: boolean;
          has_accepted_privacy: boolean;
          ers_tracking_consent: boolean;
          data_sharing_consent: boolean;
          account_type: 'free' | 'premium' | 'enterprise';
          referral_code: string | null;
          referred_by: string | null;
          last_active_at: string | null;
          last_login_at: string | null;
          login_streak_days: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string;
          display_name: string | null;
          date_of_birth: string;
          gender: 'male' | 'female' | 'non-binary' | 'other' | 'prefer-not-to-say' | null;
          pronouns: string | null;
          city: string | null;
          state_province: string | null;
          country: string | null;
          timezone: string;
          relationship_ended_at: string | null;
          relationship_duration_months: number | null;
          relationship_type: string | null;
          breakup_initiated_by: 'self' | 'partner' | 'mutual' | null;
          bio: string | null;
          profile_photo_url: string | null;
          profile_visibility: 'private' | 'community' | 'public';
          show_ers_score: boolean;
          profile_completion_percentage: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      ers_scores: {
        Row: {
          id: string;
          user_id: string;
          ers_score: number;
          ers_stage: ERSStage;
          ers_confidence: number;
          ers_delta: number | null;
          self_reflection_score: number | null;
          emotional_stability_score: number | null;
          trust_openness_score: number | null;
          engagement_consistency_score: number | null;
          recovery_behavior_score: number | null;
          social_readiness_score: number | null;
          data_points_used: number | null;
          calculation_method: string;
          calculated_at: string;
          week_of: string;
        };
        Insert: Omit<Database['public']['Tables']['ers_scores']['Row'], 'id' | 'calculated_at'>;
        Update: Partial<Database['public']['Tables']['ers_scores']['Insert']>;
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_title: string | null;
          entry_content: string;
          entry_content_encrypted: string | null;
          prompt_id: string | null;
          sentiment_score: number | null;
          emotion_primary: string | null;
          emotion_secondary: string | null;
          language_complexity_score: number | null;
          word_count: number | null;
          avg_sentence_length: number | null;
          contains_insight: boolean;
          contains_gratitude: boolean;
          contains_future_thinking: boolean;
          is_private: boolean;
          is_flagged_for_crisis: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['journal_entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>;
      };
      mood_entries: {
        Row: {
          id: string;
          user_id: string;
          mood_value: number;
          mood_label: string | null;
          emotions: string[] | null;
          trigger_type: string | null;
          trigger_description: string | null;
          activity_at_time: string | null;
          time_of_day: string | null;
          logged_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mood_entries']['Row'], 'id' | 'logged_at' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['mood_entries']['Insert']>;
      };
      exercises: {
        Row: {
          id: string;
          exercise_name: string;
          exercise_description: string | null;
          exercise_type: string | null;
          instructions: string | null;
          duration_minutes: number | null;
          audio_url: string | null;
          video_url: string | null;
          recommended_stage: ERSStage | null;
          difficulty_level: 'beginner' | 'intermediate' | 'advanced';
          completion_rate: number | null;
          avg_helpfulness_rating: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exercises']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['exercises']['Insert']>;
      };
      user_streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak_days: number;
          longest_streak_days: number;
          total_active_days: number;
          last_activity_date: string | null;
          streak_started_at: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_streaks']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_streaks']['Insert']>;
      };
      exercise_completions: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          completed_at: string;
          duration_seconds: number | null;
          helpfulness_rating: number | null;
          notes: string | null;
          mood_before: number | null;
          mood_after: number | null;
        };
        Insert: Omit<Database['public']['Tables']['exercise_completions']['Row'], 'id' | 'completed_at'>;
        Update: Partial<Database['public']['Tables']['exercise_completions']['Insert']>;
      };
      active_matches: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          matched_at: string;
          last_message_at: string | null;
          match_health_score: number | null;
          is_active: boolean;
          unmatched_at: string | null;
          unmatched_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['active_matches']['Row'], 'id' | 'matched_at'>;
        Update: Partial<Database['public']['Tables']['active_matches']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          contains_concerning_language: boolean;
          sentiment_score: number | null;
          is_read: boolean;
          read_at: string | null;
          sent_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'sent_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
    };
    Views: {};
    Functions: {
      calculate_ers_score: {
        Args: { p_user_id: string; p_week_of: string };
        Returns: number;
      };
    };
    Enums: {
      ers_stage: ERSStage;
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ERSScore = Database['public']['Tables']['ers_scores']['Row'];
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
export type MoodEntry = Database['public']['Tables']['mood_entries']['Row'];
export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type ExerciseCompletion = Database['public']['Tables']['exercise_completions']['Row'];
export type UserStreak = Database['public']['Tables']['user_streaks']['Row'];
export type ActiveMatch = Database['public']['Tables']['active_matches']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
