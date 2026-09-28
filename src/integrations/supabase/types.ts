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
          rain_day: string | null
          sheets_connected: boolean
          sheets_url: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          admin_pin?: string
          eod_cutoff?: string
          id: number
          rain_day?: string | null
          sheets_connected?: boolean
          sheets_url?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          admin_pin?: string
          eod_cutoff?: string
          id?: number
          rain_day?: string | null
          sheets_connected?: boolean
          sheets_url?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      crew_checkins: {
        Row: {
          checked_in_at: string
          contractor_id: string
          id: string
          local_date: string
        }
        Insert: {
          checked_in_at?: string
          contractor_id: string
          id?: string
          local_date: string
        }
        Update: {
          checked_in_at?: string
          contractor_id?: string
          id?: string
          local_date?: string
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
      fuel_requests: {
        Row: {
          created_at: string
          fuel_level: string | null
          fueled_at: string | null
          fueled_by: string | null
          id: string
          machine_id: string
          note: string | null
          requested_by: string | null
        }
        Insert: {
          created_at?: string
          fuel_level?: string | null
          fueled_at?: string | null
          fueled_by?: string | null
          id?: string
          machine_id: string
          note?: string | null
          requested_by?: string | null
        }
        Update: {
          created_at?: string
          fuel_level?: string | null
          fueled_at?: string | null
          fueled_by?: string | null
          id?: string
          machine_id?: string
          note?: string | null
          requested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_requests_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_requests_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "operators"
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
          custody_since: string | null
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
          custody_since?: string | null
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
          custody_since?: string | null
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
      operator_machines: {
        Row: {
          created_at: string
          machine_id: string
          operator_id: string
        }
        Insert: {
          created_at?: string
          machine_id: string
          operator_id: string
        }
        Update: {
          created_at?: string
          machine_id?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_machines_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_dashboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_machines_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_machines_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_pins: {
        Row: {
          operator_id: string
          pin: string
          updated_at: string
        }
        Insert: {
          operator_id: string
          pin: string
          updated_at?: string
        }
        Update: {
          operator_id?: string
          pin?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_pins_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: true
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          active: boolean
          created_at: string
          fuel_runner: boolean
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          fuel_runner?: boolean
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          fuel_runner?: boolean
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
          valid_date: string
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
          valid_date?: string
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
          valid_date?: string
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
      app_settings_public: {
        Row: {
          eod_cutoff: string | null
          id: number | null
          sheets_connected: boolean | null
          sheets_url: string | null
          timezone: string | null
        }
        Insert: {
          eod_cutoff?: string | null
          id?: number | null
          sheets_connected?: boolean | null
          sheets_url?: string | null
          timezone?: string | null
        }
        Update: {
          eod_cutoff?: string | null
          id?: number | null
          sheets_connected?: boolean | null
          sheets_url?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      machine_dashboard: {
        Row: {
          code: string | null
          current_task_location: string | null
          custody_since: string | null
          do_not_operate: boolean | null
          eod_missing: boolean | null
          fuel_level: string | null
          fuel_logged_date: string | null
          fuel_logged_today: boolean | null
          id: string | null
          last_activity_at: string | null
          last_activity_type: string | null
          last_eod_date: string | null
          last_return_photo_url: string | null
          name: string | null
          needs_fuel: boolean | null
          open_issue: string | null
          open_issue_count: number | null
          rain_today: boolean | null
          required_eod_date: string | null
          responsible_operator: string | null
          return_location: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _eq_check_operator_pin: {
        Args: { p_operator_id: string; p_pin: string }
        Returns: undefined
      }
      _eq_require_pin: { Args: { p_pin: string }; Returns: undefined }
      accept_transfer: {
        Args: {
          p_machine_code: string
          p_operator_name: string
          p_operator_pin?: string
          p_task_location: string
        }
        Returns: Json
      }
      admin_activity: {
        Args: {
          p_machine_code?: string
          p_pin: string
          p_today_only?: boolean
          p_type?: string
        }
        Returns: {
          created_at: string
          from_operator: string
          fuel_level: string
          id: string
          machine_code: string
          machine_name: string
          note: string
          operator: string
          photo_url: string
          task_location: string
          to_operator: string
          type: string
        }[]
      }
      admin_authorizations: {
        Args: { p_pin: string }
        Returns: {
          authorized_by: string
          code: string
          created_at: string
          from_operator: string
          id: string
          machine_code: string
          note: string
          state: string
          to_operator: string
          used_at: string
          valid_date: string
        }[]
      }
      admin_eod_offenders: {
        Args: { p_pin: string }
        Returns: {
          missed: number
          operator: string
        }[]
      }
      admin_force_return: {
        Args: {
          p_by: string
          p_machine_id: string
          p_note: string
          p_pin: string
        }
        Returns: Json
      }
      admin_issues: {
        Args: { p_pin: string }
        Returns: {
          clear_note: string
          cleared_at: string
          cleared_by: string
          created_at: string
          description: string
          id: string
          machine_code: string
          machine_name: string
          photo_url: string
          reporter: string
          status: string
        }[]
      }
      admin_machines: {
        Args: { p_pin: string }
        Returns: {
          active: boolean
          code: string
          do_not_operate: boolean
          eod_missing: boolean
          id: string
          name: string
          open_issue_count: number
          responsible_operator: string
          return_location: string
        }[]
      }
      admin_operator_pins: {
        Args: { p_pin: string }
        Returns: {
          operator_id: string
          pin: string
        }[]
      }
      admin_operators: {
        Args: { p_pin: string }
        Returns: {
          active: boolean
          custody_count: number
          id: string
          name: string
        }[]
      }
      admin_save_machine: {
        Args: {
          p_active: boolean
          p_code: string
          p_id: string
          p_name: string
          p_pin: string
          p_return_location: string
        }
        Returns: Json
      }
      admin_save_operator: {
        Args: { p_active: boolean; p_id: string; p_name: string; p_pin: string }
        Returns: Json
      }
      admin_set_fuel_runner: {
        Args: { p_on: boolean; p_operator_id: string; p_pin: string }
        Returns: Json
      }
      admin_set_operator_machines: {
        Args: {
          p_machine_codes: string[]
          p_operator_id: string
          p_pin: string
        }
        Returns: Json
      }
      admin_set_operator_pin: {
        Args: { p_new_pin: string; p_operator_id: string; p_pin: string }
        Returns: Json
      }
      admin_set_rain_day: {
        Args: { p_on: boolean; p_pin: string }
        Returns: Json
      }
      admin_settings: { Args: { p_pin: string }; Returns: Json }
      check_in_crew: {
        Args: { p_contractor_id: string }
        Returns: {
          checked_in_at: string
          contractor_id: string
          id: string
          local_date: string
        }
        SetofOptions: {
          from: "*"
          to: "crew_checkins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      checkout_machine: {
        Args: {
          p_fuel_level?: string
          p_machine_code: string
          p_operator_name: string
          p_operator_pin?: string
          p_safe_confirmed: boolean
          p_task_location: string
        }
        Returns: Json
      }
      clear_machine_issues: {
        Args: {
          p_clear_note: string
          p_cleared_by: string
          p_issue_ids: string[]
          p_pin: string
        }
        Returns: Json
      }
      complete_fuel_request: {
        Args: {
          p_by: string
          p_fuel_level: string
          p_id: string
          p_pin?: string
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
      eod_missing: {
        Args: {
          p_custody_since: string
          p_in_custody: boolean
          p_last_eod: string
          p_machine_created: string
          p_now?: string
        }
        Returns: boolean
      }
      eod_required_date: { Args: { p_now?: string }; Returns: string }
      eq_cutoff: { Args: never; Returns: string }
      fuel_runners: {
        Args: never
        Returns: {
          name: string
        }[]
      }
      get_transfer_destinations: {
        Args: { p_machine_code: string }
        Returns: {
          to_operator: string
        }[]
      }
      my_pending_transfers: {
        Args: { p_operator_name: string }
        Returns: {
          authorized_by: string
          created_at: string
          from_operator: string
          machine_code: string
          machine_name: string
        }[]
      }
      open_fuel_requests: {
        Args: never
        Returns: {
          created_at: string
          id: string
          machine_code: string
          machine_name: string
          note: string
          requested_by: string
          task_location: string
        }[]
      }
      operator_can_use: {
        Args: { p_machine_id: string; p_operator_id: string }
        Returns: boolean
      }
      operator_machine_access: {
        Args: never
        Returns: {
          machine_code: string
          operator: string
        }[]
      }
      report_machine_issue: {
        Args: {
          p_description: string
          p_machine_code: string
          p_photo_url: string
          p_reporter_name: string
        }
        Returns: Json
      }
      request_fuel: {
        Args: {
          p_machine_code: string
          p_note?: string
          p_operator_name: string
        }
        Returns: Json
      }
      return_machine: {
        Args: {
          p_fuel_level?: string
          p_machine_code: string
          p_note?: string
          p_operator_name: string
          p_parked_confirmed: boolean
          p_photo_url: string
        }
        Returns: Json
      }
      transfer_machine: {
        Args: {
          p_current_operator_name: string
          p_machine_code: string
          p_new_operator_name: string
          p_task_location: string
        }
        Returns: Json
      }
      verify_admin_pin: { Args: { p_pin: string }; Returns: boolean }
      verify_operator_pin: {
        Args: { p_operator_name: string; p_pin: string }
        Returns: boolean
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
