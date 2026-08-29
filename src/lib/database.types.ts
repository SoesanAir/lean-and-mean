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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      daily_logs: {
        Row: {
          calories: number | null
          date: string
          energy: number | null
          id: string
          note: Json | null
          protein_g: number | null
          sleep_hours: number | null
          soreness: number | null
          steps: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          calories?: number | null
          date: string
          energy?: number | null
          id?: string
          note?: Json | null
          protein_g?: number | null
          sleep_hours?: number | null
          soreness?: number | null
          steps?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          calories?: number | null
          date?: string
          energy?: number | null
          id?: string
          note?: Json | null
          protein_g?: number | null
          sleep_hours?: number | null
          soreness?: number | null
          steps?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          category: string
          common_mistakes: string[] | null
          default_grip: Database["public"]["Enums"]["grip_type"]
          equipment: string[]
          id: string
          is_available: boolean
          name: string
          purpose: string[]
          watch_for: string[]
        }
        Insert: {
          category: string
          common_mistakes?: string[] | null
          default_grip: Database["public"]["Enums"]["grip_type"]
          equipment?: string[]
          id: string
          is_available?: boolean
          name: string
          purpose?: string[]
          watch_for?: string[]
        }
        Update: {
          category?: string
          common_mistakes?: string[] | null
          default_grip?: Database["public"]["Enums"]["grip_type"]
          equipment?: string[]
          id?: string
          is_available?: boolean
          name?: string
          purpose?: string[]
          watch_for?: string[]
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          calories: number | null
          description: string | null
          id: string
          meal_type: string | null
          photo_path: string | null
          protein_g: number | null
          ts: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          description?: string | null
          id?: string
          meal_type?: string | null
          photo_path?: string | null
          protein_g?: number | null
          ts?: string
          user_id?: string
        }
        Update: {
          calories?: number | null
          description?: string | null
          id?: string
          meal_type?: string | null
          photo_path?: string | null
          protein_g?: number | null
          ts?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          created_at: string
          daily_log_id: string | null
          exercise_result_id: string | null
          food_entry_id: string | null
          id: string
          section_result_id: string | null
          set_result_id: string | null
          skill_result_id: string | null
          text: string
          timed_block_result_id: string | null
          updated_at: string
          user_id: string
          workout_session_id: string | null
        }
        Insert: {
          created_at?: string
          daily_log_id?: string | null
          exercise_result_id?: string | null
          food_entry_id?: string | null
          id?: string
          section_result_id?: string | null
          set_result_id?: string | null
          skill_result_id?: string | null
          text: string
          timed_block_result_id?: string | null
          updated_at?: string
          user_id?: string
          workout_session_id?: string | null
        }
        Update: {
          created_at?: string
          daily_log_id?: string | null
          exercise_result_id?: string | null
          food_entry_id?: string | null
          id?: string
          section_result_id?: string | null
          set_result_id?: string | null
          skill_result_id?: string | null
          text?: string
          timed_block_result_id?: string | null
          updated_at?: string
          user_id?: string
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_food_entry_id_fkey"
            columns: ["food_entry_id"]
            isOneToOne: false
            referencedRelation: "food_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_prescriptions: {
        Row: {
          display_name: string | null
          duration_sec: number | null
          each_direction: boolean
          exercise_id: string
          grip: Database["public"]["Enums"]["grip_type"]
          grip_notes: string | null
          id: string
          is_bodyweight: boolean
          kind: string
          per_side: boolean
          position: number
          purpose: string[] | null
          reps: string | null
          section_id: string
          sets: number | null
          tempo: string | null
          watch_for: string[] | null
          weight_kg: number | null
        }
        Insert: {
          display_name?: string | null
          duration_sec?: number | null
          each_direction?: boolean
          exercise_id: string
          grip: Database["public"]["Enums"]["grip_type"]
          grip_notes?: string | null
          id: string
          is_bodyweight?: boolean
          kind: string
          per_side?: boolean
          position: number
          purpose?: string[] | null
          reps?: string | null
          section_id: string
          sets?: number | null
          tempo?: string | null
          watch_for?: string[] | null
          weight_kg?: number | null
        }
        Update: {
          display_name?: string | null
          duration_sec?: number | null
          each_direction?: boolean
          exercise_id?: string
          grip?: Database["public"]["Enums"]["grip_type"]
          grip_notes?: string | null
          id?: string
          is_bodyweight?: boolean
          kind?: string
          per_side?: boolean
          position?: number
          purpose?: string[] | null
          reps?: string | null
          section_id?: string
          sets?: number | null
          tempo?: string | null
          watch_for?: string[] | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_prescriptions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_prescriptions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sections: {
        Row: {
          benchmark_label: string | null
          block_weight_kg: number | null
          effort: string | null
          emphasis: string | null
          id: string
          intro: string | null
          is_benchmark: boolean
          minutes: number | null
          position: number
          rest_sec: number | null
          rounds: number | null
          section_type: string
          skill_exercise_id: string | null
          template_id: string
          title: string
          track_attempts: boolean
          track_best_hold: boolean
          work_sec: number | null
        }
        Insert: {
          benchmark_label?: string | null
          block_weight_kg?: number | null
          effort?: string | null
          emphasis?: string | null
          id: string
          intro?: string | null
          is_benchmark?: boolean
          minutes?: number | null
          position: number
          rest_sec?: number | null
          rounds?: number | null
          section_type: string
          skill_exercise_id?: string | null
          template_id: string
          title: string
          track_attempts?: boolean
          track_best_hold?: boolean
          work_sec?: number | null
        }
        Update: {
          benchmark_label?: string | null
          block_weight_kg?: number | null
          effort?: string | null
          emphasis?: string | null
          id?: string
          intro?: string | null
          is_benchmark?: boolean
          minutes?: number | null
          position?: number
          rest_sec?: number | null
          rounds?: number | null
          section_type?: string
          skill_exercise_id?: string | null
          template_id?: string
          title?: string
          track_attempts?: boolean
          track_best_hold?: boolean
          work_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_skill_exercise_id_fkey"
            columns: ["skill_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          date: string
          day: number
          difficulty: string | null
          energy: number | null
          finished_at: string | null
          id: string
          pain: boolean | null
          pain_note: string | null
          performance: Json
          prescription_snapshot: Json
          quote: string | null
          soreness_after: number | null
          soreness_before: number | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          date: string
          day: number
          difficulty?: string | null
          energy?: number | null
          finished_at?: string | null
          id?: string
          pain?: boolean | null
          pain_note?: string | null
          performance?: Json
          prescription_snapshot: Json
          quote?: string | null
          soreness_after?: number | null
          soreness_before?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          date?: string
          day?: number
          difficulty?: string | null
          energy?: number | null
          finished_at?: string | null
          id?: string
          pain?: boolean | null
          pain_note?: string | null
          performance?: Json
          prescription_snapshot?: Json
          quote?: string | null
          soreness_after?: number | null
          soreness_before?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          day: number
          emphasis: string
          goal: string
          id: string
          intensity: string
          is_rest: boolean
          name: string
          quote: string
          rest_suggestions: string[] | null
        }
        Insert: {
          day: number
          emphasis: string
          goal: string
          id: string
          intensity: string
          is_rest?: boolean
          name: string
          quote: string
          rest_suggestions?: string[] | null
        }
        Update: {
          day?: number
          emphasis?: string
          goal?: string
          id?: string
          intensity?: string
          is_rest?: boolean
          name?: string
          quote?: string
          rest_suggestions?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      grip_type:
        | "HANDLE"
        | "HORNS"
        | "BALL"
        | "BOTTOM_UP_HANDLE"
        | "BODYWEIGHT"
        | "NONE"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      grip_type: [
        "HANDLE",
        "HORNS",
        "BALL",
        "BOTTOM_UP_HANDLE",
        "BODYWEIGHT",
        "NONE",
      ],
    },
  },
} as const
