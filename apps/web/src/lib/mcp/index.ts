// ─── MCP Module Public API ──────────────────────────
// 4 core features: Open Hub + Fidelity + Context Mesh + Chain Builder

// #1 Open MCP Hub — Registry
export {
  getPresets,
  registerCustomAdapter,
  connectServer,
  disconnectServer,
  getConnectedServers,
  isConnected,
  executeTool,
  getClaudeTools,
  gatherContextMesh,
  contextMeshToPrompt,
} from "./registry";

// #2 Design Fidelity Checker
export {
  getFidelityTools,
  executeFidelityTool,
} from "./fidelity-checker";

// #3 Context Mesh (exported from registry)

// #4 Tool Chain Builder
export {
  getBuiltinChains,
  executeChain,
  suggestChains,
  createChain,
  getAvailableToolsForChaining,
} from "./chain-builder";

// #5 Agent Bridge — External AI agent integration
export { AgentBridge } from "./agent-bridge";
export type { AgentBridgeContext } from "./agent-bridge";

// Types
export type {
  MCPServerAdapter,
  MCPServerInstance,
  MCPServerPreset,
  MCPAuth,
  MCPTool,
  MCPToolResult,
  MCPContextMesh,
  MCPContextFragment,
  MCPToolChain,
  MCPChainExecutionResult,
  ClaudeToolDef,
  FidelityCheckResult,
  FidelityCheck,
} from "./types";
