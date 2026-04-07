import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Archive,
  ChevronRight,
  Code2,
  Download,
  Edit3,
  File,
  FileText,
  Film,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Home,
  ImageIcon,
  Loader2,
  MoreVertical,
  Music,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FileItem, StorageStats } from "../types/files";

// ── helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "caffeine_file_manager_v1";

function loadFromStorage(): FileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FileItem[];
  } catch {
    return [];
  }
}

function saveToStorage(files: FileItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {
    // storage full or unavailable
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getFileIcon(
  item: FileItem,
): React.ComponentType<{ className?: string }> {
  if (item.isFolder) return Folder;
  const mime = item.mimeType.toLowerCase();
  const name = item.name.toLowerCase();
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Film;
  if (mime.startsWith("audio/")) return Music;
  if (/\.(zip|tar|gz|bz2|7z|rar)$/.test(name)) return Archive;
  if (/\.(pdf|doc|docx|txt|rtf|odt|md)$/.test(name)) return FileText;
  if (
    /\.(js|ts|tsx|jsx|py|mo|rs|go|java|c|cpp|cs|php|rb|sh|json|yaml|yml|toml|html|css)$/.test(
      name,
    )
  )
    return Code2;
  return File;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function isTextFile(item: FileItem): boolean {
  const mime = item.mimeType.toLowerCase();
  if (mime.startsWith("text/")) return true;
  const name = item.name.toLowerCase();
  return /\.(js|ts|tsx|jsx|py|mo|rs|go|java|c|cpp|cs|php|rb|sh|json|yaml|yml|toml|html|css|md|txt|csv|xml|svg)$/.test(
    name,
  );
}

function isImageFile(item: FileItem): boolean {
  return item.mimeType.startsWith("image/");
}

function computeStats(files: FileItem[]): StorageStats {
  const nonFolders = files.filter((f) => !f.isFolder);
  const folders = files.filter((f) => f.isFolder);
  const totalBytes = nonFolders.reduce((sum, f) => sum + f.size, 0);
  return {
    totalFiles: nonFolders.length,
    totalFolders: folders.length,
    totalBytes,
  };
}

// ── sub-components ────────────────────────────────────────────────────────────

interface FileCardProps {
  item: FileItem;
  index: number;
  onOpen: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  onDownload: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
}

function FileCard({
  item,
  index,
  onOpen,
  onRename,
  onDownload,
  onDelete,
}: FileCardProps) {
  const Icon = getFileIcon(item);
  const isDir = item.isFolder;

  function handleMenuClick(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }

  return (
    <button
      type="button"
      data-ocid={`files.item.${index}`}
      className={cn(
        "group relative flex flex-col gap-2 p-3 rounded-lg border border-border bg-card text-left",
        "hover:border-primary/40 hover:bg-accent/30 transition-all duration-150 cursor-pointer",
        "animate-slide-in-up w-full",
      )}
      onClick={() => onOpen(item)}
    >
      {/* Three-dot menu */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleMenuClick}
        onKeyDown={handleMenuClick}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-ocid={`files.item.${index}.open_modal_button`}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-ocid={`files.item.${index}.dropdown_menu`}
            align="end"
            className="w-36"
          >
            <DropdownMenuItem
              onClick={() => onRename(item)}
              data-ocid={`files.item.${index}.edit_button`}
            >
              <Edit3 className="w-3.5 h-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            {!isDir && (
              <DropdownMenuItem
                onClick={() => onDownload(item)}
                data-ocid={`files.item.${index}.secondary_button`}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Download
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              data-ocid={`files.item.${index}.delete_button`}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isDir
            ? "bg-amber-500/15 border border-amber-500/30"
            : "bg-primary/10 border border-primary/20",
        )}
      >
        <Icon
          className={cn("w-5 h-5", isDir ? "text-amber-400" : "text-primary")}
        />
      </div>

      {/* Name */}
      <p className="text-xs font-medium text-foreground truncate leading-tight">
        {item.name}
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {isDir ? "Folder" : formatBytes(item.size)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {timeAgo(item.updatedAt)}
        </span>
      </div>
    </button>
  );
}

interface FolderTreeProps {
  items: FileItem[];
  currentFolderId: string | null;
  onNavigate: (id: string | null, name?: string) => void;
}

function FolderTree({ items, currentFolderId, onNavigate }: FolderTreeProps) {
  const rootFolders = items.filter((i) => i.isFolder && i.folderId === null);

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        data-ocid="files.root.link"
        onClick={() => onNavigate(null)}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all",
          currentFolderId === null
            ? "bg-primary/15 text-primary font-semibold border border-primary/20"
            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
        )}
      >
        <Home className="w-3.5 h-3.5 shrink-0" />
        <span>Root</span>
      </button>

      {rootFolders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          data-ocid="files.folder.link"
          onClick={() => onNavigate(folder.id, folder.name)}
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ml-3",
            currentFolderId === folder.id
              ? "bg-primary/15 text-primary font-semibold border border-primary/20"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
          )}
        >
          <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span className="truncate">{folder.name}</span>
        </button>
      ))}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function FileManagerPanel() {
  const [allFiles, setAllFiles] = useState<FileItem[]>(() => loadFromStorage());

  const persistFiles = useCallback((files: FileItem[]) => {
    setAllFiles(files);
    saveToStorage(files);
  }, []);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: string | null; name: string }[]
  >([{ id: null, name: "Root" }]);

  const [searchQuery, setSearchQuery] = useState("");

  const [newNameDialog, setNewNameDialog] = useState<{
    open: boolean;
    mode: "file" | "folder";
  }>({ open: false, mode: "file" });
  const [newNameValue, setNewNameValue] = useState("");

  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    item: FileItem | null;
  }>({ open: false, item: null });
  const [renameValue, setRenameValue] = useState("");

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    item: FileItem | null;
  }>({ open: false, item: null });

  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    item: FileItem | null;
  }>({ open: false, item: null });
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed sample files on first load
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.length === 0) {
      const now = Date.now();
      const docsId = generateId();
      const projectsId = generateId();
      const seed: FileItem[] = [
        {
          id: docsId,
          name: "Documents",
          folderId: null,
          mimeType: "inode/directory",
          size: 0,
          blobKey: "",
          createdAt: now - 7 * 86400000,
          updatedAt: now - 7 * 86400000,
          isFolder: true,
        },
        {
          id: projectsId,
          name: "Projects",
          folderId: null,
          mimeType: "inode/directory",
          size: 0,
          blobKey: "",
          createdAt: now - 3 * 86400000,
          updatedAt: now - 3 * 86400000,
          isFolder: true,
        },
        {
          id: generateId(),
          name: "README.md",
          folderId: null,
          mimeType: "text/markdown",
          size: 512,
          blobKey: `data:text/plain;base64,${btoa(
            "# Caffeine Agent Platform\n\nWelcome to the file manager!\n\nYou can upload, create, edit, and organize files here.\n",
          )}`,
          createdAt: now - 2 * 86400000,
          updatedAt: now - 2 * 86400000,
          isFolder: false,
        },
        {
          id: generateId(),
          name: "agent-config.json",
          folderId: null,
          mimeType: "application/json",
          size: 256,
          blobKey: `data:text/plain;base64,${btoa(
            JSON.stringify(
              { mode: "caffeine", learningScore: 72, version: "2.0" },
              null,
              2,
            ),
          )}`,
          createdAt: now - 86400000,
          updatedAt: now - 3600000,
          isFolder: false,
        },
        {
          id: generateId(),
          name: "deployment-notes.txt",
          folderId: docsId,
          mimeType: "text/plain",
          size: 340,
          blobKey: `data:text/plain;base64,${btoa(
            "Deployment Notes\n================\n- Canister deployed to mainnet\n- Version 2.0.0\n- All modules operational\n",
          )}`,
          createdAt: now - 5 * 86400000,
          updatedAt: now - 5 * 86400000,
          isFolder: false,
        },
        {
          id: generateId(),
          name: "strategy.md",
          folderId: docsId,
          mimeType: "text/markdown",
          size: 420,
          blobKey: `data:text/plain;base64,${btoa(
            "# Agent Strategy\n\n## Goals\n- Minimize task execution time\n- Maximize accuracy\n- Self-improve through error analysis\n",
          )}`,
          createdAt: now - 4 * 86400000,
          updatedAt: now - 4 * 86400000,
          isFolder: false,
        },
        {
          id: generateId(),
          name: "planner.ts",
          folderId: projectsId,
          mimeType: "application/typescript",
          size: 1024,
          blobKey: `data:text/plain;base64,${btoa(
            "// Planner module\nexport function createPlan(task: string) {\n  return {\n    steps: [],\n    task,\n    status: 'pending',\n  };\n}\n",
          )}`,
          createdAt: now - 86400000,
          updatedAt: now - 1800000,
          isFolder: false,
        },
      ];
      persistFiles(seed);
    }
  }, [persistFiles]);

  // ── derived ────────────────────────────────────────────────────────────────

  const stats = computeStats(allFiles);

  const visibleItems = allFiles.filter((f) => {
    if (f.folderId !== currentFolderId) return false;
    if (searchQuery.trim()) {
      return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const sortedItems = [...visibleItems].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  // ── navigation ────────────────────────────────────────────────────────────

  const navigateTo = useCallback((id: string | null, name?: string) => {
    setCurrentFolderId(id);
    setSearchQuery("");
    if (id === null) {
      setBreadcrumbs([{ id: null, name: "Root" }]);
    } else {
      setBreadcrumbs((prev) => {
        const existing = prev.findIndex((b) => b.id === id);
        if (existing >= 0) return prev.slice(0, existing + 1);
        return [...prev, { id, name: name ?? "Folder" }];
      });
    }
  }, []);

  const handleOpen = useCallback(
    (item: FileItem) => {
      if (item.isFolder) {
        navigateTo(item.id, item.name);
        return;
      }
      if (isImageFile(item) || isTextFile(item)) {
        let content = "";
        if (item.blobKey.startsWith("data:") && !isImageFile(item)) {
          try {
            const b64 = item.blobKey.split(",")[1] ?? "";
            content = atob(b64);
          } catch {
            content = item.blobKey;
          }
        }
        setEditorContent(content);
        setPreviewDialog({ open: true, item });
      }
    },
    [navigateTo],
  );

  // ── upload ────────────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      const newItems: FileItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          newItems.push({
            id: generateId(),
            name: file.name,
            folderId: currentFolderId,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            blobKey: dataUrl,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isFolder: false,
          });
        } catch {
          toast.error(`Failed to read ${file.name}`);
        }
      }

      if (newItems.length > 0) {
        persistFiles([...allFiles, ...newItems]);
        toast.success(
          `${newItems.length} file${newItems.length > 1 ? "s" : ""} uploaded`,
        );
      }

      setUploadProgress(null);
      if (e.target) e.target.value = "";
    },
    [allFiles, currentFolderId, persistFiles],
  );

  // ── create ────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (!newNameValue.trim()) return;
    setIsCreating(true);
    const isFolder = newNameDialog.mode === "folder";
    const now = Date.now();
    const newItem: FileItem = {
      id: generateId(),
      name: newNameValue.trim(),
      folderId: currentFolderId,
      mimeType: isFolder ? "inode/directory" : "text/plain",
      size: 0,
      blobKey: "",
      createdAt: now,
      updatedAt: now,
      isFolder,
    };
    persistFiles([...allFiles, newItem]);
    toast.success(`${isFolder ? "Folder" : "File"} "${newItem.name}" created`);
    setNewNameDialog({ open: false, mode: "file" });
    setNewNameValue("");
    setIsCreating(false);
  }, [
    allFiles,
    newNameValue,
    newNameDialog.mode,
    currentFolderId,
    persistFiles,
  ]);

  // ── rename ────────────────────────────────────────────────────────────────

  const handleRename = useCallback(() => {
    if (!renameDialog.item || !renameValue.trim()) return;
    const updated = allFiles.map((f) =>
      f.id === renameDialog.item!.id
        ? { ...f, name: renameValue.trim(), updatedAt: Date.now() }
        : f,
    );
    persistFiles(updated);
    toast.success("Renamed successfully");
    setRenameDialog({ open: false, item: null });
    setRenameValue("");
  }, [allFiles, renameDialog.item, renameValue, persistFiles]);

  // ── delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!deleteDialog.item) return;
    setIsDeleting(true);
    const target = deleteDialog.item;

    const collectIds = (id: string): string[] => {
      const children = allFiles.filter((f) => f.folderId === id);
      return [
        id,
        ...children.flatMap((c) => (c.isFolder ? collectIds(c.id) : [c.id])),
      ];
    };

    const idsToDelete = target.isFolder ? collectIds(target.id) : [target.id];
    const remaining = allFiles.filter((f) => !idsToDelete.includes(f.id));
    persistFiles(remaining);
    toast.success(
      `"${target.name}" deleted${target.isFolder ? " and its contents" : ""}`,
    );
    setDeleteDialog({ open: false, item: null });
    if (target.id === currentFolderId) navigateTo(null);
    setIsDeleting(false);
  }, [allFiles, deleteDialog.item, currentFolderId, navigateTo, persistFiles]);

  // ── download ─────────────────────────────────────────────────────────────

  const handleDownload = useCallback((item: FileItem) => {
    if (!item.blobKey) {
      toast.error("No content to download");
      return;
    }
    const a = document.createElement("a");
    a.href = item.blobKey;
    a.download = item.name;
    a.click();
  }, []);

  // ── save editor ───────────────────────────────────────────────────────────

  const handleSaveEditor = useCallback(() => {
    if (!previewDialog.item) return;
    setIsSaving(true);
    try {
      const b64 = btoa(unescape(encodeURIComponent(editorContent)));
      const dataUrl = `data:text/plain;base64,${b64}`;
      const size = new TextEncoder().encode(editorContent).length;
      const updated = allFiles.map((f) =>
        f.id === previewDialog.item!.id
          ? { ...f, blobKey: dataUrl, size, updatedAt: Date.now() }
          : f,
      );
      persistFiles(updated);
      setPreviewDialog((prev) =>
        prev.item
          ? {
              ...prev,
              item: {
                ...prev.item,
                blobKey: dataUrl,
                size,
                updatedAt: Date.now(),
              },
            }
          : prev,
      );
      toast.success("File saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [allFiles, previewDialog.item, editorContent, persistFiles]);

  // ── render ────────────────────────────────────────────────────────────────

  const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.name ?? "Root";

  return (
    <div
      className="flex flex-col h-full w-full bg-background"
      data-ocid="files.panel"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-1.5 mr-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            File Manager
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            data-ocid="files.upload_button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null}
            className="h-7 text-xs gap-1.5"
          >
            {uploadProgress !== null ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploadProgress !== null ? `${uploadProgress}%` : "Upload"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            data-ocid="files.new_file.open_modal_button"
            onClick={() => {
              setNewNameValue("");
              setNewNameDialog({ open: true, mode: "file" });
            }}
            className="h-7 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New File
          </Button>

          <Button
            size="sm"
            variant="outline"
            data-ocid="files.new_folder.open_modal_button"
            onClick={() => {
              setNewNameValue("");
              setNewNameDialog({ open: true, mode: "folder" });
            }}
            className="h-7 text-xs gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New Folder
          </Button>
        </div>

        <div className="flex-1" />

        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            data-ocid="files.search_input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="h-7 pl-8 text-xs bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Folder tree sidebar */}
        <aside className="w-44 shrink-0 border-r border-border bg-sidebar flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Folders
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              <FolderTree
                items={allFiles}
                currentFolderId={currentFolderId}
                onNavigate={navigateTo}
              />
            </div>
          </ScrollArea>
        </aside>

        {/* File grid area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card shrink-0">
            {breadcrumbs.map((crumb, idx) => (
              <div
                key={`${crumb.id ?? "root"}-${idx}`}
                className="flex items-center gap-1"
              >
                {idx > 0 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                )}
                <button
                  type="button"
                  data-ocid="files.breadcrumb.link"
                  onClick={() => navigateTo(crumb.id, crumb.name)}
                  className={cn(
                    "text-xs transition-colors rounded px-1 py-0.5",
                    idx === breadcrumbs.length - 1
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
            {searchQuery && (
              <Badge
                variant="secondary"
                className="ml-2 text-[10px] h-4 px-1.5"
              >
                Search: &quot;{searchQuery}&quot;
              </Badge>
            )}
          </div>

          {/* Grid */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {sortedItems.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-20 gap-3"
                  data-ocid="files.empty_state"
                >
                  <div className="w-16 h-16 rounded-2xl bg-accent/40 flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery
                      ? `No files matching "${searchQuery}"`
                      : `${currentFolderName} is empty`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {!searchQuery &&
                      "Upload files or create a new file to get started"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {sortedItems.map((item, idx) => (
                    <FileCard
                      key={item.id}
                      item={item}
                      index={idx + 1}
                      onOpen={handleOpen}
                      onRename={(i) => {
                        setRenameValue(i.name);
                        setRenameDialog({ open: true, item: i });
                      }}
                      onDownload={handleDownload}
                      onDelete={(i) => setDeleteDialog({ open: true, item: i })}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <HardDrive className="w-3.5 h-3.5" />
          <span>
            <span className="text-foreground font-medium">
              {stats.totalFiles}
            </span>{" "}
            files
          </span>
          <span className="mx-1 opacity-40">·</span>
          <span>
            <span className="text-foreground font-medium">
              {stats.totalFolders}
            </span>{" "}
            folders
          </span>
          <span className="mx-1 opacity-40">·</span>
          <span>
            <span className="text-foreground font-medium">
              {formatBytes(stats.totalBytes)}
            </span>{" "}
            used
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">
          {sortedItems.length > 0 &&
            `${sortedItems.length} item${sortedItems.length !== 1 ? "s" : ""} in view`}
        </span>
      </div>

      {/* New file / folder dialog */}
      <Dialog
        open={newNameDialog.open}
        onOpenChange={(o) => setNewNameDialog((p) => ({ ...p, open: o }))}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="files.new_item.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {newNameDialog.mode === "folder"
                ? "Create New Folder"
                : "Create New File"}
            </DialogTitle>
            <DialogDescription>
              Enter a name for your new{" "}
              {newNameDialog.mode === "folder" ? "folder" : "file"}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="new-name" className="text-xs text-muted-foreground">
              Name
            </Label>
            <Input
              id="new-name"
              data-ocid="files.new_item.input"
              value={newNameValue}
              onChange={(e) => setNewNameValue(e.target.value)}
              placeholder={
                newNameDialog.mode === "folder" ? "my-folder" : "document.txt"
              }
              className="mt-1.5"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              data-ocid="files.new_item.cancel_button"
              onClick={() => setNewNameDialog({ open: false, mode: "file" })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              data-ocid="files.new_item.submit_button"
              onClick={handleCreate}
              disabled={!newNameValue.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={renameDialog.open}
        onOpenChange={(o) => setRenameDialog((p) => ({ ...p, open: o }))}
      >
        <DialogContent className="sm:max-w-sm" data-ocid="files.rename.dialog">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for &quot;{renameDialog.item?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label
              htmlFor="rename-val"
              className="text-xs text-muted-foreground"
            >
              New name
            </Label>
            <Input
              id="rename-val"
              data-ocid="files.rename.input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mt-1.5"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              data-ocid="files.rename.cancel_button"
              onClick={() => setRenameDialog({ open: false, item: null })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              data-ocid="files.rename.save_button"
              onClick={handleRename}
              disabled={!renameValue.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(o) => setDeleteDialog((p) => ({ ...p, open: o }))}
      >
        <AlertDialogContent data-ocid="files.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deleteDialog.item?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.item?.isFolder
                ? "This will permanently delete the folder and all its contents. This action cannot be undone."
                : "This will permanently delete this file. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="files.delete.cancel_button"
              onClick={() => setDeleteDialog({ open: false, item: null })}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="files.delete.confirm_button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview / Editor dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(o) => setPreviewDialog((p) => ({ ...p, open: o }))}
      >
        <DialogContent
          className="max-w-3xl w-full"
          data-ocid="files.preview.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDialog.item &&
                (() => {
                  const Icon = getFileIcon(previewDialog.item);
                  return (
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        previewDialog.item.isFolder
                          ? "text-amber-400"
                          : "text-primary",
                      )}
                    />
                  );
                })()}
              {previewDialog.item?.name}
            </DialogTitle>
            {previewDialog.item && !previewDialog.item.isFolder && (
              <DialogDescription>
                {formatBytes(previewDialog.item.size)} ·{" "}
                {timeAgo(previewDialog.item.updatedAt)}
              </DialogDescription>
            )}
          </DialogHeader>

          {previewDialog.item && isImageFile(previewDialog.item) && (
            <div className="flex items-center justify-center bg-black/30 rounded-lg overflow-hidden max-h-[60vh]">
              <img
                src={previewDialog.item.blobKey}
                alt={previewDialog.item.name}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
          )}

          {previewDialog.item &&
            !previewDialog.item.isFolder &&
            isTextFile(previewDialog.item) && (
              <div className="flex flex-col gap-2">
                <Textarea
                  data-ocid="files.editor"
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="font-mono text-xs h-80 resize-none bg-background"
                  placeholder="Empty file..."
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    data-ocid="files.editor.save_button"
                    onClick={handleSaveEditor}
                    disabled={isSaving}
                    className="gap-1.5"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
