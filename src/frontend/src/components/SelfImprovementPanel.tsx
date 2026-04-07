import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Lightbulb,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import type { ErrorEntry, StrategyEntry } from "../types/agent";

interface SelfImprovementPanelProps {
  errors: ErrorEntry[];
  strategies: StrategyEntry[];
  learningScore: number;
}

const errorTypeConfig = {
  timeout: {
    label: "Timeout",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  parsing: {
    label: "Parsing",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  "tool-failure": {
    label: "Tool Failure",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  logic: {
    label: "Logic",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
};

export function SelfImprovementPanel({
  errors,
  strategies,
  learningScore,
}: SelfImprovementPanelProps) {
  const resolvedErrors = errors.filter((e) => e.resolved);
  const unresolvedErrors = errors.filter((e) => !e.resolved);

  const errorCounts = errors.reduce<Record<string, number>>((acc, e) => {
    acc[e.errorType] = (acc[e.errorType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      data-ocid="self_improvement.panel"
    >
      <div className="px-6 py-4 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h2 className="text-base font-bold">Self-Improvement</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-400/10 border border-green-400/20 text-green-400 font-mono ml-1">
            LIVE
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Tracks errors, analyzes failure patterns, and adapts execution
          strategy over time.
        </p>
      </div>

      <div className="px-6 py-4 border-b border-border">
        {/* Learning Score */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Learning Score"
            value={`${learningScore}`}
            sub="/ 100"
            color="text-green-400"
          />
          <MetricCard
            label="Errors Resolved"
            value={`${resolvedErrors.length}`}
            sub={`/ ${errors.length}`}
            color="text-cyan-400"
          />
          <MetricCard
            label="Strategies Applied"
            value={`${strategies.length}`}
            sub="adaptations"
            color="text-purple-400"
          />
        </div>

        {/* Learning Score Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Learning Progress
            </span>
            <span className="text-xs font-mono text-green-400">
              {learningScore}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${learningScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="errors"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-4 pt-3 border-b border-border">
          <TabsList
            className="bg-muted/20 border border-border h-8"
            data-ocid="improvement.tab"
          >
            <TabsTrigger
              value="errors"
              data-ocid="improvement.errors.tab"
              className="text-[11px] data-[state=active]:bg-card"
            >
              Error Analysis ({errors.length})
            </TabsTrigger>
            <TabsTrigger
              value="strategies"
              data-ocid="improvement.strategies.tab"
              className="text-[11px] data-[state=active]:bg-card"
            >
              Strategy Log ({strategies.length})
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              data-ocid="improvement.timeline.tab"
              className="text-[11px] data-[state=active]:bg-card"
            >
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Error Analysis */}
        <TabsContent value="errors" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Error type distribution */}
              {errors.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Error Distribution
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(errorCounts).map(([type, count]) => {
                      const cfg =
                        errorTypeConfig[type as keyof typeof errorTypeConfig] ||
                        errorTypeConfig.logic;
                      const pct = Math.round((count / errors.length) * 100);
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span
                            className={cn(
                              "text-[11px] w-20 shrink-0",
                              cfg.color,
                            )}
                          >
                            {cfg.label}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                cfg.bg.replace("/10", "/60"),
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unresolved errors */}
              {unresolvedErrors.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Unresolved
                  </h3>
                  <div className="space-y-2">
                    {unresolvedErrors.map((err, i) => (
                      <ErrorCard key={err.id} error={err} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved errors */}
              {resolvedErrors.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Resolved
                  </h3>
                  <div className="space-y-2">
                    {resolvedErrors.map((err, i) => (
                      <ErrorCard key={err.id} error={err} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {errors.length === 0 && (
                <div
                  className="py-12 text-center"
                  data-ocid="improvement.empty_state"
                >
                  <CheckCircle2 className="w-8 h-8 text-green-400/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No errors recorded. Agent is performing optimally.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Strategy Log */}
        <TabsContent value="strategies" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {strategies.length === 0 ? (
                <div className="py-12 text-center">
                  <Lightbulb className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No strategy adaptations yet.
                  </p>
                </div>
              ) : (
                strategies.map((strat, i) => (
                  <motion.div
                    key={strat.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    data-ocid={`improvement.item.${i + 1}`}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">
                          {strat.changeDescription}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatTime(strat.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide mb-1">
                          Before
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">
                          {strat.beforeStrategy}
                        </p>
                      </div>
                      <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                        <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wide mb-1">
                          After
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">
                          {strat.afterStrategy}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Self-Improvement History
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border/60" />
                <div className="space-y-4">
                  {[...strategies, ...errors.filter((e) => e.resolved)]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 10)
                    .map((item, i) => {
                      const isStrategy = "changeDescription" in item;
                      return (
                        <div
                          key={item.id}
                          data-ocid={`improvement.timeline.item.${i + 1}`}
                          className="flex gap-4 pl-2"
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 z-10 relative",
                              isStrategy
                                ? "bg-yellow-400/10 border-yellow-400/30"
                                : "bg-green-400/10 border-green-400/30",
                            )}
                          >
                            {isStrategy ? (
                              <Lightbulb className="w-2.5 h-2.5 text-yellow-400" />
                            ) : (
                              <CheckCircle2 className="w-2.5 h-2.5 text-green-400" />
                            )}
                          </div>
                          <div className="flex-1 pb-2">
                            <p className="text-xs text-foreground leading-relaxed">
                              {isStrategy
                                ? (item as StrategyEntry).changeDescription
                                : `Resolved: ${(item as ErrorEntry).message.slice(0, 60)}...`}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatTime(item.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ErrorCard({ error, index }: { error: ErrorEntry; index: number }) {
  const cfg = errorTypeConfig[error.errorType] || errorTypeConfig.logic;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      data-ocid={`improvement.error.${index + 1}`}
      className="bg-card border border-border rounded-lg p-3"
    >
      <div className="flex items-start gap-2">
        {error.resolved ? (
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "text-[10px] border px-1.5 py-0.5",
                cfg.color,
                cfg.bg,
                cfg.border,
              )}
            >
              {cfg.label}
            </Badge>
            {error.resolved && (
              <span className="text-[10px] text-green-400 font-mono">
                RESOLVED
              </span>
            )}
          </div>
          <p className="text-xs text-foreground mt-1 leading-relaxed">
            {error.message}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatTime(error.timestamp)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={cn("text-xl font-bold font-mono", color)}>
        {value}
        <span className="text-xs text-muted-foreground font-normal ml-1">
          {sub}
        </span>
      </p>
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
