import { ipcMain, safeStorage, BrowserWindow } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";

// ─── Category persona prompts ──────────────────────────────
const CATEGORY_PERSONAS: Record<string, string> = {
  website:
    "You are a senior web developer and UX/UI expert specializing in websites. You know how to build landing pages, blogs, portfolios with modern design (reference: Stripe, Linear, Vercel, Notion). You advise on responsive design, SEO, performance, accessibility, and user experience.",
  app:
    "You are a fullstack app developer and product designer specializing in web applications. You know how to build dashboards, auth flows, CRUD features, real-time UIs (reference: Notion, Figma, GitHub, Slack, Discord). You advise on state management, routing, component architecture, and UX patterns.",
  service:
    "You are a backend architect and API specialist. You know how to design REST/GraphQL APIs, database schemas, auth systems, background jobs (reference: Stripe API, GitHub API, Supabase). You advise on scalability, security, error handling, and deployment.",
  tool:
    "You are a CLI/automation specialist. You know how to build developer tools, CLI apps, scripts, CI/CD pipelines (reference: Vite, ESLint, Prettier, Turborepo). You advise on argument parsing, config management, terminal UX, and distribution.",
};

function getPersonaPrompt(category?: string): string {
  if (!category || !CATEGORY_PERSONAS[category]) return "";
  return `\n\nSPECIALIZATION:\n${CATEGORY_PERSONAS[category]}`;
}

// ─── API Key management (safeStorage, per provider) ──────────
const KEY_DIR = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".meld-keys",
);

function ensureKeyDir() {
  if (!fs.existsSync(KEY_DIR)) fs.mkdirSync(KEY_DIR, { recursive: true });
}

