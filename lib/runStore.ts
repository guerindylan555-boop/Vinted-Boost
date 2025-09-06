export type GenRun = {
  inputDataUrl: string;
  apiKey?: string | null;
  resultDataUrl?: string | null;
  error?: string | null;
};

const runs = new Map<string, GenRun>();

export function newRunId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function setRun(id: string, data: GenRun) {
  runs.set(id, data);
}

export function getRun(id: string): GenRun | undefined {
  return runs.get(id);
}

export function updateRun(id: string, patch: Partial<GenRun>) {
  const prev = runs.get(id) || ({} as GenRun);
  runs.set(id, { ...prev, ...patch });
}

