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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_session_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
