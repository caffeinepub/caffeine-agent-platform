import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ErrorType,
  LogStatus,
  MemoryType,
  PlanStepStatus,
  Role,
  RunMode,
  TaskType,
  Tool,
  type backendInterface,
} from "./backend";
import { AIModelsPanel } from "./components/AIModelsPanel";
import { ChatPanel } from "./components/ChatPanel";
import { CodeGenPanel } from "./components/CodeGenPanel";
import { ControllerPanel } from "./components/ControllerPanel";
import { ExecutorPanel } from "./components/ExecutorPanel";
import { FileManagerPanel } from "./components/FileManagerPanel";
import { GitHubPanel } from "./components/GitHubPanel";
import { IntegrationsPanel } from "./components/IntegrationsPanel";
import { MemoryPanel } from "./components/MemoryPanel";
import { PlannerPanel } from "./components/PlannerPanel";
import { RightPanel } from "./components/RightPanel";
import { SelfImprovementPanel } from "./components/SelfImprovementPanel";
import { Sidebar } from "./components/Sidebar";
import { ToolsPanel } from "./components/ToolsPanel";
import {
  sampleErrors,
  sampleLogEntries,
  sampleMemory,
  sampleMessages,
  samplePlanSteps,
  sampleStrategies,
  sampleTools,
} from "./data/sampleData";
import { useActor } from "./hooks/useActor";
import { useApiKeys } from "./hooks/useApiKeys";
import type {
  AgentMode,
  ChatMessage,
  ErrorEntry,
  LogEntry,
  MemoryEntry,
  ModuleName,
  PlanStep,
  StrategyEntry,
  ToolState,
} from "./types/agent";
import { orchestrateAgent } from "./utils/aiAgentOrchestrator";

