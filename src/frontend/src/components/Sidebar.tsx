import { cn } from "@/lib/utils";
import {
  BotMessageSquare,
  Brain,
  Code2,
  Database,
  FolderOpen,
  GitFork,
  Github,
  Layers,
  Plug,
  Terminal,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useApiKeys } from "../hooks/useApiKeys";
import type { AgentMode, ModuleName } from "../types/agent";
import { ApiKeysDialog } from "./ApiKeysDialog";

interface SidebarProps {
  activeModule: ModuleName;
  onModuleChange: (module: ModuleName) => void;
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  learningScore: number;
  isExecuting: boolean;
  integrationsCount?: number;
}

const modules: {
  name: ModuleName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}[] = [
  { name: "chat", label: "Chat", icon: BotMessageSquare },
  { name: "controller", label: "Controller", icon: Brain },
  { name: "planner", label: "Planner", icon: GitFork },
  { name: "executor", label: "Executor", icon: Terminal },
  { name: "tools", label: "Tools", icon: Wrench },
  { name: "memory", label: "Memory", icon: Database },
  {
    name: "self-improvement",
    label: "Self-Improve",
    icon: TrendingUp,
    badge: "LIVE",
    badgeColor: "text-green-400 bg-green-400/10 border-green-400/20",
  },
  { name: "files", label: "Files", icon: FolderOpen },
  { name: "integrations", label: "Integrations", icon: Plug },
];

const aiModules: {
  name: ModuleName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}[] = [
  {
    name: "ai-models",
    label: "AI Models",
    icon: Brain,
    badge: "NEW",
    badgeColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  },
  {
    name: "code-gen",
    label: "Code Gen",
    icon: Code2,
    badge: "FREE",
    badgeColor: "text-green-400 bg-green-400/10 border-green-400/20",
  },
  { name: "github", label: "GitHub", icon: Github },
];

const modeConfig = {
  caffeine: {
    label: "Caffeine",
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/40",
    activeRing: "ring-orange-500/60",
  },
  normal: {
    label: "Normal",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    activeRing: "ring-blue-500/60",
  },
  deep: {
    label: "Deep",
    color: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/40",
    activeRing: "ring-purple-500/60",
  },
};

export function Sidebar({
  activeModule,
  onModuleChange,
  mode,
  onModeChange,
  learningScore,
  isExecuting,
  integrationsCount = 0,
}: SidebarProps) {
  const { keys, saveKeys } = useApiKeys();

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-screen overflow-hidden"
      data-ocid="sidebar.panel"
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-none">
              Caffeine Agent
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">
              Platform v3.0
            </p>
          </div>
          {isExecuting && (
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse-dot [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse-dot [animation-delay:0.4s]" />
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
          Execution Mode
        </p>
        <div className="flex flex-col gap-1">
          {(["caffeine", "normal", "deep"] as AgentMode[]).map((m) => {
            const cfg = modeConfig[m];
            const isActive = mode === m;
            return (
              <button
                type="button"
                key={m}
                data-ocid={`mode.${m}.toggle`}
                onClick={() => onModeChange(m)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border",
                  isActive
                    ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ${cfg.activeRing}`
                    : "text-muted-foreground border-transparent hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {m === "caffeine" && <Zap className="w-3.5 h-3.5" />}
                {m === "normal" && <Layers className="w-3.5 h-3.5" />}
                {m === "deep" && <Brain className="w-3.5 h-3.5" />}
                <span>{cfg.label} Mode</span>
                {isActive && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-bold opacity-70">
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
          Modules
        </p>
        <ul className="flex flex-col gap-0.5 mb-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.name;
            return (
              <li key={mod.name}>
                <button
                  type="button"
                  data-ocid={`nav.${mod.name}.link`}
                  onClick={() => onModuleChange(mod.name)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all",
                    isActive
                      ? "bg-primary/15 text-primary font-semibold border border-primary/20"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{mod.label}</span>
                  {mod.badge && (
                    <span
                      className={cn(
                        "ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border",
                        mod.badgeColor,
                      )}
                    >
                      {mod.badge}
                    </span>
                  )}
                  {mod.name === "integrations" && integrationsCount > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold font-mono text-primary bg-primary/15 px-1 rounded-full border border-primary/25">
                      {integrationsCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
          AI & Code
        </p>
        <ul className="flex flex-col gap-0.5">
          {aiModules.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.name;
            return (
              <li key={mod.name}>
                <button
                  type="button"
                  data-ocid={`nav.${mod.name}.link`}
                  onClick={() => onModuleChange(mod.name)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all",
                    isActive
                      ? "bg-primary/15 text-primary font-semibold border border-primary/20"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{mod.label}</span>
                  {mod.badge && (
                    <span
                      className={cn(
                        "ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border",
                        mod.badgeColor,
                      )}
                    >
                      {mod.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Learning Score + Footer */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
        <div className="bg-card rounded-lg p-3 border border-border mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Learning Score
            </span>
            <span className="text-sm font-bold text-green-400 font-mono">
              {learningScore}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 to-cyan-400 transition-all duration-700"
              style={{ width: `${Math.min(100, learningScore)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {learningScore < 50
              ? "Building knowledge base"
              : learningScore < 80
                ? "Adaptive reasoning active"
                : "Peak performance"}
          </p>
        </div>

        {/* API Keys button */}
        <ApiKeysDialog keys={keys} onSave={saveKeys} />

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </aside>
  );
}
