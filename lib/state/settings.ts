import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createCrossPlatformJSONStorage } from './storage';

export type Pose = 'face' | 'three_quarter' | 'zoom';
export type Context = 'studio' | 'bedroom';

type SettingsState = {
  apiKey: string | null;
  pose: Pose;
  context: Context;
};

type SettingsActions = {
  setApiKey: (apiKey: string | null) => void;
  setPose: (pose: Pose) => void;
  setContext: (context: Context) => void;
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      apiKey: null,
      pose: 'face',
      context: 'studio',
      setApiKey: (apiKey) => set({ apiKey }),
      setPose: (pose) => set({ pose }),
      setContext: (context) => set({ context }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => createCrossPlatformJSONStorage()),
      version: 1,
      partialize: (s) => ({ apiKey: s.apiKey, pose: s.pose, context: s.context }),
    }
  )
);

