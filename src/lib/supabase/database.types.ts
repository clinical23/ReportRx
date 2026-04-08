export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      task_batches: {
        Row: {
          id: string;
          title: string;
          due_at: string | null;
          total_tasks: number;
          completed_tasks: number;
          clinician_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          due_at?: string | null;
          total_tasks?: number;
          completed_tasks?: number;
          clinician_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          due_at?: string | null;
          total_tasks?: number;
          completed_tasks?: number;
          clinician_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_batches_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "clinicians";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          status: string;
          clinician_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          status?: string;
          clinician_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          status?: string;
          clinician_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "clinicians";
            referencedColumns: ["id"];
          },
        ];
      };
      clinician_practices: {
        Row: {
          clinician_id: string;
          practice_id: string;
        };
        Insert: {
          clinician_id: string;
          practice_id: string;
        };
        Update: {
          clinician_id?: string;
          practice_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clinician_practices_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "clinicians";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinician_practices_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      pcns: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clinician_pcns: {
        Row: {
          clinician_id: string;
          pcn_id: string;
        };
        Insert: {
          clinician_id: string;
          pcn_id: string;
        };
        Update: {
          clinician_id?: string;
          pcn_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clinician_pcns_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "clinicians";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinician_pcns_pcn_id_fkey";
            columns: ["pcn_id"];
            isOneToOne: false;
            referencedRelation: "pcns";
            referencedColumns: ["id"];
          },
        ];
      };
      clinicians: {
        Row: {
          id: string;
          name: string;
          role: string;
          created_at: string;
          pcn_name: string | null;
          clinician_type_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          role?: string;
          created_at?: string;
          pcn_name?: string | null;
          clinician_type_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          created_at?: string;
          pcn_name?: string | null;
          clinician_type_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clinicians_clinician_type_id_fkey";
            columns: ["clinician_type_id"];
            isOneToOne: false;
            referencedRelation: "clinician_types";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          role: string;
          full_name: string;
          practice_id: string | null;
          clinician_id: string | null;
        };
        Insert: {
          id: string;
          role: string;
          full_name: string;
          practice_id?: string | null;
          clinician_id?: string | null;
        };
        Update: {
          role?: string;
          full_name?: string;
          practice_id?: string | null;
          clinician_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: true;
            referencedRelation: "clinicians";
            referencedColumns: ["id"];
          },
        ];
      };
      practices: {
        Row: {
          id: string;
          name: string;
          pcn_name: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          pcn_name?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          pcn_name?: string | null;
        };
        Relationships: [];
      };
      activity_categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          practice_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          practice_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          practice_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_categories_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_logs: {
        Row: {
          id: string;
          clinician_id: string;
          practice_id: string;
          log_date: string;
          hours_worked: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          clinician_id: string;
          practice_id: string;
          log_date: string;
          hours_worked?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          clinician_id?: string;
          practice_id?: string;
          log_date?: string;
          hours_worked?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_clinician_id_fkey";
            columns: ["clinician_id"];
            isOneToOne: false;
            referencedRelation: "clinicians";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log_entries: {
        Row: {
          id: string;
          log_id: string;
          category_id: string;
          count: number;
        };
        Insert: {
          id?: string;
          log_id: string;
          category_id: string;
          count: number;
        };
        Update: {
          id?: string;
          log_id?: string;
          category_id?: string;
          count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_entries_log_id_fkey";
            columns: ["log_id"];
            isOneToOne: false;
            referencedRelation: "activity_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_entries_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "activity_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_flags: {
        Row: {
          id: string;
          log_id: string;
          flagged_by: string;
          reason: string;
          status: string;
          resolved_by: string | null;
          resolution_note: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          log_id: string;
          flagged_by: string;
          reason: string;
          status?: string;
          resolved_by?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          log_id?: string;
          flagged_by?: string;
          reason?: string;
          status?: string;
          resolved_by?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_flags_log_id_fkey";
            columns: ["log_id"];
            isOneToOne: false;
            referencedRelation: "activity_logs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_flags_flagged_by_fkey";
            columns: ["flagged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_flags_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      clinician_types: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          key: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          profile_id: string;
          role_id: string;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          role_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          role_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      activity_report: {
        Row: {
          log_id: string;
          log_date: string;
          hours_worked: number | null;
          clinician_name: string;
          practice_name: string;
          category_name: string;
          appointment_count: number;
          practice_id: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type TaskBatch = Database["public"]["Tables"]["task_batches"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Clinician = Database["public"]["Tables"]["clinicians"]["Row"];
