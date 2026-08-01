export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          age_group: string | null
          apply_url: string | null
          category: string | null
          created_at: string
          description: string
          donation_url: string | null
          gender: string | null
          hidden: boolean
          home_area: string | null
          homepage_url: string | null
          id: string
          lat: number | null
          lng: number | null
          official_url: string | null
          photo_url: string | null
          place_label: string | null
          reviewed_at: string | null
          scope: string
          session_id: string
          status: string
          subtopic: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          age_group?: string | null
          apply_url?: string | null
          category?: string | null
          created_at?: string
          description: string
          donation_url?: string | null
          gender?: string | null
          hidden?: boolean
          home_area?: string | null
          homepage_url?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          official_url?: string | null
          photo_url?: string | null
          place_label?: string | null
          reviewed_at?: string | null
          scope?: string
          session_id: string
          status?: string
          subtopic?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          age_group?: string | null
          apply_url?: string | null
          category?: string | null
          created_at?: string
          description?: string
          donation_url?: string | null
          gender?: string | null
          hidden?: boolean
          home_area?: string | null
          homepage_url?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          official_url?: string | null
          photo_url?: string | null
          place_label?: string | null
          reviewed_at?: string | null
          scope?: string
          session_id?: string
          status?: string
          subtopic?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_likes: {
        Row: {
          activity_id: string
          age_group: string | null
          created_at: string
          gender: string | null
          home_area: string | null
          id: string
          session_id: string
        }
        Insert: {
          activity_id: string
          age_group?: string | null
          created_at?: string
          gender?: string | null
          home_area?: string | null
          id?: string
          session_id: string
        }
        Update: {
          activity_id?: string
          age_group?: string | null
          created_at?: string
          gender?: string | null
          home_area?: string | null
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_likes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_secret: {
        Row: {
          id: number
          passphrase: string
        }
        Insert: {
          id?: number
          passphrase: string
        }
        Update: {
          id?: number
          passphrase?: string
        }
        Relationships: []
      }
      disaster_ideas: {
        Row: {
          body: string
          category: string | null
          created_at: string
          hidden: boolean
          id: string
          photo_url: string | null
          session_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          hidden?: boolean
          id?: string
          photo_url?: string | null
          session_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          hidden?: boolean
          id?: string
          photo_url?: string | null
          session_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_sessions: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          label: string
          shared_code: string
          started_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          label?: string
          shared_code: string
          started_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          label?: string
          shared_code?: string
          started_at?: string
        }
        Relationships: []
      }
      event_survey_responses: {
        Row: {
          created_at: string
          id: string
          option_index: number
          session_id: string
          shared_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          session_id: string
          shared_code: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          session_id?: string
          shared_code?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          email: string | null
          id: string
          lang: string | null
          message: string
          session_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          lang?: string | null
          message: string
          session_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          lang?: string | null
          message?: string
          session_id?: string
        }
        Relationships: []
      }
      fixed_survey_answers: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          location_source: string | null
          question_id: string
          submission_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_source?: string | null
          question_id: string
          submission_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          location_source?: string | null
          question_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "fixed_survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_survey_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "fixed_survey_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_survey_categories: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name_en: string
          name_ja: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name_en: string
          name_ja: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name_en?: string
          name_ja?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      fixed_survey_questions: {
        Row: {
          created_at: string
          id: string
          label: string
          location_enabled: boolean
          order_index: number
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          location_enabled?: boolean
          order_index?: number
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          location_enabled?: boolean
          order_index?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "fixed_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_survey_submissions: {
        Row: {
          created_at: string
          id: string
          session_id: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_survey_submissions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "fixed_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_surveys: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_surveys_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fixed_survey_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      group_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          shared_code: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          shared_code: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          shared_code?: string
        }
        Relationships: []
      }
      group_help_requests: {
        Row: {
          created_at: string
          id: string
          message: string
          session_id: string
          shared_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          session_id: string
          shared_code: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          session_id?: string
          shared_code?: string
        }
        Relationships: []
      }
      group_survey_responses: {
        Row: {
          created_at: string
          id: string
          option_index: number
          session_id: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          session_id: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          session_id?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "group_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      group_surveys: {
        Row: {
          admin_session_id: string
          created_at: string
          id: string
          options: Json
          question: string
          shared_code: string
        }
        Insert: {
          admin_session_id: string
          created_at?: string
          id?: string
          options: Json
          question: string
          shared_code: string
        }
        Update: {
          admin_session_id?: string
          created_at?: string
          id?: string
          options?: Json
          question?: string
          shared_code?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          admin_session_id: string
          created_at: string
          event_datetime: string | null
          event_description: string | null
          event_fee: string | null
          event_location: string | null
          event_title: string | null
          event_url: string | null
          is_event: boolean
          location_precision: string
          name: string
          organizer_name: string | null
          results_visible: boolean
          shared_code: string
          survey_options: Json | null
          survey_question: string | null
          survey_visibility: string
        }
        Insert: {
          admin_session_id: string
          created_at?: string
          event_datetime?: string | null
          event_description?: string | null
          event_fee?: string | null
          event_location?: string | null
          event_title?: string | null
          event_url?: string | null
          is_event?: boolean
          location_precision?: string
          name?: string
          organizer_name?: string | null
          results_visible?: boolean
          shared_code: string
          survey_options?: Json | null
          survey_question?: string | null
          survey_visibility?: string
        }
        Update: {
          admin_session_id?: string
          created_at?: string
          event_datetime?: string | null
          event_description?: string | null
          event_fee?: string | null
          event_location?: string | null
          event_title?: string | null
          event_url?: string | null
          is_event?: boolean
          location_precision?: string
          name?: string
          organizer_name?: string | null
          results_visible?: boolean
          shared_code?: string
          survey_options?: Json | null
          survey_question?: string | null
          survey_visibility?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          age_group: string | null
          created_at: string
          gender: string | null
          home_area: string | null
          id: string
          post_id: string
          session_id: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          gender?: string | null
          home_area?: string | null
          id?: string
          post_id: string
          session_id: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          gender?: string | null
          home_area?: string | null
          id?: string
          post_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          activity_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reason: string | null
          resolution_id: string | null
          session_id: string
          status: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string | null
          resolution_id?: string | null
          session_id: string
          status?: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string | null
          resolution_id?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "resolution_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      post_thanks: {
        Row: {
          age_group: string | null
          created_at: string
          gender: string | null
          home_area: string | null
          id: string
          post_id: string
          session_id: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          gender?: string | null
          home_area?: string | null
          id?: string
          post_id: string
          session_id: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          gender?: string | null
          home_area?: string | null
          id?: string
          post_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_thanks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          affected_group: string | null
          age_group: string | null
          category: string | null
          created_at: string
          description: string
          gender: string | null
          hidden: boolean
          home_area: string | null
          id: string
          lat: number | null
          lng: number | null
          official_url: string | null
          photo_url: string | null
          place_label: string | null
          place_relation: string | null
          resolved: boolean
          session_id: string
          subtopic: string | null
          thanks_count: number
          title: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          when_text: string | null
          why_needed: string | null
        }
        Insert: {
          affected_group?: string | null
          age_group?: string | null
          category?: string | null
          created_at?: string
          description: string
          gender?: string | null
          hidden?: boolean
          home_area?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          official_url?: string | null
          photo_url?: string | null
          place_label?: string | null
          place_relation?: string | null
          resolved?: boolean
          session_id: string
          subtopic?: string | null
          thanks_count?: number
          title?: string | null
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          when_text?: string | null
          why_needed?: string | null
        }
        Update: {
          affected_group?: string | null
          age_group?: string | null
          category?: string | null
          created_at?: string
          description?: string
          gender?: string | null
          hidden?: boolean
          home_area?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          official_url?: string | null
          photo_url?: string | null
          place_label?: string | null
          place_relation?: string | null
          resolved?: boolean
          session_id?: string
          subtopic?: string | null
          thanks_count?: number
          title?: string | null
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          when_text?: string | null
          why_needed?: string | null
        }
        Relationships: []
      }
      resolution_reports: {
        Row: {
          age_group: string | null
          created_at: string
          description: string
          gender: string | null
          hidden: boolean
          home_area: string | null
          id: string
          photo_url: string
          related_post_id: string
          reviewed_at: string | null
          session_id: string
          status: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          description: string
          gender?: string | null
          hidden?: boolean
          home_area?: string | null
          id?: string
          photo_url: string
          related_post_id: string
          reviewed_at?: string | null
          session_id: string
          status?: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          description?: string
          gender?: string | null
          hidden?: boolean
          home_area?: string | null
          id?: string
          photo_url?: string
          related_post_id?: string
          reviewed_at?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "resolution_reports_related_post_id_fkey"
            columns: ["related_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      shelter_posts: {
        Row: {
          content: string
          created_at: string
          hidden: boolean
          id: string
          photo_url: string | null
          session_id: string
          shelter_id: string
        }
        Insert: {
          content: string
          created_at?: string
          hidden?: boolean
          id?: string
          photo_url?: string | null
          session_id: string
          shelter_id: string
        }
        Update: {
          content?: string
          created_at?: string
          hidden?: boolean
          id?: string
          photo_url?: string | null
          session_id?: string
          shelter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelter_posts_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      shelter_status_votes: {
        Row: {
          created_at: string
          id: string
          item_key: string
          kind: string
          session_id: string
          shelter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          kind: string
          session_id: string
          shelter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          kind?: string
          session_id?: string
          shelter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelter_status_votes_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      shelters: {
        Row: {
          address: string | null
          admin_session_id: string | null
          announcement: string | null
          created_at: string
          crowdedness: string
          hidden: boolean
          id: string
          info_url: string | null
          lat: number | null
          lng: number | null
          name: string
          needed_supplies: string[]
          pet_status: string
          problem_categories: string[]
          surplus_supplies: string[]
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_session_id?: string | null
          announcement?: string | null
          created_at?: string
          crowdedness?: string
          hidden?: boolean
          id?: string
          info_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          needed_supplies?: string[]
          pet_status?: string
          problem_categories?: string[]
          surplus_supplies?: string[]
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_session_id?: string | null
          announcement?: string | null
          created_at?: string
          crowdedness?: string
          hidden?: boolean
          id?: string
          info_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          needed_supplies?: string[]
          pet_status?: string
          problem_categories?: string[]
          surplus_supplies?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          exact_lat: number | null
          exact_lng: number | null
          id: string
          mood: string
          mood_color: string
          mood_en: string
          rounded_lat: number | null
          rounded_lng: number | null
          session_id: string
          shared_code: string | null
          timestamp: string
        }
        Insert: {
          exact_lat?: number | null
          exact_lng?: number | null
          id?: string
          mood: string
          mood_color: string
          mood_en: string
          rounded_lat?: number | null
          rounded_lng?: number | null
          session_id: string
          shared_code?: string | null
          timestamp?: string
        }
        Update: {
          exact_lat?: number | null
          exact_lng?: number | null
          id?: string
          mood?: string
          mood_color?: string
          mood_en?: string
          rounded_lat?: number | null
          rounded_lng?: number | null
          session_id?: string
          shared_code?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          label: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          label?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          label?: string | null
          session_id?: string
        }
        Relationships: []
      }
      trouble_metoo: {
        Row: {
          created_at: string
          id: string
          report_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trouble_metoo_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "trouble_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      trouble_reports: {
        Row: {
          affected_group: string | null
          created_at: string
          description: string
          id: string
          lat: number
          lng: number
          place_label: string
          session_id: string
        }
        Insert: {
          affected_group?: string | null
          created_at?: string
          description: string
          id?: string
          lat: number
          lng: number
          place_label: string
          session_id: string
        }
        Update: {
          affected_group?: string | null
          created_at?: string
          description?: string
          id?: string
          lat?: number
          lng?: number
          place_label?: string
          session_id?: string
        }
        Relationships: []
      }
      verified_posters: {
        Row: {
          created_at: string
          id: string
          label: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          session_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_admin: { Args: { _passphrase: string }; Returns: boolean }
      current_session_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      post_type: "happy" | "request" | "promote"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      post_type: ["happy", "request", "promote"],
    },
  },
} as const
