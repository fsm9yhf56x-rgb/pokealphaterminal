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
      api_usage: {
        Row: {
          calls_used: number | null
          date: string
          max_calls: number | null
        }
        Insert: {
          calls_used?: number | null
          date?: string
          max_calls?: number | null
        }
        Update: {
          calls_used?: number | null
          date?: string
          max_calls?: number | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_name: string
          badge_type: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_name: string
          badge_type: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_name?: string
          badge_type?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_cards: {
        Row: {
          buy_date: string | null
          buy_price: number | null
          card_number: string | null
          card_type: string | null
          condition: string | null
          created_at: string | null
          current_price: number | null
          edition: string | null
          grade_company: string | null
          grade_value: string | null
          graded: boolean | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          lang: string | null
          name: string
          notes: string | null
          qty: number | null
          rarity: string | null
          set_id: string | null
          set_name: string | null
          updated_at: string | null
          user_id: string
          variant: string | null
        }
        Insert: {
          buy_date?: string | null
          buy_price?: number | null
          card_number?: string | null
          card_type?: string | null
          condition?: string | null
          created_at?: string | null
          current_price?: number | null
          edition?: string | null
          grade_company?: string | null
          grade_value?: string | null
          graded?: boolean | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          lang?: string | null
          name: string
          notes?: string | null
          qty?: number | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          updated_at?: string | null
          user_id: string
          variant?: string | null
        }
        Update: {
          buy_date?: string | null
          buy_price?: number | null
          card_number?: string | null
          card_type?: string | null
          condition?: string | null
          created_at?: string | null
          current_price?: number | null
          edition?: string | null
          grade_company?: string | null
          grade_value?: string | null
          graded?: boolean | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          lang?: string | null
          name?: string
          notes?: string | null
          qty?: number | null
          rarity?: string | null
          set_id?: string | null
          set_name?: string | null
          updated_at?: string | null
          user_id?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          card_name: string
          card_number: string | null
          cardmarket_avg: number | null
          cardmarket_low: number | null
          cardmarket_trend: number | null
          condition: string | null
          created_at: string | null
          currency: string | null
          ebay_avg: number | null
          ebay_avg30d: number | null
          ebay_avg7d: number | null
          ebay_high: number | null
          ebay_low: number | null
          ebay_sales: number | null
          fetched_at: string | null
          has_graded: boolean | null
          id: string
          market: string | null
          poketrace_id: string | null
          psa10_avg: number | null
          psa9_avg: number | null
          set_name: string | null
          set_slug: string
          source: string | null
          tcg_avg: number | null
          tcg_avg30d: number | null
          tcg_avg7d: number | null
          tcg_high: number | null
          tcg_low: number | null
          tcg_sales: number | null
          tier: string | null
          top_price: number | null
          total_sales: number | null
          variant: string | null
        }
        Insert: {
          card_name: string
          card_number?: string | null
          cardmarket_avg?: number | null
          cardmarket_low?: number | null
          cardmarket_trend?: number | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          ebay_avg?: number | null
          ebay_avg30d?: number | null
          ebay_avg7d?: number | null
          ebay_high?: number | null
          ebay_low?: number | null
          ebay_sales?: number | null
          fetched_at?: string | null
          has_graded?: boolean | null
          id?: string
          market?: string | null
          poketrace_id?: string | null
          psa10_avg?: number | null
          psa9_avg?: number | null
          set_name?: string | null
          set_slug: string
          source?: string | null
          tcg_avg?: number | null
          tcg_avg30d?: number | null
          tcg_avg7d?: number | null
          tcg_high?: number | null
          tcg_low?: number | null
          tcg_sales?: number | null
          tier?: string | null
          top_price?: number | null
          total_sales?: number | null
          variant?: string | null
        }
        Update: {
          card_name?: string
          card_number?: string | null
          cardmarket_avg?: number | null
          cardmarket_low?: number | null
          cardmarket_trend?: number | null
          condition?: string | null
          created_at?: string | null
          currency?: string | null
          ebay_avg?: number | null
          ebay_avg30d?: number | null
          ebay_avg7d?: number | null
          ebay_high?: number | null
          ebay_low?: number | null
          ebay_sales?: number | null
          fetched_at?: string | null
          has_graded?: boolean | null
          id?: string
          market?: string | null
          poketrace_id?: string | null
          psa10_avg?: number | null
          psa9_avg?: number | null
          set_name?: string | null
          set_slug?: string
          source?: string | null
          tcg_avg?: number | null
          tcg_avg30d?: number | null
          tcg_avg7d?: number | null
          tcg_high?: number | null
          tcg_low?: number | null
          tcg_sales?: number | null
          tier?: string | null
          top_price?: number | null
          total_sales?: number | null
          variant?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_admin: boolean
          is_pro: boolean | null
          lang: string | null
          pro_until: string | null
          streak: number | null
          streak_last_date: string | null
          theme: string | null
          updated_at: string | null
          username: string | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_admin?: boolean
          is_pro?: boolean | null
          lang?: string | null
          pro_until?: string | null
          streak?: number | null
          streak_last_date?: string | null
          theme?: string | null
          updated_at?: string | null
          username?: string | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_admin?: boolean
          is_pro?: boolean | null
          lang?: string | null
          pro_until?: string | null
          streak?: number | null
          streak_last_date?: string | null
          theme?: string | null
          updated_at?: string | null
          username?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          created_at: string | null
          error: string | null
          finished_at: string | null
          id: string
          job_name: string
          started_at: string
          stats: Json | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_name: string
          started_at?: string
          stats?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          job_name?: string
          started_at?: string
          stats?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      tcg_cards: {
        Row: {
          card_type: string | null
          has_image: boolean | null
          hp: number | null
          id: string
          image_synced_at: string | null
          is_active: boolean | null
          lang: string
          local_id: string | null
          name: string
          rarity: string | null
          set_id: string | null
          synced_at: string | null
        }
        Insert: {
          card_type?: string | null
          has_image?: boolean | null
          hp?: number | null
          id: string
          image_synced_at?: string | null
          is_active?: boolean | null
          lang: string
          local_id?: string | null
          name: string
          rarity?: string | null
          set_id?: string | null
          synced_at?: string | null
        }
        Update: {
          card_type?: string | null
          has_image?: boolean | null
          hp?: number | null
          id?: string
          image_synced_at?: string | null
          is_active?: boolean | null
          lang?: string
          local_id?: string | null
          name?: string
          rarity?: string | null
          set_id?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tcg_cards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "tcg_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      tcg_sets: {
        Row: {
          era: string | null
          id: string
          is_active: boolean | null
          lang: string
          logo_url: string | null
          name: string
          release_date: string | null
          series: string | null
          symbol_url: string | null
          synced_at: string | null
          total_cards: number | null
          updated_at: string | null
        }
        Insert: {
          era?: string | null
          id: string
          is_active?: boolean | null
          lang: string
          logo_url?: string | null
          name: string
          release_date?: string | null
          series?: string | null
          symbol_url?: string | null
          synced_at?: string | null
          total_cards?: number | null
          updated_at?: string | null
        }
        Update: {
          era?: string | null
          id?: string
          is_active?: boolean | null
          lang?: string
          logo_url?: string | null
          name?: string
          release_date?: string | null
          series?: string | null
          symbol_url?: string | null
          synced_at?: string | null
          total_cards?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          alert_enabled: boolean | null
          card_id: string | null
          card_name: string
          created_at: string | null
          id: string
          target_price: number | null
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean | null
          card_id?: string | null
          card_name: string
          created_at?: string | null
          id?: string
          target_price?: number | null
          user_id: string
        }
        Update: {
          alert_enabled?: boolean | null
          card_id?: string | null
          card_name?: string
          created_at?: string | null
          id?: string
          target_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
