import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, RotateCcw, Send, User, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useApiKeys } from "../hooks/useApiKeys";
import type { AgentMode, ChatMessage } from "../types/agent";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isExecuting: boolean;
  mode: AgentMode;
}

const modeColors = {
  caffeine: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  normal: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  deep: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

const taskTypeColors = {
  analysis: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  coding: "text-green-400 bg-green-400/10 border-green-400/20",
  deployment: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  search: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

export function ChatPanel({
  messages,
  onSendMessage,
  isExecuting,
  mode,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { keys } = useApiKeys();

  // Determine active model for badge
  const activeModel: "claude" | "groq" | "none" = keys.claude
    ? "claude"
    : keys.groq
      ? "groq"
      : "none";

  // Check if any message is currently streaming
  const hasStreamingMsg = messages.some((m) => m.isStreaming);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll trigger
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isExecuting, hasStreamingMsg]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isExecuting) return;
    onSendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col flex-1 border-r border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Chat Interface</span>
          {isExecuting && (
            <span className="flex items-center gap-1.5 text-xs text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Executing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Model badge */}
          {activeModel === "claude" && (
            <span
              className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded font-mono"
              data-ocid="chat.model.toggle"
            >
              <Zap className="w-2.5 h-2.5" /> Claude
            </span>
          )}
          {activeModel === "groq" && (
            <span
              className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded font-mono"
              data-ocid="chat.model.toggle"
            >
              <Zap className="w-2.5 h-2.5" /> Groq
            </span>
          )}
          {activeModel === "none" && (
            <span
              className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 border border-border px-1.5 py-0.5 rounded font-mono"
              data-ocid="chat.model.toggle"
            >
              No Key
            </span>
          )}
          <Badge
            className={cn("text-[10px] font-mono border", modeColors[mode])}
          >
            {mode.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-base font-semibold">Caffeine Agent Ready</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Send a task to start. The agent will plan, execute, and show you
                live progress in the right panel.
              </p>
              {activeModel === "none" && (
                <p className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded-lg max-w-sm">
                  Add a Claude or Groq API key via the Key icon in the sidebar
                  for real AI responses.
                </p>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                data-ocid={`chat.item.${i + 1}`}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border",
                    msg.role === "user"
                      ? "bg-blue-500/20 border-blue-500/30"
                      : "bg-primary/20 border-primary/30",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "flex flex-col gap-1.5 max-w-[80%]",
                    msg.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-blue-500/15 border border-blue-500/20 text-foreground"
                        : "bg-card border border-border text-foreground",
                    )}
                  >
                    {msg.contentType === "code" && msg.codeData ? (
                      <div>
                        <p className="text-muted-foreground mb-2">
                          {msg.content}
                        </p>
                        <div className="rounded-lg bg-background border border-border overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">
                              {msg.codeData.language}
                            </span>
                          </div>
                          <pre className="p-3 text-xs font-mono text-green-300 overflow-x-auto">
                            <code>{msg.codeData.code}</code>
                          </pre>
                        </div>
                      </div>
                    ) : msg.contentType === "mixed" && msg.tableData ? (
                      <div>
                        <MessageText content={msg.content} />
                        <div className="mt-3 rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/30">
                                {msg.tableData.headers.map((h) => (
                                  <th
                                    key={h}
                                    className="px-3 py-2 text-left text-muted-foreground font-medium border-b border-border"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.tableData.rows.map((row) => (
                                <tr
                                  key={row[0]}
                                  className="border-b border-border/50 last:border-0 hover:bg-accent/20"
                                >
                                  {row.map((cell) => (
                                    <td key={cell} className="px-3 py-2">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <MessageText
                        content={msg.content}
                        isStreaming={msg.isStreaming}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(msg.timestamp)}
                    </span>
                    {msg.taskType && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border font-mono",
                          taskTypeColors[msg.taskType],
                        )}
                      >
                        {msg.taskType}
                      </span>
                    )}
                    {msg.isStreaming && (
                      <span className="text-[10px] text-primary/60 font-mono animate-pulse">
                        streaming...
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator — only when executing and NO streaming message yet */}
          {isExecuting && !hasStreamingMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 items-start"
              data-ocid="chat.loading_state"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-primary/20 border border-primary/30">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-typing [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/20">
        <div className="flex gap-2 items-end">
          <Textarea
            data-ocid="chat.input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isExecuting
                ? "Agent is executing..."
                : "Describe a task for the agent..."
            }
            disabled={isExecuting}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-background border-border text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/50"
            rows={1}
          />
          <Button
            type="button"
            data-ocid="chat.submit_button"
            onClick={handleSend}
            disabled={isExecuting || !input.trim()}
            size="icon"
            className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted-foreground">
            Shift+Enter for newline · Enter to send
          </p>
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            onClick={() => setInput("")}
          >
            <RotateCcw className="w-2.5 h-2.5" /> Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageText({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  // For streaming messages, do a simple pre-formatted render to avoid layout thrash
  if (isStreaming) {
    return (
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {content}
        <span className="inline-block w-[2px] h-[1em] bg-primary/80 ml-0.5 align-middle animate-pulse" />
      </div>
    );
  }

  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const key = `${i}-${line.slice(0, 20)}`;
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={key} className="font-semibold text-foreground">
              {line.slice(2, -2)}
            </p>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p
              key={key}
              className="pl-3 before:content-['·'] before:mr-2 before:text-primary before:font-bold"
            >
              {line.slice(2)}
            </p>
          );
        }
        if (line === "") return <br key={key} />;
        return <p key={key}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return (
    <>
      {parts.map((p, i) => {
        const key = `${i}-${p.slice(0, 10)}`;
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={key} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code
              key={key}
              className="font-mono text-[11px] bg-muted/50 px-1 rounded text-cyan-300"
            >
              {p.slice(1, -1)}
            </code>
          );
        }
        return <span key={key}>{p}</span>;
      })}
    </>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
