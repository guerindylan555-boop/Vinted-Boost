import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const KEY = 'openrouter_api_key';
const SETTINGS_FILE = (FileSystem.documentDirectory || '') + 'settings.json';

export async function loadApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const v = (globalThis as any)?.localStorage?.getItem(KEY);
      return v || null;
    } else {
      const exists = await FileSystem.getInfoAsync(SETTINGS_FILE);
      if (!exists.exists) return null;
      const txt = await FileSystem.readAsStringAsync(SETTINGS_FILE);
      const data = JSON.parse(txt || '{}');
      return typeof data?.apiKey === 'string' && data.apiKey.length ? data.apiKey : null;
    }
  } catch {
    return null;
  }
}

export async function saveApiKey(apiKey: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (apiKey) (globalThis as any)?.localStorage?.setItem(KEY, apiKey);
      else (globalThis as any)?.localStorage?.removeItem(KEY);
    } else {
      if (apiKey) {
        await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ apiKey }));
      } else {
        const exists = await FileSystem.getInfoAsync(SETTINGS_FILE);
        if (exists.exists) await FileSystem.deleteAsync(SETTINGS_FILE, { idempotent: true });
      }
    }
  } catch {
    // ignore storage errors
  }
}

