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
      clinicians: {
        Row: {
          id: string;
          name: string;
          role: string;
          active_caseload: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          role?: string;
          active_caseload?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          active_caseload?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: string;
          full_name: string;
          practice_id: string | null;
        };
        Insert: {
          id: string;
          role: string;
          full_name: string;
          practice_id?: string | null;
        };
        Update: {
          role?: string;
          full_name?: string;
          practice_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_practice_id_fkey";
            columns: ["practice_id"];
            isOneToOne: false;
            referencedRelation: "practices";
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
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
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

export type TaskWithClinician = Task & {
  clinicians: { name: string } | null;
};