export function getApiKey(provider: string): string | null {
  try {
    const file = path.join(KEY_DIR, provider);
    if (!fs.existsSync(file)) return null;
    const data = fs.readFileSync(file);

    // Try decrypting first (if encrypted)
    if (safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(data);
      } catch {
        // Not encrypted, read as plain text
      }
    }

    // Read as plain text (fallback)
    const text = data.toString("utf-8").trim();
    // Check if it looks like an API key (starts with sk-)
    if (text.startsWith("sk-")) {
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

function setApiKey(provider: string, key: string): boolean {
  try {
    ensureKeyDir();
    const file = path.join(KEY_DIR, provider);
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(file, safeStorage.encryptString(key));
    } else {
      fs.writeFileSync(file, key, "utf-8");
    }
    return true;
  } catch {
    return false;
  }
}

function getAllKeys(): Record<string, string | null> {
  const providers = ["anthropic", "openai", "google", "deepseek", "mistral", "groq", "xai"];
  const result: Record<string, string | null> = {};
  for (const p of providers) {
    const key = getApiKey(p);
    result[p] = key ? "***" + key.slice(-4) : null;
  }
  return result;
}

// ─── Model definitions ─────────────────────────────────────────
interface ModelDef {
  id: string;
  label: string;
  sub: string;
  color: string;
  provider: string; // API key provider
  apiUrl: string;
  modelId: string;
  format: "anthropic" | "openai" | "google";
}

// Model routing strategy:
// - Chat (simple): Haiku 3.5 (cheapest, fast)
// - Agent loop (coding): Sonnet 4 (best coding performance)
// - Complex reasoning: Opus 4 (maximum capability)
const DEFAULT_CHAT_MODEL = "claude-sonnet";
const DEFAULT_AGENT_MODEL = "claude-sonnet";
const DEFAULT_COMPLEX_MODEL = "claude-opus";

const MODELS: ModelDef[] = [
  // Anthropic — tiered by cost/capability
  { id: "claude-haiku", label: "Claude", sub: "Haiku 3.5", color: "#D97757", provider: "anthropic", apiUrl: "https://api.anthropic.com/v1/messages", modelId: "claude-3-5-haiku-latest", format: "anthropic" },
  { id: "claude-sonnet", label: "Claude", sub: "Sonnet 4", color: "#D97757", provider: "anthropic", apiUrl: "https://api.anthropic.com/v1/messages", modelId: "claude-sonnet-4-20250514", format: "anthropic" },
  { id: "claude-opus", label: "Claude", sub: "Opus 4", color: "#D97757", provider: "anthropic", apiUrl: "https://api.anthropic.com/v1/messages", modelId: "claude-opus-4-20250514", format: "anthropic" },
  // OpenAI
  { id: "gpt-4o", label: "GPT", sub: "4o", color: "#10A37F", provider: "openai", apiUrl: "https://api.openai.com/v1/chat/completions", modelId: "gpt-4o", format: "openai" },
  { id: "gpt-4o-mini", label: "GPT", sub: "4o mini", color: "#10A37F", provider: "openai", apiUrl: "https://api.openai.com/v1/chat/completions", modelId: "gpt-4o-mini", format: "openai" },
  { id: "gpt-4.1", label: "GPT", sub: "4.1", color: "#10A37F", provider: "openai", apiUrl: "https://api.openai.com/v1/chat/completions", modelId: "gpt-4.1", format: "openai" },
  { id: "o3-mini", label: "OpenAI", sub: "o3 mini", color: "#10A37F", provider: "openai", apiUrl: "https://api.openai.com/v1/chat/completions", modelId: "o3-mini", format: "openai" },
  // Google
  { id: "gemini-2.5-pro", label: "Gemini", sub: "2.5 Pro", color: "#4285F4", provider: "google", apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent", modelId: "gemini-2.5-pro", format: "google" },
  { id: "gemini-2.5-flash", label: "Gemini", sub: "2.5 Flash", color: "#4285F4", provider: "google", apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", modelId: "gemini-2.5-flash", format: "google" },
  // DeepSeek
  { id: "deepseek-v3", label: "DeepSeek", sub: "V3", color: "#5B6AFF", provider: "deepseek", apiUrl: "https://api.deepseek.com/chat/completions", modelId: "deepseek-chat", format: "openai" },
  { id: "deepseek-r1", label: "DeepSeek", sub: "R1", color: "#5B6AFF", provider: "deepseek", apiUrl: "https://api.deepseek.com/chat/completions", modelId: "deepseek-reasoner", format: "openai" },
  // Mistral
  { id: "mistral-large", label: "Mistral", sub: "Large", color: "#FF7000", provider: "mistral", apiUrl: "https://api.mistral.ai/v1/chat/completions", modelId: "mistral-large-latest", format: "openai" },
  { id: "codestral", label: "Mistral", sub: "Codestral", color: "#FF7000", provider: "mistral", apiUrl: "https://api.mistral.ai/v1/chat/completions", modelId: "codestral-latest", format: "openai" },
  // Groq
  { id: "llama-4-scout", label: "Groq", sub: "Llama 4 Scout", color: "#F55036", provider: "groq", apiUrl: "https://api.groq.com/openai/v1/chat/completions", modelId: "meta-llama/llama-4-scout-17b-16e-instruct", format: "openai" },
  // xAI
  { id: "grok-3", label: "xAI", sub: "Grok 3", color: "#000000", provider: "xai", apiUrl: "https://api.x.ai/v1/chat/completions", modelId: "grok-3", format: "openai" },
  { id: "grok-3-mini", label: "xAI", sub: "Grok 3 mini", color: "#000000", provider: "xai", apiUrl: "https://api.x.ai/v1/chat/completions", modelId: "grok-3-mini", format: "openai" },
];

// ─── API call (branched by format) ──────────────────────────
async function callModel(model: ModelDef, systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = getApiKey(model.provider);
  if (!apiKey) throw new Error(`${model.provider} API key not configured. Please set it in Settings.`);

  if (model.format === "anthropic") {
    const res = await fetch(model.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model.modelId,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`${model.label} API error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }

  if (model.format === "google") {
    const url = `${model.apiUrl}?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });
    if (!res.ok) throw new Error(`${model.label} API error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  // OpenAI-compatible (OpenAI, DeepSeek, Mistral, Groq, xAI, OpenRouter)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const res = await fetch(model.apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: model.modelId,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${model.label} API error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Streaming API call ──────────────────────────────────
async function callModelStream(
  model: ModelDef,
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void
): Promise<string> {
  const apiKey = getApiKey(model.provider);
  if (!apiKey) throw new Error(`${model.provider} API key not configured. Please set it in Settings.`);

  let fullText = "";

  if (model.format === "anthropic") {
    const res = await fetch(model.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model.modelId,
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`${model.label} API error (${res.status}): ${await res.text()}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
              onChunk(parsed.delta.text);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    }
    return fullText;
  }

  if (model.format === "google") {
    // Google doesn't support streaming the same way, fall back to non-streaming
    const url = `${model.apiUrl}?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });
    if (!res.ok) throw new Error(`${model.label} API error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    onChunk(text);
    return text;
  }

  // OpenAI-compatible streaming
  const res = await fetch(model.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model.modelId,
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${model.label} API error (${res.status}): ${await res.text()}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }
  return fullText;
}

// ─── Prompt builder ────────────────────────────────────
function getFrameworkGuidelines(framework: string, deps?: string[]): string {
  const hasDep = (name: string) => deps?.some((d) => d === name || d.startsWith(name + "/"));
  let guide = "";
  switch (framework) {
    case "Next.js": guide += `\n[Next.js]\n- App Router default. Add "use client" when needed.\n- Use next/image, next/link.`; break;
    case "React": guide += `\n[React]\n- Functional components + hooks. useState/useEffect.`; break;
    case "Vue": guide += `\n[Vue]\n- Composition API + <script setup>.`; break;
    case "Angular": guide += `\n[Angular]\n- Standalone components. Injectable.`; break;
    case "Svelte": guide += `\n[Svelte]\n- $: reactive. export let props.`; break;
  }
  if (hasDep("tailwindcss")) guide += `\n- Tailwind CSS: use utility classes.`;
  if (hasDep("@shadcn") || hasDep("shadcn")) guide += `\n- shadcn/ui: reuse existing components.`;
  return guide;
}

interface EditCodeInput {
  filePath: string;
  command: string;
  currentCode: string;
  modelId?: string;
  framework?: string;
  dependencies?: string[];
  designSystemMd?: string;
  elementContext?: string;
}

interface CodeEditResult {
  filePath: string;
  original: string;
  modified: string;
  explanation: string;
}

// ─── Register IPC handlers ──────────────────────────────────
export function registerAiHandlers() {
  // Get model list
  ipcMain.handle("ai:getModels", async () => {
    return MODELS.map((m) => ({
      id: m.id,
      label: m.label,
      sub: m.sub,
      color: m.color,
      provider: m.provider,
      hasKey: !!getApiKey(m.provider),
    }));
  });

  // Get API key (per provider, masked)
  ipcMain.handle("ai:getApiKey", async (_, provider?: string) => {
    if (provider) {
      const key = getApiKey(provider);
      return key ? "***" + key.slice(-4) : null;
    }
    return getAllKeys();
  });

  // Save API key (per provider)
  ipcMain.handle("ai:setApiKey", async (_, provider: string, key: string) => {
    return setApiKey(provider, key);
  });

  // Check if any API key exists (true if any key is set)
  ipcMain.handle("ai:hasApiKey", async () => {
    return ["anthropic", "openai", "google", "deepseek", "mistral", "groq", "xai"]
      .some((p) => !!getApiKey(p));
  });

  // Code edit request
  ipcMain.handle("ai:editCode", async (_, input: EditCodeInput): Promise<CodeEditResult> => {
    const { filePath, command, currentCode, modelId, framework, dependencies, designSystemMd, elementContext } = input;

    // Find model (default: claude-sonnet)
    const model = MODELS.find((m) => m.id === modelId) ?? MODELS.find((m) => m.id === DEFAULT_CHAT_MODEL) ?? MODELS[0];

    let systemExtra = "";
    if (framework && framework !== "unknown") {
      systemExtra += `\nThis project uses ${framework}.`;
      systemExtra += getFrameworkGuidelines(framework, dependencies);
    }
    if (dependencies?.length) {
      systemExtra += `\nAvailable libraries: ${dependencies.join(", ")}`;
    }
    if (designSystemMd) {
      systemExtra += `\n\n--- DESIGN SYSTEM ---\n${designSystemMd}\n--- END DESIGN SYSTEM ---`;
    }
    if (elementContext) {
      systemExtra += `\n\n--- SELECTED ELEMENTS ---\n${elementContext}\n--- END ---`;
    }

    const system = `You are Meld, an AI coding assistant. You help users edit existing code.
${systemExtra}

IMPORTANT RULES:
- If the user asks to modify code AND a file path + code is provided, respond ONLY with this JSON:
  {"filePath":"${filePath}","original":"code before (changed part only)","modified":"code after (changed part only)","explanation":"what changed"}
- If the user is just chatting, asking a question, or no code is provided, respond naturally in plain text. Do NOT return JSON.
- Always be helpful, concise, and friendly.`;

    const user = filePath && currentCode
      ? `File: ${filePath}\n\nCurrent code:\n\`\`\`\n${currentCode}\n\`\`\`\n\nUser: ${command}`
      : command;

    const response = await callModel(model, system, user);

    try {
      // Try to extract JSON block
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(response);
    } catch {
      // JSON parse failed → use AI's text response as explanation
      return { filePath, original: "", modified: "", explanation: response };
    }
  });

  // Generate design system (natural language → JSON)
  ipcMain.handle("ai:generateDesignSystem", async (_, input: { prompt: string; modelId?: string }) => {
    const model = MODELS.find((m) => m.id === input.modelId) ?? MODELS.find((m) => m.id === DEFAULT_CHAT_MODEL) ?? MODELS[0];

    const system = `You are a world-class design system expert.
When the user describes the desired feel/style, generate a perfectly matched design system.

Rules:
- Colors must be harmonious, production-ready combinations
- primary: Main brand color (CTA, emphasis)
- secondary: Supporting color (backgrounds, sub-elements)
- tertiary: Accent color (highlights, notifications)
- fontFamily: Body text font
- headingFamily: Heading font (same as fontFamily if none)
- baseFontSize: Between 14-18
- scale: Typography scale ratio (1.125-1.5)

Respond ONLY with this JSON format (no other text):
{
  "name": "Design system name (short)",
  "primary": "#hex",
  "secondary": "#hex",
  "tertiary": "#hex",
  "fontFamily": "font name",
  "headingFamily": "heading font name",
  "baseFontSize": 16,
  "scale": 1.25
}`;

    const response = await callModel(model, system, input.prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Could not find JSON in AI response");
  });

  // Extract design system from website URL
  ipcMain.handle("ai:extractFromUrl", async (_, input: { url: string; modelId?: string }) => {
    const model = MODELS.find((m) => m.id === input.modelId) ?? MODELS.find((m) => m.id === DEFAULT_CHAT_MODEL) ?? MODELS[0];

    // 1. HTML scraping
    let siteData = `URL: ${input.url}\n`;
    try {
      const res = await fetch(input.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        redirect: "follow",
      });
      const html = await res.text();

      // Meta tags
      const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
      const desc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] ?? "";
      const themeColor = html.match(/<meta[^>]*name="theme-color"[^>]*content="([^"]+)"/i)?.[1] ?? "";
      const msColor = html.match(/<meta[^>]*name="msapplication-TileColor"[^>]*content="([^"]+)"/i)?.[1] ?? "";

      // Collect hex colors (inline styles + style tags)
      const allHex = html.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
      const hexCount: Record<string, number> = {};
      for (const h of allHex) {
        const low = h.toLowerCase();
        if (low === "#000000" || low === "#ffffff" || low === "#f5f5f5" || low === "#333333") continue;
        hexCount[low] = (hexCount[low] ?? 0) + 1;
      }
      const topColors = Object.entries(hexCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([c, n]) => `${c}(${n}x)`);

      // CSS variables
      const cssVars = html.match(/--[\w-]+:\s*#[0-9A-Fa-f]{3,8}/g)?.slice(0, 15) ?? [];

      // Fonts
      const googleFonts = html.match(/fonts\.googleapis\.com\/css2?\?family=([^"&]+)/g)?.map(f => decodeURIComponent(f.replace(/.*family=/, "").replace(/[+:,].*/g, ""))) ?? [];
      const fontFamilies = html.match(/font-family:\s*['"]?([^;'"]+)/gi)?.slice(0, 5) ?? [];

      siteData += `Title: ${title}\nDescription: ${desc}\ntheme-color: ${themeColor}\nmsapplication-TileColor: ${msColor}\n`;
      siteData += `Top colors by frequency: ${topColors.join(", ")}\n`;
      siteData += `CSS variables: ${cssVars.join(", ")}\n`;
      siteData += `Google Fonts: ${googleFonts.join(", ")}\n`;
      siteData += `font-family: ${fontFamilies.join(", ")}\n`;
    } catch {
      siteData += `(Failed to fetch HTML — analyzing from URL only)\n`;
    }

    // 2. AI analysis
    const system = `You are a web design analysis expert.
Analyze the extracted HTML information to accurately identify the website's design system.

Analysis rules:
- If theme-color exists, strongly consider it as primary
- Most frequent non-gray color = primary
- Reference CSS variable names like --primary, --brand, --accent
- secondary: Color used in backgrounds/navigation
- tertiary: Accent/highlight color
- Fonts: Use fonts found in Google Fonts or font-family declarations

Respond ONLY with JSON:
{
  "name": "Site name",
  "primary": "#hex",
  "secondary": "#hex",
  "tertiary": "#hex",
  "fontFamily": "font",
  "headingFamily": "heading font",
  "baseFontSize": 16,
  "scale": 1.25
}`;

    const response = await callModel(model, system, siteData);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Could not find JSON in AI response");
  });

  // Generate short title from user prompt (like Claude's conversation titles)
  ipcMain.handle("ai:generateTitle", async (_, input: { prompt: string; modelId?: string }) => {
    const model = MODELS.find((m) => m.id === input.modelId) ?? MODELS[0]; // Default: Sonnet 4

    const system = `You are a title generator. Generate a SHORT, CONCISE title (2-5 words) that summarizes the user's request.

Rules:
- Maximum 5 words
- Use the same language as the user's input (Korean → Korean title, English → English title)
- Capture the main intent/topic
- No quotes, no punctuation at the end
- Examples:
  - "안녕하세요" → "인사"
  - "포트폴리오 웹사이트 만들어줘" → "포트폴리오 웹사이트"
  - "K-map으로 논리식을 간단히 하는 법 알려줘" → "K-map 논리식 간소화"
  - "Build a todo app with React" → "React Todo App"
  - "Help me debug this function" → "Function Debugging"

Respond ONLY with the title, nothing else.`;

    const response = await callModel(model, system, input.prompt);
    return response.trim().replace(/^["']|["']$/g, "").slice(0, 50);
  });

  // Classify user intent: project creation vs simple chat (LOCAL RULES - no AI call, ~0ms)
  ipcMain.handle("ai:classifyIntent", async (_, input: { prompt: string; modelId?: string }) => {
    const text = input.prompt.toLowerCase().trim();
    console.log("[AI] classifyIntent (local) called with:", text);

    // CREATE keywords (Korean + English)
    const createKeywords = [
      // Korean
      "만들어", "만들어줘", "만들어주세요", "생성", "구현", "구현해", "개발", "빌드",
      "웹사이트", "웹페이지", "앱", "어플", "애플리케이션", "프로젝트",
      "페이지", "컴포넌트", "버튼", "폼", "모달", "사이드바", "헤더", "푸터",
      "API", "서버", "백엔드", "프론트엔드", "데이터베이스",
      "로그인", "회원가입", "대시보드", "관리자", "차트", "테이블",
      // English
      "create", "build", "make", "develop", "implement", "generate", "design",
      "website", "webpage", "app", "application", "project",
      "page", "component", "button", "form", "modal", "sidebar", "header", "footer",
      "api", "server", "backend", "frontend", "database",
      "login", "signup", "dashboard", "admin", "chart", "table",
      "landing", "portfolio", "blog", "ecommerce", "shop", "store",
    ];

    // CHAT keywords (greetings, questions)
    const chatKeywords = [
      // Korean greetings
      "안녕", "하이", "헬로", "반가워", "뭐해", "뭐하니", "어때",
      // Korean questions (without create intent)
      "뭐야", "뭔가요", "알려줘", "설명해", "어떻게", "왜",
      // English greetings
      "hi", "hello", "hey", "what's up", "how are you", "good morning", "good afternoon",
      // English questions
      "what is", "what's", "how do", "why", "explain", "tell me about",
    ];

    // Check for CREATE intent first (higher priority)
    const hasCreateKeyword = createKeywords.some(k => text.includes(k));
    const hasChatKeyword = chatKeywords.some(k => text.includes(k));

    // If has create keyword and not just a question about it
    if (hasCreateKeyword && !text.match(/^(what|뭐|어떻게).*(is|야|인가요|이야)/)) {
      console.log("[AI] classifyIntent result: create (local keyword match)");
      return "create";
    }

    // Short messages are usually chat
    if (text.length < 10 || hasChatKeyword) {
      console.log("[AI] classifyIntent result: chat (short or greeting)");
      return "chat";
    }

    // Default to chat for safety
    console.log("[AI] classifyIntent result: chat (default)");
    return "chat";
  });

  // Simple chat (no project required)
  // Prevent duplicate requests - cache in-flight requests by prompt+model
  const chatInFlight = new Map<string, Promise<string>>();

  ipcMain.handle("ai:chat", async (_, input: { prompt: string; modelId?: string; category?: string; projectContext?: { fileTree?: string[]; framework?: string; dependencies?: string[]; selectedFile?: string; currentCode?: string } }) => {
    console.log("[AI] ai:chat called with:", input.prompt.substring(0, 50), "category:", input.category);

    // Create a key for deduplication (prompt + model)
    const dedupeKey = `${input.prompt}:${input.modelId || "default"}`;

    // If there's already an in-flight request for this exact prompt, return its promise
    if (chatInFlight.has(dedupeKey)) {
      console.log("[AI] ai:chat DEDUPE - returning existing in-flight request");
      return chatInFlight.get(dedupeKey)!;
    }

    const model = MODELS.find((m) => m.id === input.modelId) ?? MODELS[0];
    console.log("[AI] ai:chat using model:", model.id, model.provider);

    const apiKey = getApiKey(model.provider);
    if (!apiKey) {
      console.log("[AI] ai:chat ERROR: No API key for", model.provider);
      throw new Error(`${model.provider} API key not configured. Please set it in Settings.`);
    }
    console.log("[AI] ai:chat API key found for", model.provider);

    const personaSection = getPersonaPrompt(input.category);
    const ctx = input.projectContext;
    let projectSection = "";
    if (ctx?.fileTree?.length) {
      projectSection += `\n\nPROJECT FILES:\n${ctx.fileTree.slice(0, 100).join("\n")}`;
    }
    if (ctx?.framework) {
      projectSection += `\nFRAMEWORK: ${ctx.framework}`;
    }
    if (ctx?.dependencies?.length) {
      projectSection += `\nDEPENDENCIES: ${ctx.dependencies.join(", ")}`;
    }
    if (ctx?.selectedFile) {
      projectSection += `\n\nCURRENTLY SELECTED FILE: ${ctx.selectedFile}`;
      if (ctx.currentCode) {
        projectSection += `\n\`\`\`\n${ctx.currentCode.slice(0, 3000)}\n\`\`\``;
      }
    }

    const system = `You are Meld AI, a coding assistant integrated into an IDE. You have access to the user's project context below. When the user asks to analyze files, continue work, or asks about their code, use this context to give specific, actionable answers.${personaSection}${projectSection}

LANGUAGE RULE (CRITICAL):
- Detect the language of the user's message and respond ONLY in that same language.
- If user writes in Korean, respond entirely in Korean. If user writes in English, respond entirely in English.
- NEVER mix languages. Pick ONE language based on the user's input and stick to it.

Be helpful, concise, and actionable. Reference specific files and code when relevant.`;

    // Create the promise and store it in the cache
    const chatPromise = (async () => {
      try {
        console.log("[AI] ai:chat calling model...");
        const response = await callModel(model, system, input.prompt);
        console.log("[AI] ai:chat response received, length:", response?.length);
        return response;
      } catch (err) {
        console.error("[AI] ai:chat error:", err);
        throw err;
      } finally {
        // Remove from cache after completion (success or failure)
        chatInFlight.delete(dedupeKey);
      }
    })();

    // Store the promise in the cache
    chatInFlight.set(dedupeKey, chatPromise);

    return chatPromise;
  });

  // Streaming chat (sends chunks via IPC event)
  ipcMain.handle("ai:chatStream", async (event, input: { prompt: string; modelId?: string; streamId: string; category?: string }) => {
    const model = MODELS.find((m) => m.id === input.modelId) ?? MODELS[0]; // Default: Sonnet 4
    const win = BrowserWindow.fromWebContents(event.sender);

    const personaSection = getPersonaPrompt(input.category);
    const system = `You are Meld AI, a friendly coding assistant.${personaSection}

LANGUAGE RULE (CRITICAL):
- Detect the language of the user's message and respond ONLY in that same language.
- If user writes in Korean, respond entirely in Korean. If user writes in English, respond entirely in English.
- NEVER mix languages. Pick ONE language based on the user's input and stick to it.

Be helpful, concise, and friendly. If the user wants to create a project, suggest they describe what they want to build.`;

    try {
      const fullText = await callModelStream(model, system, input.prompt, (chunk) => {
        // Send each chunk to renderer
        win?.webContents.send("ai:streamChunk", { streamId: input.streamId, chunk, done: false });
      });
      // Send completion signal
      win?.webContents.send("ai:streamChunk", { streamId: input.streamId, chunk: "", done: true, fullText });
      return { success: true, fullText };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      win?.webContents.send("ai:streamChunk", { streamId: input.streamId, chunk: "", done: true, error: errMsg });
      return { success: false, error: errMsg };
    }
  });
}
