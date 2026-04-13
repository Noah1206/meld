// ─── Meld AI Agent Protocol ──────────────────────────
// Event & type definitions for the Claude tool_use-based agent loop

// Tool definitions for the agent (Claude tool_use schema)
export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Agent → renderer streaming events
export type AgentEvent =
  | { type: "thinking"; content: string }
  | { type: "tool_call"; toolName: string; input: Record<string, unknown>; toolCallId: string }
  | { type: "tool_result"; toolCallId: string; result: string; isError: boolean }
  | { type: "file_read"; filePath: string; preview: string }
  | { type: "file_edit"; toolCallId: string; filePath: string; original: string; modified: string; explanation: string }
  | { type: "file_edit_auto"; filePath: string; explanation: string }
  | { type: "file_created"; filePath: string }
  | { type: "command_start"; command: string; cwd: string }
  | { type: "command_output"; data: string }
  | { type: "command_done"; command: string; exitCode: number }
  | { type: "message"; content: string }
  | { type: "done"; summary: string }
  | { type: "error"; message: string }
  | { type: "cancelled" }
  | { type: "awaiting_approval"; editCount: number }
  | { type: "rollback_available"; sessionId: string; fileCount: number; files: string[] }
  | { type: "rollback_complete"; rolledBack: string[]; errors: string[] }
  | { type: "mcp_connect_required"; toolName: string; message: string }
  // Autonomous agent events
  | { type: "agent_plan"; plan: AgentPlan }
  | { type: "agent_plan_progress"; stepIndex: number; status: "running" | "done" | "error" }
  | { type: "agent_question"; question: AgentQuestion }
  | { type: "agent_service_request"; request: ServiceRequest }
  | { type: "agent_complete"; summary: AgentCompleteSummary }
  | { type: "preview_check"; screenshot: string; analysis: string };

// ─── Autonomous Agent Types ──────────────────────────

export interface AgentPlan {
  title: string;
  techStack: { area: string; choice: string; reason: string }[];
  dbSchema?: { table: string; columns: string; notes: string }[];
  phases: { name: string; steps: string[]; estimatedMinutes: number }[];
  servicesNeeded: { service: string; reason: string }[];
  packagesNeeded: string[];
}

export interface AgentQuestion {
  id: string;
  question: string;
  inputType: "choice" | "text" | "secret" | "confirm";
  options?: string[];
  context?: string;
}

export interface ServiceRequest {
  id: string;
  serviceId: string;
  serviceName: string;
  reason: string;
  credentials: { key: string; label: string; placeholder: string; isSecret: boolean }[];
}

export interface AgentCompleteSummary {
  filesCreated: string[];
  filesModified: string[];
  packagesInstalled: string[];
  servicesConnected: string[];
  previewVerified: boolean;
  notes: string;
}

// Agent session status
export type AgentSessionStatus =
  | "idle"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "error"
  | "cancelled";

// Pending file edit
export interface PendingEdit {
  toolCallId: string;
  filePath: string;
  original: string;
  modified: string;
  explanation: string;
  status: "pending" | "approved" | "rejected";
}

// Agent loop start input
export interface AgentLoopInput {
  command: string;
  modelId?: string;
  context?: {
    selectedFile?: string;
    currentCode?: string;
    framework?: string;
    dependencies?: string[];
    designSystemMd?: string;
    fileTree?: string[];
    elementHistory?: string[];
    /** Related files content keyed by relative path (imports/dependents of selectedFile) */
    nearbyFiles?: Record<string, string>;
    /** Custom instructions from Super-Context settings */
    customInstructions?: string;
    /** Installed skills content (concatenated rules) */
    skillsContent?: string;
    /** Behavioral preferences (e.g. "prefers tailwind +0.8, avoids css-modules -0.6") */
    preferences?: string;
    /** Recent terminal logs for error context */
    terminalLogs?: string;
    /** Connected MCP services summary */
    connectedServices?: string;
    /** Project category for AI persona specialization */
    category?: string;
  };
}

