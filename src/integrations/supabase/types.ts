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
          authorization_id: string | null
          created_at: string
          do_not_operate_confirmed: boolean | null
          from_operator_id: string | null
          fuel_level: string | null
          id: string
          machine_id: string
          note: string | null
          operator_id: string | null
          photo_url: string | null
          safe_option_confirmed: boolean | null
          task_location: string | null
          to_operator_id: string | null
          type: string
        }
        Insert: {
          authorization_id?: string | null
          created_at?: string
          do_not_operate_confirmed?: boolean | null
          from_operator_id?: string | null
          fuel_level?: string | null
          id?: string
          machine_id: string
          note?: string | null
          operator_id?: string | null
          photo_url?: string | null
          safe_option_confirmed?: boolean | null
          task_location?: string | null
          to_operator_id?: string | null
          type: string
        }
        Update: {
          authorization_id?: string | null
          created_at?: string
          do_not_operate_confirmed?: boolean | null
          from_operator_id?: string | null
          fuel_level?: string | null
          id?: string
          machine_id?: string
          note?: string | null
          operator_id?: string | null
          photo_url?: string | null
          safe_option_confirmed?: boolean | null
          task_location?: string | null
          to_operator_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "transfer_authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_from_operator_id_fkey"
            columns: ["from_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_to_operator_id_fkey"
            columns: ["to_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          admin_pin: string
          eod_cutoff: string
          id: number
          sheets_connected: boolean
          sheets_url: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          admin_pin?: string
          eod_cutoff?: string
          id: number
          sheets_connected?: boolean
          sheets_url?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          admin_pin?: string
          eod_cutoff?: string
          id?: number
          sheets_connected?: boolean
          sheets_url?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment_assets: {
        Row: {
          category: string
          code: string
          created_at: string
          id: string
          name: string
          notes: string
          status: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          status?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          status?: string
        }
        Relationships: []
      }
      equipment_events: {
        Row: {
          asset_id: string
          created_at: string
          house: string
          id: string
          note: string
          photo_path: string | null
          severity: string
          to_worker: string
          type: string
          worker: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          house?: string
          id?: string
          note?: string
          photo_path?: string | null
          severity?: string
          to_worker?: string
          type: string
          worker?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          house?: string
          id?: string
          note?: string
          photo_path?: string | null
          severity?: string
          to_worker?: string
          type?: string
          worker?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "equipment_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          clear_note: string | null
          cleared_at: string | null
          cleared_by: string | null
          created_at: string
          description: string
          id: string
          machine_id: string
          photo_url: string | null
          reporter_id: string | null
          status: string
        }
        Insert: {
          clear_note?: string | null
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          description: string
          id?: string
          machine_id: string
          photo_url?: string | null
          reporter_id?: string | null
          status?: string
        }
        Update: {
          clear_note?: string | null
          cleared_at?: string | null
          cleared_by?: string | null
          created_at?: string
          description?: string
          id?: string
          machine_id?: string
          photo_url?: string | null
          reporter_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          active: boolean
          code: string
          created_at: string
          current_operator_id: string | null
          current_task_location: string | null
          do_not_operate: boolean
          fuel_level: string | null
          fuel_logged_date: string | null
          id: string
          last_activity_at: string | null
          last_activity_type: string | null
          last_eod_date: string | null
          last_return_photo_url: string | null
          name: string
          return_location: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          current_operator_id?: string | null
          current_task_location?: string | null
          do_not_operate?: boolean
          fuel_level?: string | null
          fuel_logged_date?: string | null
          id?: string
          last_activity_at?: string | null
          last_activity_type?: string | null
          last_eod_date?: string | null
          last_return_photo_url?: string | null
          name: string
          return_location?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          current_operator_id?: string | null
          current_task_location?: string | null
          do_not_operate?: boolean
          fuel_level?: string | null
          fuel_logged_date?: string | null
          id?: string
          last_activity_at?: string | null
          last_activity_type?: string | null
          last_eod_date?: string | null
          last_return_photo_url?: string | null
          name?: string
          return_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_current_operator_id_fkey"
            columns: ["current_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      transfer_authorizations: {
        Row: {
          authorized_by: string
          code: string
          created_at: string
          from_operator_id: string
          id: string
          machine_id: string
          note: string | null
          to_operator_id: string
          used_at: string | null
        }
        Insert: {
          authorized_by: string
          code: string
          created_at?: string
          from_operator_id: string
          id?: string
          machine_id: string
          note?: string | null
          to_operator_id: string
          used_at?: string | null
        }
        Update: {
          authorized_by?: string
          code?: string
          created_at?: string
          from_operator_id?: string
          id?: string
          machine_id?: string
          note?: string | null
          to_operator_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_authorizations_from_operator_id_fkey"
            columns: ["from_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_authorizations_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_authorizations_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_authorizations_to_operator_id_fkey"
            columns: ["to_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      machine_dashboard: {
        Row: {
          code: string | null
          current_task_location: string | null
          fuel_level: string | null
          fuel_logged_date: string | null
          id: string | null
          last_activity_at: string | null
          last_eod_date: string | null
          last_return_photo_url: string | null
          name: string | null
          needs_fuel: boolean | null
          open_issue: string | null
          responsible_operator: string | null
          return_location: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      checkout_machine: {
        Args: {
          p_fuel_level?: string
          p_machine_code: string
          p_operator_name: string
          p_safe_confirmed: boolean
          p_task_location: string
        }
        Returns: Json
      }
      clear_machine_issue: {
        Args: {
          p_clear_note: string
          p_cleared_by: string
          p_machine_code: string
          p_pin: string
        }
        Returns: Json
      }
      create_transfer_authorization: {
        Args: {
          p_authorized_by: string
          p_machine_code: string
          p_new_operator_name: string
          p_note?: string
          p_pin?: string
        }
        Returns: Json
      }
      report_machine_issue: {
        Args: {
          p_description: string
          p_do_not_operate_confirmed: boolean
          p_machine_code: string
          p_photo_url: string
          p_reporter_name: string
        }
        Returns: Json
      }
      return_machine: {
        Args: {
          p_fuel_level?: string
          p_machine_code: string
          p_note?: string
          p_operator_name: string
          p_photo_url: string
        }
        Returns: Json
      }
      transfer_machine: {
        Args: {
          p_authorization_confirmed: boolean
          p_current_operator_name: string
          p_machine_code: string
          p_new_operator_name: string
          p_task_location: string
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
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
