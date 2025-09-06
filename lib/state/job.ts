import { create } from 'zustand';

export type JobStep =
  | { name: 'queued' }
  | { name: 'upload_ready' }
  | { name: 'processing'; progress?: number }
  | { name: 'image_1_ready' }
  | { name: 'image_2_ready' }
  | { name: 'image_3_ready' }
  | { name: 'done' }
  | { name: 'error'; message: string };

export type Job = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  steps: JobStep[];
  resultUrls?: string[]; // 0..3
  error?: string;
};

type JobState = {
  currentJobId: string | null;
  jobs: Record<string, Job>;
};

type JobActions = {
  createJob: (id: string) => void;
  setCurrent: (id: string | null) => void;
  pushStep: (id: string, step: JobStep) => void;
  setResultUrls: (id: string, urls: string[]) => void;
  setError: (id: string, message: string) => void;
  clear: () => void;
};

export const useJobStore = create<JobState & JobActions>()((set, get) => ({
  currentJobId: null,
  jobs: {},
  createJob: (id) =>
    set({
      currentJobId: id,
      jobs: { ...get().jobs, [id]: { id, status: 'queued', steps: [{ name: 'queued' }] } },
    }),
  setCurrent: (id) => set({ currentJobId: id }),
  pushStep: (id, step) => {
    const job = get().jobs[id];
    if (!job) return;
    const next: Job = {
      ...job,
      steps: [...job.steps, step],
      status: step.name === 'error' ? 'error' : step.name === 'done' ? 'done' : 'running',
      error: step.name === 'error' ? step.message : job.error,
    };
    set({ jobs: { ...get().jobs, [id]: next } });
  },
  setResultUrls: (id, urls) => {
    const job = get().jobs[id];
    if (!job) return;
    set({ jobs: { ...get().jobs, [id]: { ...job, resultUrls: urls, status: 'done' } } });
  },
  setError: (id, message) => {
    const job = get().jobs[id];
    if (!job) return;
    set({ jobs: { ...get().jobs, [id]: { ...job, status: 'error', error: message } } });
  },
  clear: () => set({ currentJobId: null, jobs: {} }),
}));

