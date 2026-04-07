import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Key, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ApiKeys } from "../hooks/useApiKeys";

interface ApiKeysDialogProps {
  keys: ApiKeys;
  onSave: (keys: ApiKeys) => void;
}

interface FieldConfig {
  key: keyof ApiKeys;
  label: string;
  placeholder: string;
  docsUrl: string;
}

const fields: FieldConfig[] = [
  {
    key: "groq",
    label: "Groq API Key (Free — Llama 3)",
    placeholder: "gsk_...",
    docsUrl: "https://console.groq.com",
  },
  {
    key: "claude",
    label: "Claude API Key (Anthropic)",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com",
  },
  {
    key: "openai",
    label: "OpenAI API Key (ChatGPT)",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    key: "gemini",
    label: "Gemini API Key (Google)",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com",
  },
  {
    key: "together",
    label: "Together.ai API Key",
    placeholder: "...",
    docsUrl: "https://api.together.xyz",
  },
  {
    key: "github",
    label: "GitHub Personal Access Token",
    placeholder: "ghp_...",
    docsUrl: "https://github.com/settings/tokens",
  },
];

export function ApiKeysDialog({ keys, onSave }: ApiKeysDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ApiKeys>(keys);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setDraft(keys);
    setOpen(isOpen);
  };

  const handleSave = () => {
    onSave(draft);
    toast.success("API keys saved");
    setOpen(false);
  };

  const savedCount = Object.values(keys).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          data-ocid="apikeys.open_modal_button"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        >
          <Key className="w-4 h-4 shrink-0" />
          <span>API Keys</span>
          {savedCount > 0 && (
            <span className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[10px] text-green-400 font-mono">
                {savedCount}
              </span>
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-w-lg bg-card border-border"
        data-ocid="apikeys.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            API Keys Manager
          </DialogTitle>
          <DialogDescription>
            Keys are stored locally in your browser and never sent to any
            server.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {fields.map((field) => {
            const hasValue = Boolean(keys[field.key]);
            const isVisible = showFields[field.key];
            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {field.label}
                  </Label>
                  <div className="flex items-center gap-2">
                    {hasValue && (
                      <Badge className="text-[10px] py-0 px-1.5 bg-green-500/10 text-green-400 border-green-500/20">
                        Saved
                      </Badge>
                    )}
                    <a
                      href={field.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      Get key ↗
                    </a>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    type={isVisible ? "text" : "password"}
                    placeholder={field.placeholder}
                    value={draft[field.key]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="pr-10 bg-background border-input text-sm font-mono"
                    data-ocid={`apikeys.${field.key}.input`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowFields((prev) => ({
                        ...prev,
                        [field.key]: !prev[field.key],
                      }))
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isVisible ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            Groq is free — get a key at console.groq.com
          </p>
          <Button
            onClick={handleSave}
            size="sm"
            className="gap-1.5"
            data-ocid="apikeys.save_button"
          >
            <Save className="w-3.5 h-3.5" />
            Save Keys
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