function App() {
  const { actor, isFetching } = useActor();
  const [activeModule, setActiveModule] = useState<ModuleName>("chat");
  const [mode, setMode] = useState<AgentMode>("normal");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [strategies, setStrategies] = useState<StrategyEntry[]>([]);
  const [tools, setTools] = useState<ToolState[]>(sampleTools);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [learningScore, setLearningScore] = useState(72);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [connectedIntegrationsCount, setConnectedIntegrationsCount] =
    useState(0);
  // Track last model used and task type for ControllerPanel
  const [lastModel, setLastModel] = useState<"claude" | "groq" | "none">(
    "none",
  );
  const [lastTaskType, setLastTaskType] = useState<string>("");
  const executingRef = useRef(false);

  // Load data from backend when actor is ready
  useEffect(() => {
    if (!actor || isFetching || dataLoaded) return;

    async function loadData() {
      if (!actor) return;
      try {
        const [msgs, logs, steps, errs, strats, mems, config, toolConns] =
          await Promise.all([
            actor.getAllMessages(),
            actor.getAllLogEntries(),
            actor.getAllPlanSteps(),
            actor.getAllErrorLogs(),
            actor.getAllStrategyImprovements(),
            actor.getAllMemoryEntries(),
            actor.getAgentConfig(),
            actor.getAllToolConnections(),
          ]);

        const hasData = msgs.length > 0;

        if (!hasData) {
          await seedInitialData(actor);
        } else {
          setMessages(
            msgs.map((m, i) => ({
              id: `msg-${i}`,
              role: m.role === Role.user ? "user" : "agent",
              content: m.content,
              contentType: "text" as const,
              timestamp: Number(m.timestamp) / 1_000_000,
              taskType: mapTaskType(m.taskType),
            })),
          );

          setLogEntries(
            logs.map((l, i) => ({
              id: `log-${i}`,
              timestamp: Number(l.timestamp) / 1_000_000,
              message: l.message,
              status: mapLogStatus(l.status),
            })),
          );

          setPlanSteps(
            steps.map((s, i) => ({
              id: `step-${i}`,
              stepNumber: Number(s.stepNumber),
              description: s.description,
              status: mapPlanStatus(s.status),
            })),
          );

          setErrors(
            errs.map((e, i) => ({
              id: `err-${i}`,
              errorType: mapErrorType(e.errorType),
              message: e.message,
              timestamp: Number(e.timestamp) / 1_000_000,
              resolved: e.resolved,
            })),
          );

          setStrategies(
            strats.map((s, i) => ({
              id: `strat-${i}`,
              timestamp: Number(s.timestamp) / 1_000_000,
              changeDescription: s.changeDescription,
              beforeStrategy: s.beforeStrategy,
              afterStrategy: s.afterStrategy,
            })),
          );

          setMemory(
            mems.map((m, i) => ({
              id: `mem-${i}`,
              content: m.content,
              memoryType: mapMemoryType(m.memoryType),
              timestamp: Number(m.timestamp) / 1_000_000,
            })),
          );

          setLearningScore(Number(config.learningScore));

          if (toolConns.length > 0) {
            setTools(
              toolConns.map((tc) => ({
                name: mapToolName(tc.tool),
                label: getToolLabel(tc.tool),
                connected: tc.connected,
                lastSync: tc.connected ? Date.now() - 5 * 60 * 1000 : undefined,
              })),
            );
          }

          const backendMode = config.mode;
          if (backendMode === RunMode.caffeine) setMode("caffeine");
          else if (backendMode === RunMode.deep) setMode("deep");
          else setMode("normal");
        }
      } catch (e) {
        console.error("Failed to load from backend, using sample data", e);
        setMessages(sampleMessages);
        setLogEntries(sampleLogEntries);
        setPlanSteps(samplePlanSteps);
        setErrors(sampleErrors);
        setStrategies(sampleStrategies);
        setMemory(sampleMemory);
      } finally {
        setIsLoading(false);
        setDataLoaded(true);
      }
    }
    loadData();
  }, [actor, isFetching, dataLoaded]);

  async function seedInitialData(backendActor: backendInterface) {
    try {
      await Promise.all([
        ...sampleMessages.map((m) =>
          backendActor.addMessage({
            content: m.content,
            role: m.role === "user" ? Role.user : Role.agent,
            taskType:
              m.taskType === "coding"
                ? TaskType.coding
                : m.taskType === "deployment"
                  ? TaskType.deployment
                  : m.taskType === "search"
                    ? TaskType.search
                    : TaskType.analysis,
          }),
        ),
        ...sampleErrors.map((e) =>
          backendActor.addErrorLog({
            errorType: mapErrorTypeToBackend(e.errorType),
            message: e.message,
            resolved: e.resolved,
          }),
        ),
        ...sampleStrategies.map((s) =>
          backendActor.addStrategyImprovement({
            changeDescription: s.changeDescription,
            beforeStrategy: s.beforeStrategy,
            afterStrategy: s.afterStrategy,
          }),
        ),
        ...sampleMemory.map((m) =>
          backendActor.addMemoryEntry({
            content: m.content,
            memoryType:
              m.memoryType === "preference"
                ? MemoryType.preference
                : m.memoryType === "session"
                  ? MemoryType.session
                  : MemoryType.action,
          }),
        ),
        ...sampleTools.map((t) =>
          backendActor.addToolConnection({
            tool: mapToolToBackend(t.name),
            connected: t.connected,
          }),
        ),
      ]);
      setMessages(sampleMessages);
      setLogEntries(sampleLogEntries);
      setPlanSteps(samplePlanSteps);
      setErrors(sampleErrors);
      setStrategies(sampleStrategies);
      setMemory(sampleMemory);
    } catch (e) {
      console.error("Seed failed", e);
      setMessages(sampleMessages);
      setLogEntries(sampleLogEntries);
      setPlanSteps(samplePlanSteps);
      setErrors(sampleErrors);
      setStrategies(sampleStrategies);
      setMemory(sampleMemory);
    }
  }

  const handleModeChange = useCallback(
    async (newMode: AgentMode) => {
      setMode(newMode);
      if (!actor) return;
      try {
        await actor.updateAgentConfig({
          learningScore: BigInt(learningScore),
          mode:
            newMode === "caffeine"
              ? RunMode.caffeine
              : newMode === "deep"
                ? RunMode.deep
                : RunMode.normal,
        });
      } catch (e) {
        console.error("Failed to update mode", e);
      }
    },
    [actor, learningScore],
  );

  const { keys } = useApiKeys();

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (executingRef.current) return;
      executingRef.current = true;
      setIsExecuting(true);

      const taskType = detectTaskType(content);
      setLastTaskType(taskType);
      const msgTimestamp = Date.now();

      const userMsg: ChatMessage = {
        id: `msg-${msgTimestamp}-u`,
        role: "user",
        content,
        contentType: "text",
        timestamp: msgTimestamp,
        taskType,
      };

      setMessages((prev) => [...prev, userMsg]);

      // Build conversation history for the API
      const conversationHistory: { role: string; content: string }[] = [];
      setMessages((prev) => {
        const history = prev
          .filter((m) => m.id !== userMsg.id)
          .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          }));
        conversationHistory.push(...history, { role: "user", content });
        return prev;
      });

      const agentMsgId = `msg-${Date.now()}-a`;

      // Add placeholder streaming message
      const agentMsg: ChatMessage = {
        id: agentMsgId,
        role: "agent",
        content: "",
        contentType: "text",
        timestamp: Date.now(),
        taskType,
        isStreaming: true,
      };
      setMessages((prev) => [...prev, agentMsg]);

      const textRef = { current: "" };

      try {
        const result = await orchestrateAgent({
          userMessage: content,
          conversationHistory,
          keys: {
            claude: keys.claude,
            groq: keys.groq,
            openai: keys.openai,
          },
          mode,
          onToken: (token) => {
            textRef.current += token;
            const snapshot = textRef.current;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? { ...m, content: snapshot, isStreaming: true }
                  : m,
              ),
            );
          },
          onPlanUpdate: (steps) => {
            setPlanSteps(steps);
          },
          onLogUpdate: (entries) => {
            setLogEntries((prev) => {
              // Replace log entries from this session; keep historical ones before msgTimestamp
              const historical = prev.filter((l) => l.timestamp < msgTimestamp);
              return [...historical, ...entries];
            });
          },
        });

        setLastModel(result.model);

        // Finalize message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? { ...m, content: result.text, isStreaming: false }
              : m,
          ),
        );

        // Mark all plan steps done
        setPlanSteps((prev) =>
          prev.map((s) => ({ ...s, status: "done" as const })),
        );

        const memEntry: MemoryEntry = {
          id: `mem-${Date.now()}`,
          content: `Task: ${content.slice(0, 80)}${content.length > 80 ? "..." : ""}`,
          memoryType: "action",
          timestamp: Date.now(),
        };
        setMemory((prev) => [memEntry, ...prev]);

        if (actor) {
          try {
            const newScore = await actor.incrementLearningScore();
            setLearningScore(Number(newScore));
          } catch {}

          try {
            await actor.addMessage({
              content,
              role: Role.user,
              taskType: mapTaskTypeToBackend(taskType),
            });
            await actor.addMessage({
              content: result.text,
              role: Role.agent,
              taskType: mapTaskTypeToBackend(taskType),
            });
            await actor.addMemoryEntry({
              content: memEntry.content,
              memoryType: MemoryType.action,
            });
          } catch {}
        }
      } catch (err) {
        console.error("Agent execution error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  content:
                    "An error occurred during execution. Please try again.",
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setIsExecuting(false);
        executingRef.current = false;
      }
    },
    [mode, actor, keys],
  );

  const handleToolToggle = useCallback(
    async (toolName: "github" | "deployment" | "filesystem") => {
      setTools((prev) =>
        prev.map((t) =>
          t.name === toolName
            ? {
                ...t,
                connected: !t.connected,
                lastSync: !t.connected ? Date.now() : undefined,
              }
            : t,
        ),
      );
      const tool = tools.find((t) => t.name === toolName);
      if (tool) {
        const newConnected = !tool.connected;
        toast.success(
          `${tool.label} ${newConnected ? "connected" : "disconnected"}`,
        );
        if (actor) {
          try {
            await actor.addToolConnection({
              tool: mapToolToBackend(toolName),
              connected: newConnected,
            });
          } catch {}
        }
      }
    },
    [tools, actor],
  );

  const handleClearChat = useCallback(async () => {
    setMessages([]);
    setLogEntries([]);
    setPlanSteps([]);
    if (actor) {
      try {
        await Promise.all([actor.clearMessages(), actor.clearLogEntries()]);
      } catch {}
    }
  }, [actor]);

  const isActuallyLoading = isLoading && isFetching;

  if (isActuallyLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm font-mono">
            Initializing Caffeine Agent...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden dark">
      <Toaster position="top-right" theme="dark" />
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        mode={mode}
        onModeChange={handleModeChange}
        learningScore={learningScore}
        isExecuting={isExecuting}
        integrationsCount={connectedIntegrationsCount}
      />
      <main className="flex flex-1 overflow-hidden">
        {activeModule === "chat" ? (
          <>
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isExecuting={isExecuting}
              mode={mode}
            />
            <RightPanel
              logEntries={logEntries}
              planSteps={planSteps}
              isExecuting={isExecuting}
              onClearLog={handleClearChat}
            />
          </>
        ) : activeModule === "controller" ? (
          <ControllerPanel
            messages={messages}
            mode={mode}
            lastTaskType={lastTaskType}
            isExecuting={isExecuting}
            logEntries={logEntries}
            model={lastModel}
          />
        ) : activeModule === "planner" ? (
          <PlannerPanel planSteps={planSteps} isExecuting={isExecuting} />
        ) : activeModule === "executor" ? (
          <ExecutorPanel
            logEntries={logEntries}
            isExecuting={isExecuting}
            mode={mode}
          />
        ) : activeModule === "tools" ? (
          <ToolsPanel tools={tools} onToolToggle={handleToolToggle} />
        ) : activeModule === "memory" ? (
          <MemoryPanel memory={memory} />
        ) : activeModule === "self-improvement" ? (
          <SelfImprovementPanel
            errors={errors}
            strategies={strategies}
            learningScore={learningScore}
          />
        ) : activeModule === "files" ? (
          <FileManagerPanel />
        ) : activeModule === "integrations" ? (
          <IntegrationsPanel
            onConnectionChange={setConnectedIntegrationsCount}
          />
        ) : activeModule === "ai-models" ? (
          <AIModelsPanel />
        ) : activeModule === "code-gen" ? (
          <CodeGenPanel />
        ) : activeModule === "github" ? (
          <GitHubPanel />
        ) : null}
      </main>
    </div>
  );
}

