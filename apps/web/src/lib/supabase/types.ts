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
          vercel_access_token: string | null;
          linear_access_token: string | null;
          notion_access_token: string | null;
          slack_access_token: string | null;
          sentry_access_token: string | null;
          sentry_refresh_token: string | null;
          gmail_access_token: string | null;
          gmail_refresh_token: string | null;
          plan: "free" | "pro" | "unlimited";
          subscription_status: "active" | "canceled" | "past_due" | "inactive";
          credits: number;
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
          vercel_access_token?: string | null;
          linear_access_token?: string | null;
          notion_access_token?: string | null;
          slack_access_token?: string | null;
          sentry_access_token?: string | null;
          sentry_refresh_token?: string | null;
          gmail_access_token?: string | null;
          gmail_refresh_token?: string | null;
          plan?: "free" | "pro" | "unlimited";
          subscription_status?: "active" | "canceled" | "past_due" | "inactive";
          credits?: number;
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
          vercel_access_token?: string | null;
          linear_access_token?: string | null;
          notion_access_token?: string | null;
          slack_access_token?: string | null;
          sentry_access_token?: string | null;
          sentry_refresh_token?: string | null;
          gmail_access_token?: string | null;
          gmail_refresh_token?: string | null;
          plan?: "free" | "pro" | "unlimited";
          subscription_status?: "active" | "canceled" | "past_due" | "inactive";
          credits?: number;
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
      payments: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          status: "pending" | "succeeded" | "failed" | "refunded";
          provider: string;
          provider_payment_id: string | null;
          plan: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          status?: "pending" | "succeeded" | "failed" | "refunded";
          provider: string;
          provider_payment_id?: string | null;
          plan?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          status?: "pending" | "succeeded" | "failed" | "refunded";
          provider?: string;
          provider_payment_id?: string | null;
          plan?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage: {
        Row: {
          id: string;
          user_id: string;
          model: string;
          provider: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          endpoint: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          model: string;
          provider: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          endpoint: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          model?: string;
          provider?: string;
          input_tokens?: number;
          output_tokens?: number;
          cost_usd?: number;
          endpoint?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      training_data: {
        Row: {
          id: string;
          user_id: string;
          instruction: string;
          input_context: string;
          output: string;
          model_used: string;
          rating: number | null;
          element_history: string | null;
          design_system_md: string | null;
          framework: string | null;
          file_path: string | null;
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          instruction: string;
          input_context: string;
          output: string;
          model_used: string;
          rating?: number | null;
          element_history?: string | null;
          design_system_md?: string | null;
          framework?: string | null;
          file_path?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          instruction?: string;
          input_context?: string;
          output?: string;
          model_used?: string;
          rating?: number | null;
          element_history?: string | null;
          design_system_md?: string | null;
          framework?: string | null;
          file_path?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_data_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          user_id: string;
          custom_instructions: string;
          pinned_files: string[];
          context_sources: Record<string, boolean>;
          installed_skills: string[];
          skill_contents: Record<string, string>;
          skill_commands: Record<string, unknown>;
          chain_depth: number;
          auto_chain: boolean;
          auto_approve: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          custom_instructions?: string;
          pinned_files?: string[];
          context_sources?: Record<string, boolean>;
          installed_skills?: string[];
          skill_contents?: Record<string, string>;
          skill_commands?: Record<string, unknown>;
          chain_depth?: number;
          auto_chain?: boolean;
          auto_approve?: boolean;
          updated_at?: string;
        };
        Update: {
          custom_instructions?: string;
          pinned_files?: string[];
          context_sources?: Record<string, boolean>;
          installed_skills?: string[];
          skill_contents?: Record<string, string>;
          skill_commands?: Record<string, unknown>;
          chain_depth?: number;
          auto_chain?: boolean;
          auto_approve?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      daily_ai_usage: {
        Row: {
          user_id: string;
          usage_date: string;
          total_input_tokens: number;
          total_output_tokens: number;
          total_cost_usd: number;
          request_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_daily_usage: {
        Args: {
          p_user_id: string;
          p_date: string;
        };
        Returns: {
          total_input_tokens: number;
          total_output_tokens: number;
          total_cost_usd: number;
          request_count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
