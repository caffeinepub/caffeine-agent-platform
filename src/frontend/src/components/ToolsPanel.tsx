import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Github,
  HardDrive,
  RefreshCw,
  Server,
  Wrench,
} from "lucide-react";
import type { ToolState } from "../types/agent";

interface ToolsPanelProps {
  tools: ToolState[];
  onToolToggle: (name: "github" | "deployment" | "filesystem") => void;
}

const toolIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  deployment: Server,
  filesystem: HardDrive,
};

const toolDescriptions: Record<
  string,
  { desc: string; capabilities: string[] }
> = {
  github: {
    desc: "Connect to GitHub repositories for reading files, viewing history, and submitting pull requests.",
    capabilities: [
      "Read repository files",
      "View commit history",
      "Create branches",
      "Submit pull requests",
    ],
  },
  deployment: {
    desc: "Deploy to cloud environments. Supports staging and production with health monitoring.",
    capabilities: [
      "Deploy to staging",
      "Deploy to production",
      "Health monitoring",
      "Rollback support",
    ],
  },
  filesystem: {
    desc: "Access local file system for reading, writing, and managing project files.",
    capabilities: [
      "Read files",
      "Write temp files",
      "List directories",
      "Watch file changes",
    ],
  },
};

export function ToolsPanel({ tools, onToolToggle }: ToolsPanelProps) {
  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      data-ocid="tools.panel"
    >
      <div className="px-6 py-4 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">Tool Layer</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Modular connectors for external integrations. Connect and disconnect
          tools at any time.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {/* Connection Status Banner */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {tools.map((t) => (
                  <div
                    key={t.name}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all",
                      t.connected ? "bg-green-400" : "bg-muted/40",
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {tools.filter((t) => t.connected).length} of {tools.length}{" "}
                tools connected
              </span>
            </div>
          </div>

          {/* Tool Cards */}
          <div className="grid gap-4" data-ocid="tools.list">
            {tools.map((tool, i) => {
              const Icon = toolIcons[tool.name] || Wrench;
              const info = toolDescriptions[tool.name];
              return (
                <div
                  key={tool.name}
                  data-ocid={`tools.item.${i + 1}`}
                  className={cn(
                    "bg-card border rounded-xl p-5 transition-all",
                    tool.connected
                      ? "border-green-500/30 glow-orange"
                      : "border-border hover:border-border/80",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center border",
                          tool.connected
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-muted/30 border-border",
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-5 h-5",
                            tool.connected
                              ? "text-green-400"
                              : "text-muted-foreground",
                          )}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{tool.label}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {tool.connected ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                              <span className="text-[11px] text-green-400">
                                Connected
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground">
                                Disconnected
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      data-ocid={`tools.${tool.name}.switch`}
                      checked={tool.connected}
                      onCheckedChange={() => onToolToggle(tool.name)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    {info.desc}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {info.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded border",
                          tool.connected
                            ? "text-green-400 bg-green-400/5 border-green-400/20"
                            : "text-muted-foreground bg-muted/20 border-border",
                        )}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  {tool.connected && tool.lastSync && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border pt-3">
                      <Clock className="w-3 h-3" />
                      Last sync: {formatRelativeTime(tool.lastSync)}
                      <Button
                        variant="ghost"
                        size="icon"
                        data-ocid={`tools.${tool.name}.button`}
                        className="ml-auto h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => {}}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tool Integration Info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Integration Notes
            </h3>
            <ul className="space-y-2">
              {[
                "Tools are isolated — each runs in a sandboxed context",
                "Connections are stateless and can be toggled without data loss",
                "All tool calls are logged in the Execution Log",
                "Caffeine Mode may reduce per-call validation for speed",
              ].map((note) => (
                <li
                  key={note}
                  className="text-xs text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary mt-0.5">·</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}
