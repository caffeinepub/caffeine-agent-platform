import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Activity, Brain, Cpu, Target, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { AgentMode, ChatMessage, LogEntry } from "../types/agent";

interface ControllerPanelProps {
  messages: ChatMessage[];
  mode: AgentMode;
  lastTaskType: string;
  isExecuting: boolean;
  logEntries: LogEntry[];
  model: "claude" | "groq" | "none";
}

const taskTypeConfig = {
  analysis: {
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    label: "Analysis",
  },
  coding: {
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
    label: "Coding",
  },
  deployment: {
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    label: "Deployment",
  },
  search: {
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    label: "Search",
  },
};

const modeDescriptions = {
  caffeine: {
    label: "Caffeine Mode",
    color: "text-orange-400",
    description:
      "Maximum execution speed. Tasks are prioritized for throughput. Safety checks minimized for aggressive parallel execution. Best for repetitive or well-understood tasks.",
    traits: [
      "Parallel task execution",
      "Minimal validation steps",
      "Pre-cached tool calls",
      "Speed over precision",
    ],
  },
  normal: {
    label: "Normal Mode",
    color: "text-blue-400",
    description:
      "Balanced execution with safety checks. Standard reasoning pipeline with appropriate validation at each step. Suitable for most tasks.",
    traits: [
      "Sequential plan execution",
      "Standard validation",
      "Balanced speed/accuracy",
      "Error recovery enabled",
    ],
  },
  deep: {
    label: "Deep Mode",
    color: "text-purple-400",
    description:
      "Full context reasoning with extended analysis. Multi-pass evaluation with cross-referencing. Slower but highest accuracy for complex or ambiguous tasks.",
    traits: [
      "Multi-pass reasoning",
      "Cross-reference analysis",
      "Exhaustive validation",
      "Accuracy over speed",
    ],
  },
};

