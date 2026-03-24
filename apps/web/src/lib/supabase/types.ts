export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          github_id: number;
          github_username: string;
          email: string | null;
          avatar_url: string | null;
          figma_access_token: string | null;
          figma_refresh_token: string | null;
          github_access_token: string | null;
          plan: "free" | "pro" | "unlimited";
          polar_customer_id: string | null;
          polar_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          github_id: number;
          github_username: string;
          email?: string | null;
          avatar_url?: string | null;
          figma_access_token?: string | null;
          figma_refresh_token?: string | null;
          github_access_token?: string | null;
          plan?: "free" | "pro" | "unlimited";
          polar_customer_id?: string | null;
          polar_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          github_id?: number;
          github_username?: string;
          email?: string | null;
          avatar_url?: string | null;
          figma_access_token?: string | null;
          figma_refresh_token?: string | null;
          github_access_token?: string | null;
          plan?: "free" | "pro" | "unlimited";
          polar_customer_id?: string | null;
          polar_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          figma_file_key: string | null;
          figma_file_name: string | null;
          github_owner: string | null;
          github_repo: string | null;
          github_branch: string;
          github_base_path: string;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          figma_file_key?: string | null;
          figma_file_name?: string | null;
          github_owner?: string | null;
          github_repo?: string | null;
          github_branch?: string;
          github_base_path?: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          figma_file_key?: string;
          figma_file_name?: string | null;
          github_owner?: string | null;
          github_repo?: string | null;
          github_branch?: string;
          github_base_path?: string;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mappings: {
        Row: {
          id: string;
          project_id: string;
          figma_node_id: string;
          figma_node_name: string | null;
          code_file_path: string;
          match_method: "naming" | "ai" | "manual";
          confidence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          figma_node_id: string;
          figma_node_name?: string | null;
          code_file_path: string;
          match_method?: "naming" | "ai" | "manual";
          confidence?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          figma_node_id?: string;
          figma_node_name?: string | null;
          code_file_path?: string;
          match_method?: "naming" | "ai" | "manual";
          confidence?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mappings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      edit_history: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          figma_node_id: string | null;
          figma_node_name: string | null;
          file_path: string;
          original_content: string | null;
          modified_content: string | null;
          user_command: string | null;
          ai_explanation: string | null;
          commit_sha: string | null;
          status: "preview" | "applied" | "pushed" | "reverted";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          figma_node_id?: string | null;
          figma_node_name?: string | null;
          file_path: string;
          original_content?: string | null;
          modified_content?: string | null;
          user_command?: string | null;
          ai_explanation?: string | null;
          commit_sha?: string | null;
          status?: "preview" | "applied" | "pushed" | "reverted";
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          figma_node_id?: string | null;
          figma_node_name?: string | null;
          file_path?: string;
          original_content?: string | null;
          modified_content?: string | null;
          user_command?: string | null;
          ai_explanation?: string | null;
          commit_sha?: string | null;
          status?: "preview" | "applied" | "pushed" | "reverted";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "edit_history_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "edit_history_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