// ─── Tool definitions (passed to Claude) ───────────────────────

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "read_file",
    description: "Read the contents of a file. Always read before editing.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file. The user will review changes before applying.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" },
        content: { type: "string", description: "Full file content to write" },
        explanation: { type: "string", description: "Brief explanation of what changed and why" },
      },
      required: ["path", "content", "explanation"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory. Use to understand project structure.",
    input_schema: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Relative directory path (default: project root)" },
        pattern: { type: "string", description: "Glob pattern to filter (e.g. '*.tsx')" },
      },
    },
  },
  {
    name: "search_files",
    description: "Search for a text pattern across project files. Like grep.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (regex supported)" },
        glob: { type: "string", description: "File pattern to search in (e.g. 'src/**/*.ts')" },
        maxResults: { type: "number", description: "Max results to return (default: 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "run_command",
    description: "Execute a shell command in the project directory. Use for npm install, git, build tools, etc.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for information. Use to find design references, documentation, API examples, or any knowledge needed for the task.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (e.g. 'Stripe landing page design', 'React table component best practices')" },
        maxResults: { type: "number", description: "Number of results (default: 5, max: 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "mcp_tool",
    description: "Execute a connected MCP service tool. Available services include GitHub (repos, issues, PRs), Figma (design files, components), Vercel (deployments), Supabase (database), Sentry (errors), Linear (issues), Notion (pages), Slack (messages), and more. Check connectedServices in context to see what's available. If a service is not connected, this tool will return an error suggesting the user connect it.",
    input_schema: {
      type: "object",
      properties: {
        toolName: { type: "string", description: "MCP tool name (e.g. 'figma_get_file', 'github_list_repos', 'supabase_query')" },
        args: { type: "object", description: "Tool-specific arguments" },
      },
      required: ["toolName"],
    },
  },
  {
    name: "browse_url",
    description: "Open a URL, take a screenshot, and analyze the visual design with AI vision. Returns page content as markdown AND a detailed visual analysis (layout, colors, typography, components, spacing). Use to study websites, analyze UI patterns, or gather design references.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL to browse (e.g. 'https://stripe.com')" },
        analyzeAs: { type: "string", description: "What to focus the visual analysis on (e.g. 'landing page hero section', 'pricing table design', 'navigation pattern')" },
      },
      required: ["url"],
    },
  },

  // ─── Autonomous Agent Tools ────────────────────────

  {
    name: "ask_user",
    description: "Ask the user a question when you need their input. Use for: business decisions (auth method, pricing model), design preferences (color scheme, layout), secrets/credentials (API keys), or confirmation of irreversible actions (deploy, delete). Do NOT ask for things you can decide yourself as a senior developer.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Clear question for the user" },
        input_type: {
          type: "string",
          enum: ["choice", "text", "secret", "confirm"],
          description: "choice: show options for user to pick, text: free-form input, secret: masked input for API keys/passwords, confirm: yes/no",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Options to choose from (only for input_type=choice)",
        },
        context: { type: "string", description: "Why this decision matters — helps the user decide" },
      },
      required: ["question", "input_type"],
    },
  },
  {
    name: "request_mcp_connection",
    description: "Request the user to connect an external service via MCP. Use when your plan requires a service that is not yet connected (database, payment, hosting, etc). The user will be prompted to enter credentials inline.",
    input_schema: {
      type: "object",
      properties: {
        service_id: {
          type: "string",
          description: "Service to connect: supabase, github, vercel, stripe, toss-payments, portone, sentry, linear, notion, slack, gmail, canva, filesystem, custom_http",
        },
        reason: { type: "string", description: "Why this service is needed for the current task" },
        required_credentials: {
          type: "array",
          items: { type: "string" },
          description: "List of credential keys needed (e.g. ['api_key', 'project_url'])",
        },
      },
      required: ["service_id", "reason"],
    },
  },
  {
    name: "check_preview",
    description: "Capture a screenshot of the live preview and analyze it with AI vision. Use AFTER making code changes to verify the result visually. Returns whether the expected UI is rendering correctly.",
    input_schema: {
      type: "object",
      properties: {
        check_description: {
          type: "string",
          description: "What to verify in the screenshot (e.g. 'login form is visible with email and password fields', 'chart displays 5 data points')",
        },
      },
      required: ["check_description"],
    },
  },
  {
    name: "set_env_variable",
    description: "Set an environment variable in the project's .env file. Use after receiving a value from ask_user(secret) or when generating values like random secrets.",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Variable name (e.g. SUPABASE_URL, STRIPE_SECRET_KEY)" },
        value: { type: "string", description: "Variable value" },
        is_secret: { type: "boolean", description: "If true, the value is masked in logs" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "run_and_check",
    description: "Execute a command and automatically determine success/failure from the output. If auto_retry is true and the command fails, analyze the error and attempt to fix it automatically (up to 3 retries). Use for npm install, build, test, lint commands.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        success_pattern: { type: "string", description: "String that indicates success in output (e.g. 'compiled successfully', 'All tests passed')" },
        failure_pattern: { type: "string", description: "String that indicates failure (e.g. 'ERROR', 'FAIL', 'error TS')" },
        auto_retry: { type: "boolean", description: "If true, automatically diagnose and fix errors, then retry (max 3 times)" },
      },
      required: ["command"],
    },
  },
  {
    name: "deploy_preview",
    description: "Deploy the project to a preview URL for sharing. Uses connected Vercel MCP or generates a shareable preview link.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Deploy description/commit message" },
      },
    },
  },

  // ─── Browser Automation Tools ────────────────────

  {
    name: "browser_open",
    description: "Open a URL in a headless browser. Returns page title, screenshot (base64), and page content. Use this to verify deployed sites, test web apps, or gather visual references.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to open" },
        wait_for: { type: "string", description: "CSS selector to wait for before capturing (optional)" },
        viewport: {
          type: "object",
          properties: {
            width: { type: "number" },
            height: { type: "number" },
          },
          description: "Viewport size (default: 1280x720)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_click",
    description: "Click an element on the currently open browser page. Use CSS selector or text content to identify the element.",
    input_schema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of element to click (e.g. 'button.submit', '#login-btn')" },
        text: { type: "string", description: "Click element containing this text (alternative to selector)" },
      },
    },
  },
  {
    name: "browser_type",
    description: "Type text into an input field on the currently open browser page.",
    input_schema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the input field" },
        text: { type: "string", description: "Text to type" },
        clear_first: { type: "boolean", description: "Clear existing text before typing (default: true)" },
      },
      required: ["selector", "text"],
    },
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the current browser page. Returns base64 PNG + optional Vision AI analysis.",
    input_schema: {
      type: "object",
      properties: {
        analyze: { type: "string", description: "What to analyze in the screenshot (triggers Claude Vision). Leave empty for raw screenshot only." },
        full_page: { type: "boolean", description: "Capture full page vs viewport only (default: false)" },
      },
    },
  },
  {
    name: "browser_evaluate",
    description: "Execute JavaScript code in the browser page context. Use for extracting data, checking DOM state, or running custom logic.",
    input_schema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute in the page. Must return a value (use return statement)." },
      },
      required: ["script"],
    },
  },
  {
    name: "browser_scroll",
    description: "Scroll the browser page.",
    input_schema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["up", "down", "top", "bottom"], description: "Scroll direction" },
        amount: { type: "number", description: "Pixels to scroll (default: 500)" },
        selector: { type: "string", description: "Scroll within a specific element (CSS selector)" },
      },
      required: ["direction"],
    },
  },
];
