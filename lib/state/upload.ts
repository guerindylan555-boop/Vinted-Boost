import { create } from 'zustand';

export type UploadStatus = 'idle' | 'picking' | 'uploading' | 'uploaded' | 'error';

export type LocalFile = {
  id: string;
  uri: string;
  name?: string;
  size?: number;
  type?: string; // mime
  status: UploadStatus;
  progress?: number; // 0..1
  error?: string;
  key?: string; // File id (Turso)
  url?: string; // public URL
};

type UploadState = {
  files: LocalFile[];
};

type UploadActions = {
  reset: () => void;
  addFiles: (files: Omit<LocalFile, 'status'>[]) => void;
  setProgress: (id: string, p: number) => void;
  markUploaded: (id: string, data: { key: string; url: string }) => void;
  setError: (id: string, error: string) => void;
  remove: (id: string) => void;
};

export const useUploadStore = create<UploadState & UploadActions>()((set, get) => ({
  files: [],
  reset: () => set({ files: [] }),
  addFiles: (newFiles) =>
    set({
      files: [
        ...get().files,
        ...newFiles.map((f) => ({ ...f, status: 'picking' as UploadStatus })),
      ].slice(0, 3),
    }),
  setProgress: (id, p) =>
    set({
      files: get().files.map((f) => (f.id === id ? { ...f, status: 'uploading', progress: p } : f)),
    }),
  markUploaded: (id, data) =>
    set({
      files: get().files.map((f) => (f.id === id ? { ...f, status: 'uploaded', progress: 1, ...data } : f)),
    }),
  setError: (id, error) =>
    set({ files: get().files.map((f) => (f.id === id ? { ...f, status: 'error', error } : f)) }),
  remove: (id) => set({ files: get().files.filter((f) => f.id !== id) }),
}));
