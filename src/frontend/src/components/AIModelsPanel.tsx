import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Bot,
  Brain,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useApiKeys } from "../hooks/useApiKeys";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ModelResponse {
  model: string;
  content: string;
  loading: boolean;
  error?: string;
}

async function callGroq(
  messages: { role: string; content: string }[],
  apiKey: string,
  model = "llama3-8b-8192",
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

async function callOpenAI(
  messages: { role: string; content: string }[],
  apiKey: string,
  model = "gpt-3.5-turbo",
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

async function callClaude(
  messages: { role: string; content: string }[],
  apiKey: string,
  model = "claude-3-haiku-20240307",
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: messages.filter((m) => m.role !== "system"),
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return data.content[0]?.text || "";
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Individual model chat tab
function ModelChatTab({
  modelId,
  modelLabel,
  modelOptions,
  apiKey,
  callFn,
}: {
  modelId: string;
  modelLabel: string;
  modelOptions: { value: string; label: string }[];
  apiKey: string;
  callFn: (
    messages: { role: string; content: string }[],
    key: string,
    model: string,
  ) => Promise<string>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(
    modelOptions[0]?.value || "",
  );
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      if (!apiKey) throw new Error("NO_KEY");
      const apiMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await callFn(apiMessages, apiKey, selectedModel);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, timestamp: Date.now() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const errorContent =
        msg === "NO_KEY"
          ? "Please add your API key in Settings (Key icon in sidebar)."
          : modelId === "claude" &&
              (msg.includes("Failed to fetch") || msg.includes("CORS"))
            ? "Claude's API blocks browser requests. Use the Groq tab (free & works directly), or set up a backend proxy."
            : `Error: ${msg}`;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorContent, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const hasKey = Boolean(apiKey);

  return (
    <div className="flex flex-col h-full">
      {/* Model selector bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/30">
        <span className="text-xs text-muted-foreground">Model:</span>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger
            className="h-7 w-48 text-xs bg-background border-input"
            data-ocid={`ai.${modelId}.select`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modelOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge
          className={cn(
            "text-[10px] font-mono border ml-auto",
            hasKey
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
          )}
        >
          {hasKey ? "● Live" : "No Key"}
        </Badge>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-muted-foreground hover:text-destructive transition-colors"
            data-ocid={`ai.${modelId}.delete_button`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Chat with {modelLabel}</p>
              {!hasKey && (
                <p className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2 max-w-xs">
                  Add your {modelLabel} API key via the Key icon in the sidebar
                </p>
              )}
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`${i}-${msg.timestamp}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border",
                    msg.role === "user"
                      ? "bg-blue-500/20 border-blue-500/30"
                      : "bg-primary/20 border-primary/30",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="w-3 h-3 text-blue-400" />
                  ) : (
                    <Bot className="w-3 h-3 text-primary" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-blue-500/15 border border-blue-500/20 text-foreground"
                      : "bg-card border border-border text-foreground",
                  )}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2.5 items-start"
              data-ocid={`ai.${modelId}.loading_state`}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/20 border border-primary/30">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-typing" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-typing [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-typing [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2 items-end">
          <Textarea
            data-ocid={`ai.${modelId}.input`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${modelLabel}...`}
            disabled={loading}
            className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-background border-input text-sm"
            rows={1}
          />
          <Button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-9 w-9 shrink-0"
            data-ocid={`ai.${modelId}.submit_button`}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Unified split-view mode
function UnifiedView({
  keys,
}: { keys: ReturnType<typeof useApiKeys>["keys"] }) {
  const [prompt, setPrompt] = useState("");
  const [leftResp, setLeftResp] = useState<ModelResponse>({
    model: "claude-3-haiku",
    content: "",
    loading: false,
  });
  const [rightResp, setRightResp] = useState<ModelResponse>({
    model: "gpt-3.5-turbo",
    content: "",
    loading: false,
  });

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text) return;
    setPrompt("");

    const msgs = [{ role: "user", content: text }];

    setLeftResp({ model: "claude-3-haiku", content: "", loading: true });
    setRightResp({ model: "gpt-3.5-turbo", content: "", loading: true });

    const [claudeResult, openaiResult] = await Promise.allSettled([
      keys.claude
        ? callClaude(msgs, keys.claude)
        : Promise.reject(new Error("NO_KEY")),
      keys.openai
        ? callOpenAI(msgs, keys.openai)
        : Promise.reject(new Error("NO_KEY")),
    ]);

    setLeftResp({
      model: "claude-3-haiku",
      loading: false,
      content:
        claudeResult.status === "fulfilled"
          ? claudeResult.value
          : claudeResult.reason?.message === "NO_KEY"
            ? ""
            : claudeResult.reason?.message || "Error",
      error:
        claudeResult.status === "rejected"
          ? claudeResult.reason?.message === "NO_KEY"
            ? "Add Claude API key in settings"
            : claudeResult.reason?.message || "Error"
          : undefined,
    });

    setRightResp({
      model: "gpt-3.5-turbo",
      loading: false,
      content:
        openaiResult.status === "fulfilled"
          ? openaiResult.value
          : openaiResult.reason?.message === "NO_KEY"
            ? ""
            : openaiResult.reason?.message || "Error",
      error:
        openaiResult.status === "rejected"
          ? openaiResult.reason?.message === "NO_KEY"
            ? "Add OpenAI API key in settings"
            : openaiResult.reason?.message || "Error"
          : undefined,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Split columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Claude column */}
        <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-card/30 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs font-semibold">Claude (Haiku)</span>
            {Boolean(keys.claude) && (
              <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20 border ml-auto">
                Live
              </Badge>
            )}
          </div>
          <ScrollArea className="flex-1 p-4">
            {leftResp.loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-4 h-4 rounded-full border border-primary border-t-transparent animate-spin" />
                Thinking...
              </div>
            )}
            {leftResp.error && !leftResp.loading && (
              <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                {leftResp.error}
              </div>
            )}
            {leftResp.content && !leftResp.loading && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {leftResp.content}
              </p>
            )}
            {!leftResp.content && !leftResp.loading && !leftResp.error && (
              <p className="text-muted-foreground text-sm">
                Claude response will appear here
              </p>
            )}
          </ScrollArea>
        </div>

        {/* ChatGPT column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-card/30 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-semibold">ChatGPT (GPT-3.5)</span>
            {Boolean(keys.openai) && (
              <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20 border ml-auto">
                Live
              </Badge>
            )}
          </div>
          <ScrollArea className="flex-1 p-4">
            {rightResp.loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-4 h-4 rounded-full border border-primary border-t-transparent animate-spin" />
                Thinking...
              </div>
            )}
            {rightResp.error && !rightResp.loading && (
              <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                {rightResp.error}
              </div>
            )}
            {rightResp.content && !rightResp.loading && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {rightResp.content}
              </p>
            )}
            {!rightResp.content && !rightResp.loading && !rightResp.error && (
              <p className="text-muted-foreground text-sm">
                ChatGPT response will appear here
              </p>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Shared input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2 items-end">
          <Textarea
            data-ocid="ai.unified.input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Send to Claude and ChatGPT simultaneously..."
            disabled={leftResp.loading || rightResp.loading}
            className="flex-1 min-h-[40px] max-h-[100px] resize-none bg-background border-input text-sm"
            rows={1}
          />
          <Button
            type="button"
            onClick={handleSend}
            disabled={leftResp.loading || rightResp.loading || !prompt.trim()}
            size="icon"
            className="h-9 w-9 shrink-0"
            data-ocid="ai.unified.submit_button"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

type IndividualModel = "claude" | "openai" | "groq" | "gemini";

export function AIModelsPanel() {
  const { keys, refreshKeys } = useApiKeys();

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh on mount
  useEffect(() => {
    refreshKeys();
  }, []);

  const groqModels = [
    { value: "llama3-8b-8192", label: "Llama 3 8B (Free)" },
    { value: "llama3-70b-8192", label: "Llama 3 70B (Free)" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Free)" },
    { value: "gemma-7b-it", label: "Gemma 7B (Free)" },
  ];

  const claudeModels = [
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
    { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  ];

  const openaiModels = [
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4o", label: "GPT-4o" },
  ];

  const geminiModels = [
    { value: "gemini-pro", label: "Gemini Pro" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ];

  const getCallFn = (model: IndividualModel) => {
    switch (model) {
      case "claude":
        return (
          msgs: { role: string; content: string }[],
          key: string,
          m: string,
        ) => callClaude(msgs, key, m);
      case "openai":
        return (
          msgs: { role: string; content: string }[],
          key: string,
          m: string,
        ) => callOpenAI(msgs, key, m);
      case "gemini":
        return (
          msgs: { role: string; content: string }[],
          key: string,
          _m: string,
        ) => callGemini(msgs[msgs.length - 1]?.content || "", key);
      default:
        return (
          msgs: { role: string; content: string }[],
          key: string,
          m: string,
        ) => callGroq(msgs, key, m);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">AI Models</span>
          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">
            Multi-Model
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Groq Free
        </div>
      </div>

      {/* Mode tabs */}
      <Tabs
        defaultValue="individual"
        className="flex flex-col flex-1 overflow-hidden"
      >
        <TabsList className="mx-4 mt-3 mb-0 h-8 self-start bg-muted/50">
          <TabsTrigger
            value="unified"
            className="text-xs h-7"
            data-ocid="ai.unified.tab"
          >
            Unified (Split)
          </TabsTrigger>
          <TabsTrigger
            value="individual"
            className="text-xs h-7"
            data-ocid="ai.individual.tab"
          >
            Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unified" className="flex-1 overflow-hidden mt-3">
          <UnifiedView keys={keys} />
        </TabsContent>

        <TabsContent value="individual" className="flex-1 overflow-hidden mt-3">
          <Tabs
            defaultValue="groq"
            className="flex flex-col h-full overflow-hidden"
          >
            <TabsList className="mx-4 mb-0 h-8 self-start bg-muted/50">
              <TabsTrigger
                value="groq"
                className="text-xs h-7"
                data-ocid="ai.groq.tab"
              >
                🟢 Groq (Free)
              </TabsTrigger>
              <TabsTrigger
                value="claude"
                className="text-xs h-7"
                data-ocid="ai.claude.tab"
              >
                Claude
              </TabsTrigger>
              <TabsTrigger
                value="openai"
                className="text-xs h-7"
                data-ocid="ai.openai.tab"
              >
                ChatGPT
              </TabsTrigger>
              <TabsTrigger
                value="gemini"
                className="text-xs h-7"
                data-ocid="ai.gemini.tab"
              >
                Gemini
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groq" className="flex-1 overflow-hidden mt-2">
              <ModelChatTab
                modelId="groq"
                modelLabel="Groq Llama 3"
                modelOptions={groqModels}
                apiKey={keys.groq}
                callFn={getCallFn("groq")}
              />
            </TabsContent>

            <TabsContent value="claude" className="flex-1 overflow-hidden mt-2">
              <ModelChatTab
                modelId="claude"
                modelLabel="Claude"
                modelOptions={claudeModels}
                apiKey={keys.claude}
                callFn={getCallFn("claude")}
              />
            </TabsContent>

            <TabsContent value="openai" className="flex-1 overflow-hidden mt-2">
              <ModelChatTab
                modelId="openai"
                modelLabel="ChatGPT"
                modelOptions={openaiModels}
                apiKey={keys.openai}
                callFn={getCallFn("openai")}
              />
            </TabsContent>

            <TabsContent value="gemini" className="flex-1 overflow-hidden mt-2">
              <ModelChatTab
                modelId="gemini"
                modelLabel="Gemini"
                modelOptions={geminiModels}
                apiKey={keys.gemini}
                callFn={getCallFn("gemini")}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
