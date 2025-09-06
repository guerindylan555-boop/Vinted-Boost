import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export type PersistStorage = {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
};

const basePath = (FileSystem.documentDirectory || '') + 'zustand/';

async function ensureDir() {
  if (Platform.OS === 'web') return;
  try {
    const info = await FileSystem.getInfoAsync(basePath);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(basePath, { intermediates: true });
    }
  } catch {}
}

export function createCrossPlatformJSONStorage(): PersistStorage {
  if (Platform.OS === 'web') {
    return {
      getItem: (name) => {
        try {
          return (globalThis as any)?.localStorage?.getItem(name) ?? null;
        } catch {
          return null;
        }
      },
      setItem: (name, value) => {
        try {
          (globalThis as any)?.localStorage?.setItem(name, value);
        } catch {}
      },
      removeItem: (name) => {
        try {
          (globalThis as any)?.localStorage?.removeItem(name);
        } catch {}
      },
    };
  }

  // Native: store each key in a file
  return {
    getItem: async (name) => {
      try {
        await ensureDir();
        const path = basePath + name + '.json';
        const exists = await FileSystem.getInfoAsync(path);
        if (!exists.exists) return null;
        return await FileSystem.readAsStringAsync(path);
      } catch {
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        await ensureDir();
        const path = basePath + name + '.json';
        await FileSystem.writeAsStringAsync(path, value);
      } catch {}
    },
    removeItem: async (name) => {
      try {
        const path = basePath + name + '.json';
        const exists = await FileSystem.getInfoAsync(path);
        if (exists.exists) await FileSystem.deleteAsync(path, { idempotent: true });
      } catch {}
    },
  };
}

