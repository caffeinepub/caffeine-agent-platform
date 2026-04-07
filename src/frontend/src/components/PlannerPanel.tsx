import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CheckCircle2, GitFork, Loader2, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { PlanStep } from "../types/agent";

interface PlannerPanelProps {
  planSteps: PlanStep[];
  isExecuting: boolean;
}

export function PlannerPanel({ planSteps, isExecuting }: PlannerPanelProps) {
  const doneCount = planSteps.filter((s) => s.status === "done").length;
  const total = planSteps.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      data-ocid="planner.panel"
    >
      <div className="px-6 py-4 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <GitFork className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">Planner</h2>
          {isExecuting && (
            <span className="flex items-center gap-1.5 text-xs text-orange-400 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              AI generating plan...
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated execution steps — real-time breakdown from Claude or
          Groq.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Progress overview */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Plan Progress
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                {doneCount}/{total} steps
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {isExecuting && (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                <span className="text-[11px] text-orange-400">
                  Executing plan...
                </span>
              </div>
            )}
          </section>

          {/* Step List */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Execution Steps
            </h3>
            {planSteps.length === 0 ? (
              <div
                className="bg-card border border-border rounded-xl p-8 text-center"
                data-ocid="planner.empty_state"
              >
                <GitFork className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Waiting for task... The AI will generate a real execution plan
                  when you send a message.
                </p>
              </div>
            ) : (
              <div className="relative" data-ocid="planner.list">
                {/* Connector line */}
                <div className="absolute left-5 top-6 bottom-6 w-px bg-border/60" />
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {planSteps.map((step, i) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: i * 0.04 }}
                        data-ocid={`planner.item.${i + 1}`}
                        className={cn(
                          "flex items-start gap-3 bg-card border rounded-xl p-4 relative transition-all",
                          step.status === "in-progress"
                            ? "border-orange-500/40 bg-orange-500/5"
                            : step.status === "done"
                              ? "border-green-500/20 opacity-80"
                              : step.status === "error"
                                ? "border-red-500/40"
                                : "border-border",
                        )}
                      >
                        <StepIcon
                          status={step.status}
                          number={step.stepNumber}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              STEP {step.stepNumber}
                            </span>
                            <StatusBadge status={step.status} />
                          </div>
                          <p
                            className={cn(
                              "text-sm mt-1 leading-relaxed",
                              step.status === "done"
                                ? "text-muted-foreground line-through"
                                : step.status === "in-progress"
                                  ? "text-foreground font-medium"
                                  : "text-foreground",
                            )}
                          >
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </section>

          {/* Planning Info */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Planning Strategy
            </h3>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <InfoRow
                label="Source"
                value="AI-generated — Claude 3 Haiku or Groq Llama3-8B for plan generation"
              />
              <InfoRow
                label="Decomposition"
                value="Linear task breakdown with parallel sub-tasks where safe"
              />
              <InfoRow
                label="Dependency"
                value="Steps ordered by data dependency — no out-of-order execution"
              />
              <InfoRow
                label="Error Handling"
                value="Each step has rollback capability on failure"
              />
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function StepIcon({
  status,
  number,
}: { status: PlanStep["status"]; number: number }) {
  if (status === "done")
    return <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />;
  if (status === "in-progress")
    return (
      <Loader2 className="w-6 h-6 text-orange-400 shrink-0 animate-spin" />
    );
  if (status === "error")
    return <XCircle className="w-6 h-6 text-red-400 shrink-0" />;
  return (
    <div className="w-6 h-6 rounded-full border border-border flex items-center justify-center shrink-0">
      <span className="text-[10px] font-mono text-muted-foreground">
        {number}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: PlanStep["status"] }) {
  const map = {
    pending: "text-muted-foreground",
    "in-progress": "text-orange-400",
    done: "text-green-400",
    error: "text-red-400",
  };
  const labels = {
    pending: "Pending",
    "in-progress": "Running",
    done: "Done",
    error: "Error",
  };
  return (
    <span
      className={cn(
        "text-[10px] font-mono uppercase tracking-wide",
        map[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}:{" "}
      </span>
      <span className="text-xs text-foreground">{value}</span>
    </div>
  );
}
