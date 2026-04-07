import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plug,
  RefreshCw,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { categoryLabels, integrationCatalog } from "../data/integrationsData";
import type {
  IntegrationConfig,
  IntegrationState,
} from "../types/integrations";

type CategoryFilter = "all" | "ai" | "cloud" | "database" | "devtools" | "apis";

interface IntegrationsPanelProps {
  onConnectionChange?: (count: number) => void;
}

const categoryColors: Record<string, string> = {
  ai: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  cloud: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  database: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  devtools: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  apis: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

export function IntegrationsPanel({
  onConnectionChange,
}: IntegrationsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [integrationStates, setIntegrationStates] = useState<
    Record<string, IntegrationState>
  >({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationConfig | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );
  const prevCountRef = useRef(0);

  const connectedCount = useMemo(
    () => Object.values(integrationStates).filter((s) => s.connected).length,
    [integrationStates],
  );

  useEffect(() => {
    if (connectedCount !== prevCountRef.current) {
      prevCountRef.current = connectedCount;
      onConnectionChange?.(connectedCount);
    }
  }, [connectedCount, onConnectionChange]);

  const filtered = useMemo(() => {
    return integrationCatalog.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.capabilities.some((c) => c.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const connectedItems = useMemo(
    () =>
      integrationCatalog.filter(
        (item) => integrationStates[item.id]?.connected,
      ),
    [integrationStates],
  );

  function openConfig(integration: IntegrationConfig) {
    setSelectedIntegration(integration);
    const existing = integrationStates[integration.id];
    setFormValues(existing?.configValues ?? {});
    setTestStatus("idle");
    setShowPasswords({});
    setDialogOpen(true);
  }

  function handleFieldChange(key: string, value: string) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTestConnection() {
    setTestStatus("pending");
    await new Promise((r) => setTimeout(r, 1400));
    const requiredFilled = selectedIntegration?.configFields
      .filter((f) => f.required)
      .every((f) => (formValues[f.key] ?? "").trim().length > 0);
    setTestStatus(requiredFilled ? "success" : "error");
  }

  function handleConnect() {
    if (!selectedIntegration) return;
    setIntegrationStates((prev) => ({
      ...prev,
      [selectedIntegration.id]: {
        id: selectedIntegration.id,
        connected: true,
        configValues: formValues,
        lastTested: Date.now(),
        testStatus: testStatus === "success" ? "success" : undefined,
      },
    }));
    setDialogOpen(false);
  }

  function handleDisconnect() {
    if (!selectedIntegration) return;
    setIntegrationStates((prev) => ({
      ...prev,
      [selectedIntegration.id]: {
        ...prev[selectedIntegration.id],
        id: selectedIntegration.id,
        connected: false,
        configValues: formValues,
      },
    }));
    setDialogOpen(false);
  }

  const isConnected = selectedIntegration
    ? (integrationStates[selectedIntegration.id]?.connected ?? false)
    : false;

  const requiredFieldsFilled =
    selectedIntegration?.configFields
      .filter((f) => f.required)
      .every((f) => (formValues[f.key] ?? "").trim().length > 0) ?? false;

  return (
    <div className="flex flex-col flex-1 h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Plug className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-none">
              Integrations Hub
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect AI models, cloud platforms, databases, and APIs
            </p>
          </div>
          {connectedCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400">
                {connectedCount} connected
              </span>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-5">
          {/* Connected summary */}
          <AnimatePresence>
            {connectedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-green-500/5 border border-green-500/20 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-green-400">
                    Active Connections
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {connectedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openConfig(item)}
                      data-ocid="integrations.connected.button"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-green-500/10 border border-green-500/25 text-green-300 hover:bg-green-500/20 transition-colors"
                    >
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                      <CheckCircle2 className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-ocid="integrations.search_input"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border h-9 text-sm"
              />
            </div>
            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  data-ocid="integrations.category.tab"
                  onClick={() => setActiveCategory(key as CategoryFilter)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                    activeCategory === key
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "text-muted-foreground border-transparent hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  {label}
                  {key !== "all" && (
                    <span className="ml-1.5 text-[10px] opacity-60">
                      (
                      {
                        integrationCatalog.filter((i) => i.category === key)
                          .length
                      }
                      )
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} integration{filtered.length !== 1 ? "s" : ""}
              {searchQuery && ` for "${searchQuery}"`}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Integration Grid */}
          {filtered.length === 0 ? (
            <div
              data-ocid="integrations.empty_state"
              className="text-center py-16"
            >
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No integrations match your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((integration, idx) => {
                const state = integrationStates[integration.id];
                const connected = state?.connected ?? false;
                return (
                  <motion.div
                    key={integration.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      delay: Math.min(idx * 0.03, 0.3),
                    }}
                    data-ocid={`integrations.item.${idx + 1}`}
                    className={cn(
                      "group relative flex flex-col bg-card border rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20",
                      connected
                        ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
                        : "border-border hover:border-primary/30",
                    )}
                    onClick={() => openConfig(integration)}
                  >
                    {/* Connected indicator */}
                    {connected && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                    )}

                    {/* Icon + Name row */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border",
                          categoryColors[integration.category] ?? "bg-muted",
                        )}
                      >
                        {integration.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight truncate">
                          {integration.name}
                        </p>
                        <span
                          className={cn(
                            "inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wider",
                            categoryColors[integration.category] ?? "bg-muted",
                          )}
                        >
                          {categoryLabels[integration.category]}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {integration.description}
                    </p>

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {integration.capabilities.slice(0, 3).map((cap) => (
                        <span
                          key={cap}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50"
                        >
                          {cap}
                        </span>
                      ))}
                      {integration.capabilities.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
                          +{integration.capabilities.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="mt-auto">
                      <button
                        type="button"
                        data-ocid={`integrations.${connected ? "disconnect" : "connect"}.button`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openConfig(integration);
                        }}
                        className={cn(
                          "w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                          connected
                            ? "bg-green-500/10 border-green-500/25 text-green-400 hover:bg-green-500/20"
                            : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20",
                        )}
                      >
                        <Settings className="w-3 h-3" />
                        {connected ? "Manage" : "Configure"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Config Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="integrations.dialog"
          className="bg-card border-border max-w-md"
        >
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-xl border",
                      categoryColors[selectedIntegration.category] ??
                        "bg-muted",
                    )}
                  >
                    {selectedIntegration.icon}
                  </div>
                  <div>
                    <DialogTitle className="text-foreground text-base leading-tight">
                      {selectedIntegration.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      {isConnected
                        ? "Connected — manage your configuration"
                        : "Configure credentials to connect"}
                    </DialogDescription>
                  </div>
                  {selectedIntegration.docsUrl && (
                    <a
                      href={selectedIntegration.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </DialogHeader>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1.5 py-2 border-y border-border">
                {selectedIntegration.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Form fields */}
              <div className="space-y-3 py-2">
                {selectedIntegration.configFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {field.label}
                      {field.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        data-ocid="integrations.config.input"
                        type={
                          field.type === "password" && !showPasswords[field.key]
                            ? "password"
                            : "text"
                        }
                        placeholder={field.placeholder}
                        value={formValues[field.key] ?? ""}
                        onChange={(e) =>
                          handleFieldChange(field.key, e.target.value)
                        }
                        className="bg-background border-border h-8 text-sm pr-16 font-mono text-xs"
                      />
                      {field.type === "password" && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords((prev) => ({
                              ...prev,
                              [field.key]: !prev[field.key],
                            }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPasswords[field.key] ? "HIDE" : "SHOW"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Test status */}
              <AnimatePresence>
                {testStatus !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs border",
                      testStatus === "pending"
                        ? "bg-muted/50 border-border text-muted-foreground"
                        : testStatus === "success"
                          ? "bg-green-500/10 border-green-500/25 text-green-400"
                          : "bg-red-500/10 border-red-500/25 text-red-400",
                    )}
                    data-ocid={`integrations.test.${testStatus}_state`}
                  >
                    {testStatus === "pending" && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {testStatus === "success" && (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {testStatus === "error" && (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {testStatus === "pending"
                        ? "Testing connection..."
                        : testStatus === "success"
                          ? "Connection successful!"
                          : "Connection failed — check your credentials"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  data-ocid="integrations.test.button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testStatus === "pending" || !requiredFieldsFilled}
                  className="flex-1 border-border text-muted-foreground hover:text-foreground h-8 text-xs"
                >
                  {testStatus === "pending" ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Test Connection
                </Button>

                {isConnected ? (
                  <Button
                    data-ocid="integrations.disconnect.button"
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    data-ocid="integrations.connect.button"
                    size="sm"
                    onClick={handleConnect}
                    disabled={!requiredFieldsFilled}
                    className="flex-1 h-8 text-xs"
                  >
                    <Plug className="w-3.5 h-3.5 mr-1.5" />
                    Connect
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
