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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Code2,
  Download,
  FileCode,
  FolderOpen,
  History,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApiKeys } from "../hooks/useApiKeys";
import { streamClaude, streamGroq } from "../utils/claudeStream";

interface GeneratedFile {
  name: string;
  content: string;
}

interface Generation {
  id: string;
  prompt: string;
  files: GeneratedFile[];
  timestamp: number;
}

const CODE_GEN_SYSTEM_PROMPT = `You are an expert full-stack developer. When given a request, generate a complete, working application with all necessary files.

Output format — for EACH file, use exactly:
=== filename.ext ===
<file content here>
=== END ===

Rules:
- Include ALL files needed (HTML, CSS, JS, config files, README, etc.)
- Write complete, production-quality code — no placeholders or TODOs
- For React apps, include package.json, index.html, src/App.jsx, src/index.js, src/index.css
- For Python apps, include requirements.txt and all .py files
- For HTML apps, include index.html and any CSS/JS files
- Make the code functional and complete, not just a skeleton
- Separate each file with the === filename === markers`;

function getLanguageClass(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "language-javascript",
    jsx: "language-javascript",
    ts: "language-typescript",
    tsx: "language-typescript",
    html: "language-html",
    css: "language-css",
    py: "language-python",
    json: "language-json",
    md: "language-markdown",
    sh: "language-bash",
    yaml: "language-yaml",
    yml: "language-yaml",
  };
  return map[ext] || "language-text";
}

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "\u{1F7E8}",
    jsx: "\u269B\uFE0F",
    ts: "\u{1F537}",
    tsx: "\u269B\uFE0F",
    html: "\u{1F310}",
    css: "\u{1F3A8}",
    py: "\u{1F40D}",
    json: "\u{1F4CB}",
    md: "\u{1F4DD}",
    sh: "\u2699\uFE0F",
    yaml: "\u{1F4C4}",
    yml: "\u{1F4C4}",
  };
  return map[ext] || "\u{1F4C4}";
}

/**
 * Build an uncompressed ZIP file from an array of files.
 * Pure browser implementation — no dependencies.
 */
function buildZip(fileList: { name: string; content: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of fileList) {
    const nameBytes = enc.encode(file.name);
    const dataBytes = enc.encode(file.content);
    const crc = crc32(dataBytes);

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true); // signature
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, 0, true); // compression (stored)
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    view.setUint32(14, crc, true);
    view.setUint32(18, dataBytes.length, true);
    view.setUint32(22, dataBytes.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    parts.push(localHeader, dataBytes);

    // Central directory entry
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cdEntry.buffer);
    cdView.setUint32(0, 0x02014b50, true); // signature
    cdView.setUint16(4, 20, true); // version made by
    cdView.setUint16(6, 20, true); // version needed
    cdView.setUint16(8, 0, true); // flags
    cdView.setUint16(10, 0, true); // compression
    cdView.setUint16(12, 0, true); // mod time
    cdView.setUint16(14, 0, true); // mod date
    cdView.setUint32(16, crc, true);
    cdView.setUint32(20, dataBytes.length, true);
    cdView.setUint32(24, dataBytes.length, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint16(30, 0, true);
    cdView.setUint16(32, 0, true);
    cdView.setUint16(34, 0, true);
    cdView.setUint16(36, 0, true);
    cdView.setUint32(38, 0, true); // external attrs
    cdView.setUint32(42, offset, true); // local header offset
    cdEntry.set(nameBytes, 46);

    centralDir.push(cdEntry);
    offset += localHeader.length + dataBytes.length;
  }

  const cdStart = offset;
  let cdSize = 0;
  for (const cd of centralDir) cdSize += cd.length;

  // End of central directory record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, fileList.length, true);
  eocdView.setUint16(10, fileList.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdStart, true);
  eocdView.setUint16(20, 0, true);

  const all = [...parts, ...centralDir, eocd];
  const total = all.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const a of all) {
    result.set(a, pos);
    pos += a.length;
  }
  return result;
}

function crc32(data: Uint8Array): number {
  const table = crc32.table;
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

crc32.table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function parseGeneratedFiles(response: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const regex = /===\s+([^\n]+?)\s+===\n([\s\S]*?)=== END ===/g;
  let match = regex.exec(response);
  while (match !== null) {
    files.push({
      name: match[1].trim(),
      content: match[2].trimEnd(),
    });
    match = regex.exec(response);
  }
  return files;
}

/**
 * Streaming version of callModel.
 * Streams tokens from Claude or Groq and returns the full text.
 * Falls back to non-streaming for OpenAI (GPT) models.
 */
async function callModelStream(
  prompt: string,
  model: string,
  keys: { groq: string; claude: string; openai: string },
  onToken: (token: string) => void,
): Promise<string> {
  const messages = [{ role: "user", content: prompt }];

  // OpenAI GPT — non-streaming (lower priority)
  if (model.startsWith("gpt")) {
    if (!keys.openai) throw new Error("OpenAI API key required");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keys.openai}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: CODE_GEN_SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 4096,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json();
    const text = data.choices[0]?.message?.content || "";
    onToken(text);
    return text;
  }

  // Claude — streaming
  if (model.startsWith("claude")) {
    if (!keys.claude)
      throw new Error(
        "Claude API key required — add it via the Key icon in the sidebar",
      );
    return streamClaude(
      messages,
      keys.claude,
      onToken,
      model,
      CODE_GEN_SYSTEM_PROMPT,
    );
  }

  // Default: Groq — streaming
  if (!keys.groq)
    throw new Error("Groq API key required — get one free at console.groq.com");
  return streamGroq(
    messages,
    keys.groq,
    onToken,
    model,
    CODE_GEN_SYSTEM_PROMPT,
  );
}

