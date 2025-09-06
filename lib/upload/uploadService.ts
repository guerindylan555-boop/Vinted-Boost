import { useUploadStore, LocalFile } from '../state/upload';

export type UploadConfig = {
  url?: string; // optional API base (default: relative /api/files for web, env for native)
};

export type PickedFile = {
  id: string;
  // React Native: use uri
  uri?: string;
  // Web: provide a File directly
  webFile?: any; // File in browser; typed as any to avoid RN type issues
  name?: string;
  type?: string; // mime
  size?: number;
};

export async function uploadPickedFiles(files: PickedFile[], config: UploadConfig = {}) {
  const { setProgress, markUploaded, setError, addFiles } = useUploadStore.getState();
  // register files in store as 'picking'
  addFiles(files.map((f) => ({ id: f.id, uri: f.uri, name: f.name, size: f.size, type: f.type })) as Omit<LocalFile, 'status'>[]);

  try {
    const base = config.url || process.env.EXPO_PUBLIC_API_BASE_URL || '';
    const endpoint = base ? `${base.replace(/\/$/, '')}/api/files` : '/api/files';

    const form = new FormData();
    for (const f of files) {
      const hasWebFile = typeof (globalThis as any).File !== 'undefined' && f && (f as any).webFile instanceof (globalThis as any).File;
      if (hasWebFile) {
        form.append('files', (f as any).webFile);
      } else if (f.uri) {
        form.append('files', {
          // @ts-expect-error React Native FormData file shape
          uri: f.uri,
          name: f.name || 'image.jpg',
          type: f.type || 'image/jpeg',
        } as any);
      }
    }

    // Note: Fetch progress isn't available cross-platform without extra libs; we mark 0.5 then 1.0 heuristically.
    files.forEach((f) => setProgress(f.id, 0.5));

    const res = await fetch(endpoint, { method: 'POST', body: form as any });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Upload failed: ${res.status}`);
    }
    const json = (await res.json()) as Array<{ id: string; url: string }>;

    json.forEach((item, idx) => {
      const f = files[idx];
      if (f) markUploaded(f.id, { key: item.id, url: item.url });
    });

    return json.map((r) => r.url);
  } catch (e: any) {
    const msg = e?.message ?? 'Erreur upload';
    files.forEach((f) => setError(f.id, msg));
    throw e;
  }
}
