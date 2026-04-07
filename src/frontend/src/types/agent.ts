export type AgentMode = "caffeine" | "normal" | "deep";
export type ModuleName =
  | "chat"
  | "controller"
  | "planner"
  | "executor"
  | "tools"
  | "memory"
  | "self-improvement"
  | "files"
  | "integrations"
  | "ai-models"
  | "code-gen"
  | "github";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  contentType: "text" | "table" | "code" | "mixed";
  tableData?: { headers: string[]; rows: string[][] };
  codeData?: { language: string; code: string };
  timestamp: number;
  taskType?: "analysis" | "coding" | "deployment" | "search";
  isStreaming?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  status: "running" | "completed" | "error";
}

export interface PlanStep {
  id: string;
  stepNumber: number;
  description: string;
  status: "pending" | "in-progress" | "done" | "error";
}

export interface ErrorEntry {
  id: string;
  errorType: "timeout" | "parsing" | "tool-failure" | "logic";
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface StrategyEntry {
  id: string;
  timestamp: number;
  changeDescription: string;
  beforeStrategy: string;
  afterStrategy: string;
}

export interface ToolState {
  name: "github" | "deployment" | "filesystem";
  label: string;
  connected: boolean;
  lastSync?: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  memoryType: "action" | "preference" | "session";
  timestamp: number;
}