function detectTaskType(
  content: string,
): "analysis" | "coding" | "deployment" | "search" {
  const lower = content.toLowerCase();
  if (
    lower.includes("deploy") ||
    lower.includes("release") ||
    lower.includes("publish")
  )
    return "deployment";
  if (
    lower.includes("code") ||
    lower.includes("fix") ||
    lower.includes("implement") ||
    lower.includes("write") ||
    lower.includes("refactor")
  )
    return "coding";
  if (
    lower.includes("search") ||
    lower.includes("find") ||
    lower.includes("look") ||
    lower.includes("what")
  )
    return "search";
  return "analysis";
}

function mapTaskType(
  t: TaskType,
): "analysis" | "coding" | "deployment" | "search" {
  if (t === TaskType.coding) return "coding";
  if (t === TaskType.deployment) return "deployment";
  if (t === TaskType.search) return "search";
  return "analysis";
}

function mapTaskTypeToBackend(t: string): TaskType {
  if (t === "coding") return TaskType.coding;
  if (t === "deployment") return TaskType.deployment;
  if (t === "search") return TaskType.search;
  return TaskType.analysis;
}

function mapLogStatus(s: LogStatus): "running" | "completed" | "error" {
  if (s === LogStatus.running) return "running";
  if (s === LogStatus.error) return "error";
  return "completed";
}

