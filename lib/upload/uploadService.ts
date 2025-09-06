import { generateReactNativeHelpers } from '@uploadthing/expo';
import { useUploadStore, LocalFile } from '../state/upload';

export type UploadConfig = {
  endpoint: string; // e.g. 'imageUploader'
  url?: string; // optional custom server URL (default UploadThing URL configured in client)
};

export type PickedFile = {
  id: string;
  uri: string;
  name?: string;
  type?: string; // mime
  size?: number;
};

export async function uploadPickedFiles(files: PickedFile[], config: UploadConfig) {
  const { setProgress, markUploaded, setError, addFiles } = useUploadStore.getState();
  // register files in store as 'picking'
  addFiles(files.map((f) => ({ id: f.id, uri: f.uri, name: f.name, size: f.size, type: f.type })) as Omit<LocalFile, 'status'>[]);

  try {
    const baseUrl = config.url || process.env.EXPO_PUBLIC_UPLOADTHING_URL || undefined;
    const { uploadFiles } = generateReactNativeHelpers(baseUrl ? { url: baseUrl as any } : undefined as any);
    const res = await uploadFiles({
      endpoint: config.endpoint,
      files: files.map((f) => ({ uri: f.uri, name: f.name ?? 'image.jpg', type: f.type ?? 'image/jpeg' })),
      onUploadProgress: ({ file, progress }: any) => {
        const match = files.find((f) => f.uri === (file as any)?.uri);
        if (match) setProgress(match.id, progress);
      },
    } as any);

    // res contains an array with { fileKey, fileUrl }
    res.forEach((item, idx) => {
      const f = files[idx];
      if (f) markUploaded(f.id, { key: item.key ?? (item as any).fileKey, url: item.url ?? (item as any).fileUrl });
    });

    return res.map((r: any) => r.url ?? r.fileUrl).filter(Boolean) as string[];
  } catch (e: any) {
    const msg = e?.message ?? 'Erreur upload';
    files.forEach((f) => setError(f.id, msg));
    throw e;
  }
}
