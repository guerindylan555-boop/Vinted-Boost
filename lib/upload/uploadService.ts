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
    const isWeb = typeof document !== 'undefined';
    const base = (config.url || (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL || '').toString();
    const endpoint = base
      ? `${base.replace(/\/$/, '')}/api/files`
      : (isWeb ? '/api/files' : (() => { throw new Error('EXPO_PUBLIC_API_BASE_URL manquant pour l’upload natif. Définissez une URL déployée (ex: https://<app>.vercel.app).'); })());

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

    // Add a 30s timeout to avoid hanging forever
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch(endpoint, { method: 'POST', body: form as any, signal: ac.signal });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 403) {
        throw new Error('Accès API refusé (401/403). Déploiement protégé ou domaine non autorisé (CORS).');
      }
      throw new Error(text || `Upload failed: ${res.status}`);
    }
    const json = (await res.json()) as Array<{ id: string; url: string }>;

    json.forEach((item, idx) => {
      const f = files[idx];
      if (f) markUploaded(f.id, { key: item.id, url: item.url });
    });

    return json.map((r) => r.url);
  } catch (e: any) {
    let msg = e?.message ?? 'Erreur upload';
    if (e?.name === 'AbortError') {
      msg = 'Délai d\’upload dépassé (30s).';
    } else if (/Failed to fetch/i.test(String(e))) {
      msg = 'API injoignable (réseau/CORS). Vérifiez l’URL et les origines autorisées.';
    }
    files.forEach((f) => setError(f.id, msg));
    throw e;
  }
}
