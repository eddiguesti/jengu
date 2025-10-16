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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          business_name: string | null
          city: string | null
          country: string | null
          createdat: string | null
          currency: string | null
          id: string
          latitude: number | null
          longitude: number | null
          property_type: string | null
          timezone: string | null
          updatedat: string | null
          userid: string
        }
        Insert: {
          business_name?: string | null
          city?: string | null
          country?: string | null
          createdat?: string | null
          currency?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          property_type?: string | null
          timezone?: string | null
          updatedat?: string | null
          userid: string
        }
        Update: {
          business_name?: string | null
          city?: string | null
          country?: string | null
          createdat?: string | null
          currency?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          property_type?: string | null
          timezone?: string | null
          updatedat?: string | null
          userid?: string
        }
        Relationships: []
      }
      "Jengus historical data": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      pricing_data: {
        Row: {
          bookings: number | null
          createdAt: string
          date: string
          dayOfWeek: number | null
          extraData: Json | null
          holidayName: string | null
          id: string
          isHoliday: boolean | null
          isWeekend: boolean | null
          month: number | null
          occupancy: number | null
          precipitation: number | null
          price: number | null
          propertyId: string
          season: string | null
          sunshineHours: number | null
          temperature: number | null
          weatherCondition: string | null
        }
        Insert: {
          bookings?: number | null
          createdAt?: string
          date: string
          dayOfWeek?: number | null
          extraData?: Json | null
          holidayName?: string | null
          id: string
          isHoliday?: boolean | null
          isWeekend?: boolean | null
          month?: number | null
          occupancy?: number | null
          precipitation?: number | null
          price?: number | null
          propertyId: string
          season?: string | null
          sunshineHours?: number | null
          temperature?: number | null
          weatherCondition?: string | null
        }
        Update: {
          bookings?: number | null
          createdAt?: string
          date?: string
          dayOfWeek?: number | null
          extraData?: Json | null
          holidayName?: string | null
          id?: string
          isHoliday?: boolean | null
          isWeekend?: boolean | null
          month?: number | null
          occupancy?: number | null
          precipitation?: number | null
          price?: number | null
          propertyId?: string
          season?: string | null
          sunshineHours?: number | null
          temperature?: number | null
          weatherCondition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_data_propertyId_fkey"
            columns: ["propertyId"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          columns: number
          id: string
          name: string
          originalName: string
          rows: number
          size: number
          status: string
          updatedAt: string
          uploadedAt: string
          userId: string
        }
        Insert: {
          columns: number
          id: string
          name: string
          originalName: string
          rows: number
          size: number
          status?: string
          updatedAt?: string
          uploadedAt?: string
          userId: string
        }
        Update: {
          columns?: number
          id?: string
          name?: string
          originalName?: string
          rows?: number
          size?: number
          status?: string
          updatedAt?: string
          uploadedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          createdAt: string
          email: string
          id: string
          name: string | null
          updatedAt: string
        }
        Insert: {
          avatar?: string | null
          createdAt?: string
          email: string
          id: string
          name?: string | null
          updatedAt?: string
        }
        Update: {
          avatar?: string | null
          createdAt?: string
          email?: string
          id?: string
          name?: string | null
          updatedAt?: string
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
