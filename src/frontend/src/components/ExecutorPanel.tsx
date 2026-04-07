import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  Clock,
  Shield,
  ShieldAlert,
  Terminal,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { AgentMode, LogEntry } from "../types/agent";

interface ExecutorPanelProps {
  logEntries: LogEntry[];
  isExecuting: boolean;
  mode: AgentMode;
}

const safetyRestrictions = [
  { label: "Destructive File Ops", blocked: true },
  { label: "Network Write Access", blocked: true },
  { label: "System Config Changes", blocked: true },
  { label: "Credential Access", blocked: true },
  { label: "Read File System", blocked: false },
  { label: "Write Temp Files", blocked: false },
  { label: "Run Unit Tests", blocked: false },
  { label: "Read Git History", blocked: false },
];

const modeRestrictions = {
  caffeine: {
    label: "Reduced Safety Mode",
    color: "text-orange-400",
    description:
      "Some validation steps skipped for speed. Use with known, trusted tasks.",
  },
  normal: {
    label: "Standard Safety",
    color: "text-blue-400",
    description: "All standard restrictions enforced. Validation at each step.",
  },
  deep: {
    label: "Enhanced Safety",
    color: "text-purple-400",
    description: "Strict validation with pre-execution impact analysis.",
  },
};

export function ExecutorPanel({
  logEntries,
  isExecuting,
  mode,
}: ExecutorPanelProps) {
  const modeInfo = modeRestrictions[mode];
  const logBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest entry
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logEntries.length]);

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      data-ocid="executor.panel"
    >
      <div className="px-6 py-4 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">Executor</h2>
          {isExecuting && (
            <span className="flex items-center gap-1.5 text-xs text-orange-400 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Active
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Performs actions (file edits, code execution, scripts) with safety
          restrictions.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Safety Status */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Safety Restrictions
            </h3>
            <div
              className={cn(
                "bg-card border rounded-xl p-4 mb-3",
                mode === "caffeine"
                  ? "border-orange-500/30"
                  : mode === "deep"
                    ? "border-purple-500/30"
                    : "border-blue-500/30",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {mode === "deep" ? (
                  <Shield className="w-4 h-4" />
                ) : mode === "caffeine" ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span className={cn("text-sm font-semibold", modeInfo.color)}>
                  {modeInfo.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {modeInfo.description}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {safetyRestrictions.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between py-1.5 px-3 bg-card border border-border rounded-lg"
                >
                  <span className="text-xs">{r.label}</span>
                  {r.blocked ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-red-400 font-mono">
                      <XCircle className="w-3.5 h-3.5" /> BLOCKED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] text-green-400 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ALLOWED
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Execution Log */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Execution Log
            </h3>
            {logEntries.length === 0 ? (
              <div
                className="bg-card border border-border rounded-xl p-8 text-center"
                data-ocid="executor.empty_state"
              >
                <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No active execution. Send a task to see real-time logs here.
                </p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    executor.log
                  </span>
                  {isExecuting && (
                    <span className="ml-auto text-[10px] text-orange-400 animate-pulse font-mono">
                      STREAMING
                    </span>
                  )}
                </div>
                <div
                  className="font-mono p-3 space-y-1 max-h-80 overflow-y-auto scrollbar-thin"
                  data-ocid="executor.list"
                >
                  <AnimatePresence initial={false}>
                    {logEntries.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        data-ocid={`executor.item.${i + 1}`}
                        className="flex items-start gap-2 text-[11px]"
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {entry.status === "running" ? (
                            <Clock
                              className="w-3 h-3 inline text-orange-400 animate-spin"
                              style={{ animationDuration: "2s" }}
                            />
                          ) : entry.status === "error" ? (
                            <XCircle className="w-3 h-3 inline text-red-400" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 inline text-green-400" />
                          )}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          [
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                          ]
                        </span>
                        <span
                          className={cn(
                            entry.status === "error"
                              ? "text-red-400"
                              : entry.status === "running"
                                ? "text-orange-300"
                                : "text-green-300",
                          )}
                        >
                          {entry.message}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={logBottomRef} />
                </div>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