function mapPlanStatus(
  s: PlanStepStatus,
): "pending" | "in-progress" | "done" | "error" {
  if (s === PlanStepStatus.inProgress) return "in-progress";
  if (s === PlanStepStatus.done) return "done";
  if (s === PlanStepStatus.error) return "error";
  return "pending";
}

function mapErrorType(
  e: ErrorType,
): "timeout" | "parsing" | "tool-failure" | "logic" {
  if (e === ErrorType.timeout) return "timeout";
  if (e === ErrorType.parsing) return "parsing";
  if (e === ErrorType.toolFailure) return "tool-failure";
  return "logic";
}

function mapErrorTypeToBackend(e: string): ErrorType {
  if (e === "timeout") return ErrorType.timeout;
  if (e === "parsing") return ErrorType.parsing;
  if (e === "tool-failure") return ErrorType.toolFailure;
  return ErrorType.logic;
}

function mapMemoryType(m: MemoryType): "action" | "preference" | "session" {
  if (m === MemoryType.preference) return "preference";
  if (m === MemoryType.session) return "session";
  return "action";
}

function mapToolName(t: Tool): "github" | "deployment" | "filesystem" {
  if (t === Tool.gitHub) return "github";
  if (t === Tool.deployment) return "deployment";
  return "filesystem";
}

function getToolLabel(t: Tool): string {
  if (t === Tool.gitHub) return "GitHub";
  if (t === Tool.deployment) return "Deployment";
  return "File System";
}

function mapToolToBackend(name: string): Tool {
  if (name === "github") return Tool.gitHub;
  if (name === "deployment") return Tool.deployment;
  return Tool.fileSystem;
}

export default App;
