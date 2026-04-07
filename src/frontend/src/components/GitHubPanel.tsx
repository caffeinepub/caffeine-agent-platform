import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Check,
  ExternalLink,
  GitBranch,
  Github,
  Globe,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApiKeys } from "../hooks/useApiKeys";

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  updated_at: string;
  default_branch: string;
  html_url: string;
}

interface FileProgress {
  name: string;
  status: "pending" | "uploading" | "done" | "error";
}

async function githubRequest(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub API error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function btoa64(str: string): string {
  // Encode UTF-8 string to base64
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(Number.parseInt(p1, 16)),
    ),
  );
}

export function GitHubPanel() {
  const { keys, saveKeys } = useApiKeys();
  const [pat, setPat] = useState(keys.github);
  const [connecting, setConnecting] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [commitMsg, setCommitMsg] = useState("Add generated code");
  const [pushing, setPushing] = useState(false);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [pagesUrl, setPagesUrl] = useState("");
  const [enablingPages, setEnablingPages] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [showCreateRepo, setShowCreateRepo] = useState(false);

  // Load stored code gen files
  const codeGenData = (() => {
    try {
      const raw = localStorage.getItem("codegen_files");
      if (raw)
        return JSON.parse(raw) as {
          files: { name: string; content: string }[];
        };
    } catch {}
    return null;
  })();

  const codeFiles = codeGenData?.files || [];

  const connect = async () => {
    if (!pat.trim()) return;
    setConnecting(true);
    try {
      const userData = await githubRequest("/user", pat);
      setUser(userData);
      saveKeys({ ...keys, github: pat });
      toast.success(`Connected as @${userData.login}`);
      loadRepos(pat);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error(`GitHub: ${msg}`);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setUser(null);
    setRepos([]);
    setSelectedRepo(null);
    setPagesUrl("");
    toast.info("Disconnected from GitHub");
  };

  const loadRepos = async (token = pat) => {
    setLoadingRepos(true);
    try {
      const data = await githubRequest(
        "/user/repos?per_page=100&sort=updated",
        token,
      );
      setRepos(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load repos";
      toast.error(msg);
    } finally {
      setLoadingRepos(false);
    }
  };

  const createRepo = async () => {
    if (!newRepoName.trim() || !user) return;
    setCreatingRepo(true);
    try {
      const repo = await githubRequest("/user/repos", pat, {
        method: "POST",
        body: JSON.stringify({
          name: newRepoName.trim(),
          description: newRepoDesc.trim() || undefined,
          private: newRepoPrivate,
          auto_init: true,
        }),
      });
      toast.success(`Repository '${repo.name}' created!`);
      setRepos((prev) => [repo, ...prev]);
      setShowCreateRepo(false);
      setNewRepoName("");
      setNewRepoDesc("");
      setSelectedRepo(repo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create repo";
      toast.error(msg);
    } finally {
      setCreatingRepo(false);
    }
  };

  const pushFiles = async () => {
    if (!selectedRepo || !user) return;
    const filesToPush = codeFiles;
    if (filesToPush.length === 0) {
      toast.error("No files to push. Generate code first, then push.");
      return;
    }

    setPushing(true);
    setFileProgress(
      filesToPush.map((f) => ({ name: f.name, status: "pending" as const })),
    );

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < filesToPush.length; i++) {
      const file = filesToPush[i];
      setFileProgress((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: "uploading" } : p)),
      );

      try {
        // Check if file exists to get its SHA
        let sha: string | undefined;
        try {
          const existing = await githubRequest(
            `/repos/${user.login}/${selectedRepo.name}/contents/${file.name}`,
            pat,
          );
          sha = existing?.sha;
        } catch {
          // File doesn't exist yet — that's fine
        }

        await githubRequest(
          `/repos/${user.login}/${selectedRepo.name}/contents/${file.name}`,
          pat,
          {
            method: "PUT",
            body: JSON.stringify({
              message: commitMsg,
              content: btoa64(file.content),
              ...(sha ? { sha } : {}),
            }),
          },
        );

        setFileProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "done" } : p)),
        );
        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Push failed";
        setFileProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "error" } : p)),
        );
        errorCount++;
        console.error(`Push error for ${file.name}: ${msg}`);
      }
    }

    setPushing(false);
    if (successCount > 0) {
      toast.success(
        `Pushed ${successCount} file${successCount > 1 ? "s" : ""} to ${selectedRepo.name}`,
      );
    }
    if (errorCount > 0) {
      toast.error(
        `${errorCount} file${errorCount > 1 ? "s" : ""} failed to push`,
      );
    }
  };

  const enablePages = async () => {
    if (!selectedRepo || !user) return;
    setEnablingPages(true);
    try {
      await githubRequest(
        `/repos/${user.login}/${selectedRepo.name}/pages`,
        pat,
        {
          method: "POST",
          body: JSON.stringify({
            source: {
              branch: selectedRepo.default_branch || "main",
              path: "/",
            },
          }),
        },
      );
      const url = `https://${user.login}.github.io/${selectedRepo.name}`;
      setPagesUrl(url);
      toast.success("GitHub Pages enabled!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to enable Pages";
      // Pages may already be enabled
      if (msg.toLowerCase().includes("already") || msg.includes("409")) {
        const url = `https://${user.login}.github.io/${selectedRepo.name}`;
        setPagesUrl(url);
        toast.info("GitHub Pages already enabled");
      } else {
        toast.error(`Pages: ${msg}`);
      }
    } finally {
      setEnablingPages(false);
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(repoSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/40">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">GitHub</span>
          {user && (
            <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20 border">
              Connected
            </Badge>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={user.avatar_url} />
              <AvatarFallback>{user.login[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">@{user.login}</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-6">
          {/* Connection section */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Connection
            </h3>
            {!user ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Personal Access Token
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="ghp_... (needs repo + pages scopes)"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && connect()}
                      className="flex-1 bg-background border-input text-sm font-mono"
                      data-ocid="github.pat.input"
                    />
                    <Button
                      onClick={connect}
                      disabled={connecting || !pat.trim()}
                      size="sm"
                      className="gap-1.5 shrink-0"
                      data-ocid="github.connect.primary_button"
                    >
                      {connecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Github className="w-3.5 h-3.5" />
                      )}
                      Connect
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Generate at github.com/settings/tokens — needs{" "}
                    <code className="font-mono bg-muted px-1 rounded">
                      repo
                    </code>{" "}
                    and{" "}
                    <code className="font-mono bg-muted px-1 rounded">
                      pages
                    </code>{" "}
                    scopes
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.login[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {user.name || user.login}
                  </p>
                  <p className="text-xs text-muted-foreground">@{user.login}</p>
                </div>
                <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20 border">
                  ● Connected
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={disconnect}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  data-ocid="github.disconnect.button"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </section>

          {/* Repositories section */}
          {user && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Repositories ({repos.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadRepos()}
                    disabled={loadingRepos}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-ocid="github.repos.refresh.button"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3.5 h-3.5",
                        loadingRepos && "animate-spin",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateRepo(!showCreateRepo)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                    data-ocid="github.create_repo.open_modal_button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Repo
                  </button>
                </div>
              </div>

              {/* Create repo form */}
              {showCreateRepo && (
                <div className="mb-3 p-3 rounded-lg border border-border bg-card/30 flex flex-col gap-2">
                  <Input
                    placeholder="Repository name"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    className="h-8 text-sm bg-background border-input"
                    data-ocid="github.new_repo.name.input"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    className="h-8 text-sm bg-background border-input"
                    data-ocid="github.new_repo.desc.input"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newRepoPrivate}
                        onCheckedChange={setNewRepoPrivate}
                        data-ocid="github.new_repo.private.switch"
                      />
                      <Label className="text-xs">
                        {newRepoPrivate ? (
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Public
                          </span>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCreateRepo(false)}
                        className="h-7 text-xs"
                        data-ocid="github.new_repo.cancel_button"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={createRepo}
                        disabled={creatingRepo || !newRepoName.trim()}
                        className="h-7 text-xs gap-1"
                        data-ocid="github.new_repo.submit_button"
                      >
                        {creatingRepo && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        Create
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Input
                placeholder="Search repositories..."
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="h-8 text-sm bg-background border-input mb-2"
                data-ocid="github.repo_search.search_input"
              />

              {loadingRepos ? (
                <div
                  className="flex items-center gap-2 py-4 text-muted-foreground text-sm"
                  data-ocid="github.repos.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading repositories...
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredRepos.map((repo, i) => (
                    <button
                      type="button"
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo)}
                      data-ocid={`github.repo.item.${i + 1}`}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg border transition-all",
                        selectedRepo?.id === repo.id
                          ? "bg-primary/10 border-primary/25 text-foreground"
                          : "bg-card/20 border-border hover:bg-accent/30 text-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {repo.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            className={cn(
                              "text-[9px] py-0 px-1.5 border",
                              repo.private
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20",
                            )}
                          >
                            {repo.private ? (
                              <Lock className="w-2.5 h-2.5" />
                            ) : (
                              <Unlock className="w-2.5 h-2.5" />
                            )}
                          </Badge>
                          {selectedRepo?.id === repo.id && (
                            <Check className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                      </div>
                      {repo.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 pl-5 truncate">
                          {repo.description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">
                        Updated {new Date(repo.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                  {filteredRepos.length === 0 && (
                    <p
                      className="text-xs text-muted-foreground py-4 text-center"
                      data-ocid="github.repos.empty_state"
                    >
                      No repositories found
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Push Code section */}
          {user && selectedRepo && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Push Code to {selectedRepo.name}
              </h3>

              {codeFiles.length === 0 ? (
                <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-400">
                  No generated files found. Use the Code Generator to create
                  files, then come back here to push.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-lg border border-border bg-card/20">
                    <p className="text-xs font-medium mb-2">
                      Files to push ({codeFiles.length})
                    </p>
                    <div className="flex flex-col gap-1">
                      {codeFiles.slice(0, 8).map((f, i) => {
                        const prog = fileProgress.find(
                          (p) => p.name === f.name,
                        );
                        return (
                          <div
                            key={f.name}
                            className="flex items-center gap-2 text-xs"
                            data-ocid={`github.push_file.item.${i + 1}`}
                          >
                            <span className="font-mono text-muted-foreground flex-1 truncate">
                              {f.name}
                            </span>
                            {prog && (
                              <Badge
                                className={cn(
                                  "text-[9px] py-0 px-1.5 border",
                                  prog.status === "done"
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : prog.status === "error"
                                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                                      : prog.status === "uploading"
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        : "bg-muted text-muted-foreground border-border",
                                )}
                              >
                                {prog.status === "uploading" && (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                                )}
                                {prog.status}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      {codeFiles.length > 8 && (
                        <p className="text-[10px] text-muted-foreground">
                          +{codeFiles.length - 8} more files
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Commit message
                    </Label>
                    <Input
                      value={commitMsg}
                      onChange={(e) => setCommitMsg(e.target.value)}
                      className="h-8 text-sm bg-background border-input"
                      data-ocid="github.commit_msg.input"
                    />
                  </div>

                  <Button
                    onClick={pushFiles}
                    disabled={pushing}
                    className="gap-2"
                    data-ocid="github.push.primary_button"
                  >
                    {pushing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {pushing ? "Pushing..." : "Push to GitHub"}
                  </Button>

                  {fileProgress.every((p) => p.status === "done") &&
                    fileProgress.length > 0 && (
                      <div
                        className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20"
                        data-ocid="github.push.success_state"
                      >
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-400">
                          All files pushed!
                        </span>
                        <a
                          href={selectedRepo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View repo <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                </div>
              )}
            </section>
          )}

          {/* GitHub Pages section */}
          {user && selectedRepo && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                GitHub Pages — Free Hosting
              </h3>
              <div className="p-3 rounded-lg border border-border bg-card/20 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">
                      Deploy to GitHub Pages
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Publish your app for free at{" "}
                      <span className="font-mono">
                        {user.login}.github.io/{selectedRepo.name}
                      </span>
                    </p>
                  </div>
                </div>

                {pagesUrl ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                    <Check className="w-4 h-4 text-green-400" />
                    <a
                      href={pagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline flex-1 truncate"
                    >
                      {pagesUrl}
                    </a>
                    <a
                      href={pagesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      data-ocid="github.pages.open.button"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <Button
                    onClick={enablePages}
                    disabled={enablingPages}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    data-ocid="github.pages.enable.primary_button"
                  >
                    {enablingPages ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Globe className="w-3.5 h-3.5" />
                    )}
                    Enable GitHub Pages
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