const modelBadgeConfig = {
  claude: {
    label: "Claude 3.5 Sonnet",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  groq: {
    label: "Groq / Llama3-70B",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  none: {
    label: "No Model",
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-border",
  },
};

export function ControllerPanel({
  messages,
  mode,
  lastTaskType,
  isExecuting,
  logEntries,
  model,
}: ControllerPanelProps) {
  const modeInfo = modeDescriptions[mode];
  const modelInfo = modelBadgeConfig[model];
  const userMessages = messages.filter((m) => m.role === "user" && m.taskType);
  const taskTypeCounts = userMessages.reduce<Record<string, number>>(
    (acc, m) => {
      if (m.taskType) acc[m.taskType] = (acc[m.taskType] || 0) + 1;
      return acc;
    },
    {},
  );

  const totalTasks = userMessages.length;
  const recentLogs = logEntries.slice(-5);
  const logBottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logEntries.length]);

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      data-ocid="controller.panel"
    >
      <div className="px-6 py-4 border-b border-border bg-card/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">Controller — Main Brain</h2>
          </div>
          {isExecuting && (
            <span className="flex items-center gap-1.5 text-xs text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Executing...
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Understands user input, decides task type, and manages execution
          orchestration.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Live Status Row */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Live Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Active Model */}
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Active Model
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded border",
                    modelInfo.color,
                    modelInfo.bg,
                    modelInfo.border,
                  )}
                  data-ocid="controller.model.toggle"
                >
                  <Zap className="w-3 h-3" />
                  {modelInfo.label}
                </span>
              </div>

              {/* Last Task Type */}
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Last Task
                </p>
                {lastTaskType ? (
                  <span
                    className={cn(
                      "inline-flex items-center text-xs font-mono px-2 py-1 rounded border",
                      taskTypeConfig[
                        lastTaskType as keyof typeof taskTypeConfig
                      ]?.color || "text-muted-foreground",
                      taskTypeConfig[
                        lastTaskType as keyof typeof taskTypeConfig
                      ]?.bg || "bg-muted/30",
                      taskTypeConfig[
                        lastTaskType as keyof typeof taskTypeConfig
                      ]?.border || "border-border",
                    )}
                  >
                    {taskTypeConfig[lastTaskType as keyof typeof taskTypeConfig]
                      ?.label || lastTaskType}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    None yet
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Live Log Feed */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Live Execution Feed
            </h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  controller.log
                </span>
                {isExecuting && (
                  <span className="ml-auto text-[10px] text-orange-400 animate-pulse font-mono">
                    LIVE
                  </span>
                )}
              </div>
              <div className="p-3 font-mono space-y-1 min-h-[80px] max-h-48 overflow-y-auto">
                {recentLogs.length === 0 ? (
                  <p
                    className="text-[11px] text-muted-foreground py-4 text-center"
                    data-ocid="controller.empty_state"
                  >
                    Waiting for execution...
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {recentLogs.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        data-ocid={`controller.item.${i + 1}`}
                        className="flex items-start gap-2 text-[11px]"
                      >
                        <span
                          className={cn(
                            "shrink-0 font-bold",
                            entry.status === "running"
                              ? "text-orange-400"
                              : entry.status === "error"
                                ? "text-red-400"
                                : "text-green-400",
                          )}
                        >
                          {entry.status === "running"
                            ? "▶"
                            : entry.status === "error"
                              ? "✕"
                              : "✓"}
                        </span>
                        <span
                          className={cn(
                            entry.status === "running"
                              ? "text-orange-300"
                              : entry.status === "error"
                                ? "text-red-400"
                                : "text-foreground/80",
                          )}
                        >
                          {entry.message}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                <div ref={logBottomRef} />
              </div>
            </div>
          </section>

          {/* Current Mode */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Current Mode
            </h3>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {mode === "caffeine" && (
                  <Zap className="w-5 h-5 text-orange-400" />
                )}
                {mode === "normal" && <Cpu className="w-5 h-5 text-blue-400" />}
                {mode === "deep" && (
                  <Brain className="w-5 h-5 text-purple-400" />
                )}
                <span className={cn("font-bold text-base", modeInfo.color)}>
                  {modeInfo.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {modeInfo.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {modeInfo.traits.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-1 rounded bg-muted/30 border border-border text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Decision Reasoning */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Decision Reasoning
            </h3>
            {userMessages.length === 0 ? (
              <div
                className="bg-card border border-border rounded-xl p-6 text-center"
                data-ocid="controller.reasoning.empty_state"
              >
                <p className="text-sm text-muted-foreground">
                  No tasks processed yet. Send a message to see controller
                  reasoning.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userMessages
                  .slice(-5)
                  .reverse()
                  .map((msg, i) => {
                    const cfg = msg.taskType
                      ? taskTypeConfig[msg.taskType]
                      : taskTypeConfig.analysis;
                    return (
                      <div
                        key={msg.id}
                        data-ocid={`controller.item.${i + 1}`}
                        className="bg-card border border-border rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium line-clamp-2">
                            {msg.content}
                          </p>
                          {msg.taskType && (
                            <Badge
                              className={cn(
                                "text-[10px] shrink-0 border",
                                cfg.color,
                                cfg.bg,
                                cfg.border,
                              )}
                            >
                              {cfg.label}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 p-3 bg-muted/20 rounded-lg border border-border/50">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Target className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                              Reasoning
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {generateReasoning(
                              msg.taskType || "analysis",
                              mode,
                            )}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Task Distribution */}
          {totalTasks > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Task Distribution
              </h3>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(taskTypeCounts).map(([type, count]) => {
                    const cfg =
                      taskTypeConfig[type as keyof typeof taskTypeConfig] ||
                      taskTypeConfig.analysis;
                    const pct = Math.round((count / totalTasks) * 100);
                    return (
                      <div key={type} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn("text-xs font-medium", cfg.color)}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {count}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              cfg.bg.replace("/10", "/60"),
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Total tasks processed:{" "}
                  <span className="text-foreground font-mono">
                    {totalTasks}
                  </span>
                </p>
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function generateReasoning(taskType: string, mode: string): string {
  const reasoningMap: Record<string, string> = {
    analysis: `Input classified as ANALYSIS task. Detected keywords indicate inspection/evaluation intent. ${
      mode === "deep"
        ? "Deep mode: Full codebase scan + multi-pass cross-referencing activated."
        : mode === "caffeine"
          ? "Caffeine: Parallel scan of top candidates only."
          : "Standard: Systematic scan with relevance filtering."
    } Routing to Planner for multi-step breakdown.`,
    coding: `Input classified as CODING task. Implementation/modification intent detected. ${
      mode === "caffeine"
        ? "Caffeine: Skipping scaffolding, direct to patch generation."
        : mode === "deep"
          ? "Deep: Full AST analysis + impact assessment before writing."
          : "Normal: Standard read-plan-write-verify cycle."
    } Executor assigned with filesystem access.`,
    deployment: `Input classified as DEPLOYMENT task. Release/publish trigger words detected. ${
      mode === "deep"
        ? "Deep: Full pre-flight validation + staged rollout with monitoring."
        : mode === "caffeine"
          ? "Caffeine: Fast-path deploy with async health monitoring."
          : "Normal: Standard pipeline with blocking health checks."
    } Deployment tool activated.`,
    search: `Input classified as SEARCH task. Query/lookup intent identified. ${
      mode === "deep"
        ? "Deep: Exhaustive knowledge base scan + semantic matching."
        : mode === "caffeine"
          ? "Caffeine: Top-3 candidate retrieval from indexed cache."
          : "Normal: Balanced search with relevance scoring."
    } Memory layer queried first for cached results.`,
  };
  return reasoningMap[taskType] || reasoningMap.analysis;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
