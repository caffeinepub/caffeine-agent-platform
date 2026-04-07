import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  Clock,
  ListChecks,
  Trash2,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import type { LogEntry, PlanStep } from "../types/agent";

interface RightPanelProps {
  logEntries: LogEntry[];
  planSteps: PlanStep[];
  isExecuting: boolean;
  onClearLog: () => void;
}

const statusIcons = {
  running: (
    <Clock
      className="w-3.5 h-3.5 text-orange-400 animate-spin"
      style={{ animationDuration: "2s" }}
    />
  ),
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />,
  error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
};

const stepColors = {
  pending: "text-muted-foreground",
  "in-progress": "text-orange-400",
  done: "text-green-400",
  error: "text-red-400",
};

export function RightPanel({
  logEntries,
  planSteps,
  isExecuting,
  onClearLog,
}: RightPanelProps) {
  const logBottomRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll trigger
  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logEntries.length]);

  return (
    <div
      className="w-[340px] shrink-0 flex flex-col border-l border-border overflow-hidden bg-card/10"
      data-ocid="right_panel.panel"
    >
      {/* Plan Steps */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 bg-card/40">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Execution Plan</span>
          </div>
          {isExecuting && (
            <span className="text-[10px] text-orange-400 font-mono animate-pulse">
              RUNNING
            </span>
          )}
        </div>
        <div className="px-4 py-3 space-y-2" data-ocid="plan.list">
          {planSteps.length === 0 ? (
            <p
              className="text-xs text-muted-foreground py-2 text-center"
              data-ocid="plan.empty_state"
            >
              No active plan — send a task to begin
            </p>
          ) : (
            planSteps.map((step, i) => (
              <div
                key={step.id}
                data-ocid={`plan.item.${i + 1}`}
                className={cn(
                  "flex items-start gap-2.5 text-xs transition-all",
                  step.status === "in-progress" && "animate-slide-in-up",
                )}
              >
                <StepIndicator status={step.status} number={step.stepNumber} />
                <span
                  className={cn(
                    "leading-relaxed pt-0.5",
                    stepColors[step.status],
                  )}
                >
                  {step.description}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Execution Log */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/40">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold">Execution Log</span>
          </div>
          <Button
            data-ocid="log.delete_button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onClearLog}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 py-3 space-y-1 font-mono" data-ocid="log.list">
            {logEntries.length === 0 ? (
              <div className="py-8 text-center" data-ocid="log.empty_state">
                <p className="text-[11px] text-muted-foreground">
                  No log entries yet
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {logEntries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    data-ocid={`log.item.${i + 1}`}
                    className="flex items-start gap-2 py-1 text-[11px]"
                  >
                    <span className="shrink-0 mt-0.5">
                      {statusIcons[entry.status]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">
                        [{formatLogTime(entry.timestamp)}]{" "}
                      </span>
                      <span
                        className={cn(
                          entry.status === "error"
                            ? "text-red-400"
                            : entry.status === "running"
                              ? "text-orange-300"
                              : "text-foreground",
                        )}
                      >
                        {entry.message}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={logBottomRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function StepIndicator({
  status,
  number,
}: { status: PlanStep["status"]; number: number }) {
  if (status === "done") {
    return (
      <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-3 h-3 text-green-400" />
      </div>
    );
  }
  if (status === "in-progress") {
    return (
      <div className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0 animate-pulse">
        <span className="text-[9px] font-bold text-orange-400">{number}</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
        <XCircle className="w-3 h-3 text-red-400" />
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-muted/30 border border-border flex items-center justify-center shrink-0">
      <span className="text-[9px] font-mono text-muted-foreground">
        {number}
      </span>
    </div>
  );
}

function formatLogTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
