import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Activity, BookOpen, Database, Search, Star } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { MemoryEntry } from "../types/agent";

interface MemoryPanelProps {
  memory: MemoryEntry[];
}

const typeConfig = {
  action: {
    label: "Action",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    icon: Activity,
  },
  preference: {
    label: "Preference",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    icon: Star,
  },
  session: {
    label: "Session",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    icon: BookOpen,
  },
};

export function MemoryPanel({ memory }: MemoryPanelProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filtered = memory.filter((m) => {
    const matchesSearch =
      !search || m.content.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || m.memoryType === activeTab;
    return matchesSearch && matchesTab;
  });

  const counts = {
    all: memory.length,
    action: memory.filter((m) => m.memoryType === "action").length,
    preference: memory.filter((m) => m.memoryType === "preference").length,
    session: memory.filter((m) => m.memoryType === "session").length,
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      data-ocid="memory.panel"
    >
      <div className="px-6 py-4 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">Memory System</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Stores past actions, user preferences, and session context for
          improved reasoning.
        </p>
      </div>

      <div className="px-4 py-3 border-b border-border bg-card/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            data-ocid="memory.search_input"
            placeholder="Search memory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border text-sm h-8"
          />
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-4 pt-3 border-b border-border">
          <TabsList
            className="bg-muted/20 border border-border h-8"
            data-ocid="memory.tab"
          >
            {(["all", "action", "preference", "session"] as const).map(
              (tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  data-ocid={`memory.${tab}.tab`}
                  className="text-[11px] data-[state=active]:bg-card data-[state=active]:text-foreground capitalize"
                >
                  {tab}{" "}
                  <span className="ml-1 text-muted-foreground">
                    ({counts[tab]})
                  </span>
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2" data-ocid="memory.list">
              {filtered.length === 0 ? (
                <div
                  className="py-12 text-center"
                  data-ocid="memory.empty_state"
                >
                  <Database className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search
                      ? "No entries match your search"
                      : "No memory entries yet"}
                  </p>
                </div>
              ) : (
                filtered.map((entry, i) => {
                  const cfg = typeConfig[entry.memoryType];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      data-ocid={`memory.item.${i + 1}`}
                      className="bg-card border border-border rounded-lg p-3 hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                            cfg.bg,
                            cfg.border,
                          )}
                        >
                          <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed text-foreground">
                            {entry.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
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
                            <span className="text-[10px] text-muted-foreground">
                              {formatRelativeTime(entry.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