const STORAGE_KEY = "codegen_history";

function loadHistory(): Generation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(gens: Generation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gens.slice(0, 10)));
}

export function CodeGenPanel() {
  const { keys } = useApiKeys();

  // Set default model based on available keys — Claude if available, else Groq
  const [selectedModel, setSelectedModel] = useState(() =>
    keys.claude ? "claude-3-5-sonnet-20241022" : "llama3-70b-8192",
  );

  // Update default model when keys change
  useEffect(() => {
    setSelectedModel(
      keys.claude ? "claude-3-5-sonnet-20241022" : "llama3-70b-8192",
    );
  }, [keys.claude]);

  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState("auto");
  const [generating, setGenerating] = useState(false);
  const [streamingOutput, setStreamingOutput] = useState("");
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [history, setHistory] = useState<Generation[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);

  const modelOptions = [
    {
      value: "claude-3-5-sonnet-20241022",
      label: "\u{1F7E0} Claude 3.5 Sonnet (Best, requires Claude key)",
    },
    {
      value: "claude-3-opus-20240229",
      label: "\u{1F7E0} Claude 3 Opus (Powerful, requires Claude key)",
    },
    {
      value: "llama3-70b-8192",
      label: "\u{1F7E2} Groq Llama 3 70B (Free, Best for Code)",
    },
    {
      value: "llama3-8b-8192",
      label: "\u{1F7E2} Groq Llama 3 8B (Free, Fast)",
    },
    {
      value: "mixtral-8x7b-32768",
      label: "\u{1F7E2} Groq Mixtral 8x7B (Free)",
    },
    { value: "gpt-4", label: "\u{1F49B} GPT-4 (Requires OpenAI key)" },
    {
      value: "gpt-4-turbo",
      label: "\u{1F49B} GPT-4 Turbo (Requires OpenAI key)",
    },
  ];

  const frameworkOptions = [
    { value: "auto", label: "Auto-detect" },
    { value: "react", label: "React" },
    { value: "html", label: "HTML/CSS/JS" },
    { value: "python", label: "Python" },
    { value: "nodejs", label: "Node.js" },
    { value: "vue", label: "Vue" },
    { value: "other", label: "Other" },
  ];

  const activeFileContent =
    files.find((f) => f.name === activeFile)?.content || "";

  const buildPrompt = () => {
    const fw =
      framework !== "auto"
        ? `Use ${framework} as the framework/language. `
        : "";
    return `${fw}${prompt}`;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setFiles([]);
    setActiveFile(null);
    setStreamingOutput("");

    try {
      let accumulated = "";
      const fullOutput = await callModelStream(
        buildPrompt(),
        selectedModel,
        keys,
        (token) => {
          accumulated += token;
          setStreamingOutput(accumulated);
        },
      );

      setStreamingOutput("");
      const parsed = parseGeneratedFiles(fullOutput);

      if (parsed.length === 0) {
        const ext =
          framework === "python" ? "py" : framework === "html" ? "html" : "js";
        const singleFile = [{ name: `generated.${ext}`, content: fullOutput }];
        setFiles(singleFile);
        setActiveFile(singleFile[0].name);
        toast.warning(
          "Response not structured as files \u2014 displayed as single file",
        );
      } else {
        setFiles(parsed);
        setActiveFile(parsed[0].name);
        toast.success(
          `Generated ${parsed.length} file${parsed.length > 1 ? "s" : ""}`,
        );
      }

      const gen: Generation = {
        id: `gen-${Date.now()}`,
        prompt: prompt.trim(),
        files:
          parsed.length > 0
            ? parsed
            : [{ name: "output.txt", content: fullOutput }],
        timestamp: Date.now(),
      };
      const newHistory = [gen, ...history];
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error(msg);
      setStreamingOutput("");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (files.length === 0) return;
    // Build a simple uncompressed ZIP using the Compression Streams API or fallback
    const zipBytes = buildZip(files);
    const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-app.zip";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP downloaded");
  };

  const loadGeneration = (gen: Generation) => {
    setFiles(gen.files);
    setActiveFile(gen.files[0]?.name || null);
    setPrompt(gen.prompt);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Code Generator</span>
          {keys.claude ? (
            <Badge className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20 border">
              Claude Powered
            </Badge>
          ) : (
            <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20 border">
              Free w/ Groq
            </Badge>
          )}
          {generating && (
            <span className="flex items-center gap-1 text-[10px] text-primary/80 font-mono animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Streaming...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="codegen.history.toggle"
            >
              <History className="w-3.5 h-3.5" />
              History ({history.length})
            </button>
          )}
          {files.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadZip}
              className="h-7 text-xs gap-1.5"
              data-ocid="codegen.download_button"
            >
              <Download className="w-3 h-3" />
              Download ZIP
            </Button>
          )}
        </div>
      </div>

      {/* History dropdown */}
      {showHistory && (
        <div className="border-b border-border bg-card/20">
          <ScrollArea className="max-h-48">
            <div className="p-3 flex flex-col gap-1">
              {history.map((gen, i) => (
                <button
                  type="button"
                  key={gen.id}
                  onClick={() => loadGeneration(gen)}
                  className="text-left px-3 py-2 rounded-md hover:bg-accent/50 transition-colors"
                  data-ocid={`codegen.history.item.${i + 1}`}
                >
                  <p className="text-xs font-medium text-foreground truncate">
                    {gen.prompt}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {gen.files.length} files \u00b7{" "}
                    {new Date(gen.timestamp).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        {files.length > 0 && (
          <div className="w-56 shrink-0 border-r border-border bg-card/20 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <FolderOpen className="w-3.5 h-3.5" />
                Files ({files.length})
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 flex flex-col gap-0.5">
                {files.map((file, i) => (
                  <button
                    type="button"
                    key={file.name}
                    onClick={() => setActiveFile(file.name)}
                    data-ocid={`codegen.file.item.${i + 1}`}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-xs transition-all flex items-center gap-1.5",
                      activeFile === file.name
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                    )}
                  >
                    <span className="shrink-0">{getFileIcon(file.name)}</span>
                    <span className="truncate font-mono">{file.name}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Code viewer / streaming output */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {generating && streamingOutput ? (
            // Streaming view
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  <span className="text-xs font-mono text-primary/80">
                    Generating...
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {streamingOutput.length} chars
                  </span>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <pre
                  className="p-4 text-xs font-mono leading-relaxed text-green-300 whitespace-pre-wrap break-words"
                  data-ocid="codegen.streaming.panel"
                >
                  {streamingOutput}
                  <span className="inline-block w-[2px] h-[1em] bg-green-400/80 ml-0.5 align-middle animate-pulse" />
                </pre>
              </ScrollArea>
            </>
          ) : activeFile && activeFileContent ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono text-foreground">
                    {activeFile}
                  </span>
                  <Badge className="text-[10px] bg-muted text-muted-foreground border border-border">
                    {getLanguageClass(activeFile).replace("language-", "")}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeFileContent);
                    toast.success("Copied to clipboard");
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Copy
                </button>
              </div>
              <ScrollArea className="flex-1">
                <pre
                  className={cn(
                    "p-4 text-xs font-mono leading-relaxed overflow-x-auto",
                    getLanguageClass(activeFile),
                  )}
                >
                  <code className="text-green-300">{activeFileContent}</code>
                </pre>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">
                  Generate a Full App
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {keys.claude
                    ? "Claude 3.5 Sonnet is active \u2014 describe any app for production-quality code."
                    : "Groq Llama 3 is free \u2014 add your key in settings for live generation."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom prompt bar */}
      <div className="border-t border-border bg-card/20 px-4 py-3">
        <div className="flex gap-2 items-center mb-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger
              className="h-7 text-xs bg-background border-input w-72"
              data-ocid="codegen.model.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger
              className="h-7 text-xs bg-background border-input w-40"
              data-ocid="codegen.framework.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frameworkOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {files.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 ml-auto"
              onClick={() => {
                localStorage.setItem(
                  "codegen_files",
                  JSON.stringify({ files, timestamp: Date.now() }),
                );
                toast.success("Files sent to File Manager");
              }}
              data-ocid="codegen.send_to_files.button"
            >
              <Upload className="w-3 h-3" />
              Send to Files
            </Button>
          )}
        </div>

        <div className="flex gap-2 items-end">
          <Textarea
            data-ocid="codegen.prompt.input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Describe the app you want to build... (e.g. 'A todo app with React and local storage')"
            disabled={generating}
            className="flex-1 min-h-[52px] max-h-[120px] resize-none bg-background border-input text-sm"
            rows={2}
          />
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="h-12 px-4 gap-1.5 shrink-0"
            data-ocid="codegen.generate.primary_button"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Ctrl+Enter to generate \u00b7{" "}
          {keys.claude
            ? "Claude 3.5 Sonnet active \u2014 real-time streaming"
            : "Groq Llama 3 is free \u2014 get a key at console.groq.com"}
        </p>
      </div>
    </div>
  );
}
