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
      bot_users: {
        Row: {
          first_name: string | null
          id: string
          is_banned: boolean
          is_subscribed: boolean
          joined_at: string
          last_active: string
          pending_action: Json | null
          referral_code: string | null
          referred_by: string | null
          telegram_id: number
          total_spent: number
          username: string | null
        }
        Insert: {
          first_name?: string | null
          id?: string
          is_banned?: boolean
          is_subscribed?: boolean
          joined_at?: string
          last_active?: string
          pending_action?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          telegram_id: number
          total_spent?: number
          username?: string | null
        }
        Update: {
          first_name?: string | null
          id?: string
          is_banned?: boolean
          is_subscribed?: boolean
          joined_at?: string
          last_active?: string
          pending_action?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          telegram_id?: number
          total_spent?: number
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          created_by: string | null
          failed_count: number
          fallback_emoji: string | null
          id: string
          message: string
          premium_emoji_id: string | null
          sent_count: number
          status: string
          target: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          failed_count?: number
          fallback_emoji?: string | null
          id?: string
          message: string
          premium_emoji_id?: string | null
          sent_count?: number
          status?: string
          target?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          failed_count?: number
          fallback_emoji?: string | null
          id?: string
          message?: string
          premium_emoji_id?: string | null
          sent_count?: number
          status?: string
          target?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon_emoji: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversions: {
        Row: {
          amount: number
          bot_user_id: string | null
          created_at: string
          id: string
          plan_id: string | null
          status: string
        }
        Insert: {
          amount: number
          bot_user_id?: string | null
          created_at?: string
          id?: string
          plan_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          bot_user_id?: string | null
          created_at?: string
          id?: string
          plan_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversions_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          bot_user_id: string | null
          created_at: string
          delivery_payload: string | null
          id: string
          product_id: string | null
          status: string
          telegram_message_id: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          bot_user_id?: string | null
          created_at?: string
          delivery_payload?: string | null
          id?: string
          product_id?: string | null
          status?: string
          telegram_message_id?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bot_user_id?: string | null
          created_at?: string
          delivery_payload?: string | null
          id?: string
          product_id?: string | null
          status?: string
          telegram_message_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ott_content: {
        Row: {
          category: string | null
          content_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          poster_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          poster_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          poster_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string
          duration_days: number
          features: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days: number
          features?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          features?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          duration_days: number
          fallback_emoji: string | null
          id: string
          image_url: string | null
          name: string
          premium_emoji_id: string | null
          price: number
          slug: string
          sort_order: number
          status: string
          stock: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          fallback_emoji?: string | null
          id?: string
          image_url?: string | null
          name: string
          premium_emoji_id?: string | null
          price?: number
          slug: string
          sort_order?: number
          status?: string
          stock?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          fallback_emoji?: string | null
          id?: string
          image_url?: string | null
          name?: string
          premium_emoji_id?: string | null
          price?: number
          slug?: string
          sort_order?: number
          status?: string
          stock?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_bot_user_id: string
          referrer_bot_user_id: string
          reward_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_bot_user_id: string
          referrer_bot_user_id: string
          reward_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_bot_user_id?: string
          referrer_bot_user_id?: string
          reward_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_bot_user_id_fkey"
            columns: ["referred_bot_user_id"]
            isOneToOne: true
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_bot_user_id_fkey"
            columns: ["referrer_bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          bot_name: string | null
          bot_username: string | null
          id: number
          referral_reward: number
          support_handle: string | null
          updated_at: string
          welcome_text: string | null
        }
        Insert: {
          bot_name?: string | null
          bot_username?: string | null
          id?: number
          referral_reward?: number
          support_handle?: string | null
          updated_at?: string
          welcome_text?: string | null
        }
        Update: {
          bot_name?: string | null
          bot_username?: string | null
          id?: number
          referral_reward?: number
          support_handle?: string | null
          updated_at?: string
          welcome_text?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          from_admin: boolean
          id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_admin?: boolean
          id?: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          bot_user_id: string | null
          created_at: string
          id: string
          last_message: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          bot_user_id?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          bot_user_id?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_product: {
        Args: { _bot_user_id: string; _product_id: string }
        Returns: {
          amount: number
          error: string
          order_id: string
          product_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
