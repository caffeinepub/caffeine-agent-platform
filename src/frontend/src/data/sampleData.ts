import type {
  ChatMessage,
  ErrorEntry,
  LogEntry,
  MemoryEntry,
  PlanStep,
  StrategyEntry,
  ToolState,
} from "../types/agent";

const now = Date.now();
const mins = (n: number) => now - n * 60 * 1000;

export const sampleMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content:
      "Analyze the repository structure and identify performance bottlenecks",
    contentType: "text",
    timestamp: mins(45),
    taskType: "analysis",
  },
  {
    id: "msg-2",
    role: "agent",
    content:
      "I've analyzed the repository. Here are the key findings:\n\n**Performance Bottlenecks Identified:**\n- `src/utils/dataProcessor.ts` — O(n²) nested loop on line 142\n- `api/routes/feed.ts` — No pagination on `/feed` endpoint (returns all records)\n- `components/Dashboard.tsx` — Missing `React.memo` on 3 heavy child components\n\nRecommend prioritizing the data processor fix — it's causing 3-4s delays on datasets >10k rows.",
    contentType: "mixed",
    tableData: {
      headers: ["File", "Issue", "Severity", "Est. Fix Time"],
      rows: [
        ["dataProcessor.ts", "O(n²) loop", "Critical", "2h"],
        ["api/feed.ts", "Missing pagination", "High", "1h"],
        ["Dashboard.tsx", "Missing memoization", "Medium", "30m"],
      ],
    },
    timestamp: mins(44),
    taskType: "analysis",
  },
  {
    id: "msg-3",
    role: "user",
    content: "Fix the O(n²) loop in dataProcessor.ts",
    contentType: "text",
    timestamp: mins(30),
    taskType: "coding",
  },
  {
    id: "msg-4",
    role: "agent",
    content:
      "Applied the optimization. Replaced the nested loop with a Map-based lookup for O(n) complexity.",
    contentType: "code",
    codeData: {
      language: "typescript",
      code: `// Before: O(n²)
function findDuplicates(items: Item[]) {
  return items.filter((item, i) =>
    items.findIndex(x => x.id === item.id) !== i
  );
}

// After: O(n) — using Map lookup
function findDuplicates(items: Item[]) {
  const seen = new Map<string, boolean>();
  return items.filter(item => {
    if (seen.has(item.id)) return true;
    seen.set(item.id, true);
    return false;
  });
}`,
    },
    timestamp: mins(28),
    taskType: "coding",
  },
];

export const sampleLogEntries: LogEntry[] = [
  {
    id: "log-1",
    timestamp: mins(45),
    message: "Task received — initiating analysis mode",
    status: "completed",
  },
  {
    id: "log-2",
    timestamp: mins(44),
    message: "Controller classified task as: analysis",
    status: "completed",
  },
  {
    id: "log-3",
    timestamp: mins(43),
    message: "Planner generated 4-step execution plan",
    status: "completed",
  },
  {
    id: "log-4",
    timestamp: mins(30),
    message: "New task: Fix O(n²) loop in dataProcessor.ts",
    status: "completed",
  },
  {
    id: "log-5",
    timestamp: mins(29),
    message: "Executor: Reading file src/utils/dataProcessor.ts",
    status: "completed",
  },
  {
    id: "log-6",
    timestamp: mins(28),
    message: "Executor: Writing optimized implementation",
    status: "completed",
  },
  {
    id: "log-7",
    timestamp: mins(27),
    message: "Verification: Running benchmarks — 10k items: 12ms (was 4200ms)",
    status: "completed",
  },
];

export const samplePlanSteps: PlanStep[] = [
  {
    id: "step-1",
    stepNumber: 1,
    description:
      "Analyze current code structure and identify bottleneck location",
    status: "done",
  },
  {
    id: "step-2",
    stepNumber: 2,
    description: "Design O(n) replacement algorithm using Map data structure",
    status: "done",
  },
  {
    id: "step-3",
    stepNumber: 3,
    description: "Write and apply patch to dataProcessor.ts",
    status: "done",
  },
  {
    id: "step-4",
    stepNumber: 4,
    description: "Run performance benchmarks and verify improvement",
    status: "done",
  },
];

export const sampleErrors: ErrorEntry[] = [
  {
    id: "err-1",
    errorType: "tool-failure",
    message: "GitHub API rate limit exceeded during repository scan",
    timestamp: mins(120),
    resolved: true,
  },
  {
    id: "err-2",
    errorType: "timeout",
    message: "Deployment health check timed out after 30s",
    timestamp: mins(80),
    resolved: true,
  },
  {
    id: "err-3",
    errorType: "parsing",
    message: "Failed to parse TypeScript AST — unexpected token at line 87",
    timestamp: mins(60),
    resolved: true,
  },
  {
    id: "err-4",
    errorType: "logic",
    message: "Infinite loop detected in recursive file traversal",
    timestamp: mins(40),
    resolved: false,
  },
];

export const sampleStrategies: StrategyEntry[] = [
  {
    id: "strat-1",
    timestamp: mins(119),
    changeDescription:
      "After GitHub rate limit error, implemented exponential backoff with jitter",
    beforeStrategy:
      "Direct API calls with immediate retry on failure (no delay)",
    afterStrategy:
      "Exponential backoff: wait 2^n seconds + random jitter before retry, max 3 attempts",
  },
  {
    id: "strat-2",
    timestamp: mins(79),
    changeDescription:
      "Deployment timeout: switched to async polling instead of blocking wait",
    beforeStrategy:
      "Synchronous health check — block execution until deployment responds",
    afterStrategy:
      "Async polling every 5s with 60s total timeout, non-blocking execution continues",
  },
  {
    id: "strat-3",
    timestamp: mins(59),
    changeDescription:
      "AST parse failure: added pre-validation step before full parse",
    beforeStrategy: "Direct full-file TypeScript parse on every analysis task",
    afterStrategy:
      "Pre-validate syntax with lightweight checker, skip full parse if errors detected",
  },
];

export const sampleTools: ToolState[] = [
  { name: "github", label: "GitHub", connected: true, lastSync: mins(5) },
  { name: "deployment", label: "Deployment", connected: false },
  {
    name: "filesystem",
    label: "File System",
    connected: true,
    lastSync: mins(2),
  },
];

export const sampleMemory: MemoryEntry[] = [
  {
    id: "mem-1",
    content:
      "User prefers concise code explanations with before/after comparisons",
    memoryType: "preference",
    timestamp: mins(200),
  },
  {
    id: "mem-2",
    content:
      "Fixed O(n²) bottleneck in dataProcessor.ts — replaced with Map lookup",
    memoryType: "action",
    timestamp: mins(28),
  },
  {
    id: "mem-3",
    content:
      "Analyzed repository: 3 critical issues found, 2 resolved this session",
    memoryType: "session",
    timestamp: mins(44),
  },
  {
    id: "mem-4",
    content:
      "User prefers Caffeine mode for coding tasks, Normal mode for analysis",
    memoryType: "preference",
    timestamp: mins(300),
  },
  {
    id: "mem-5",
    content:
      "GitHub rate limit encountered — backoff strategy applied successfully",
    memoryType: "action",
    timestamp: mins(119),
  },
  {
    id: "mem-6",
    content:
      "Session started. Repository: caffeine-agent-platform, Branch: main",
    memoryType: "session",
    timestamp: mins(400),
  },
];
