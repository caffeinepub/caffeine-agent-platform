export interface FileItem {
  id: string;
  name: string;
  folderId: string | null; // null = root
  mimeType: string;
  size: number;
  blobKey: string;
  createdAt: number;
  updatedAt: number;
  isFolder: boolean;
}

export interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  totalBytes: number;
}
