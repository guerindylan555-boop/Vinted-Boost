import { createClient, Client } from '@libsql/client';

let client: Client | null = null;
let initialized = false;

function getEnv(name: string): string | undefined {
  try {
    return (process as any)?.env?.[name];
  } catch {
    return undefined;
  }
}

export function getDb(): Client {
  if (client) return client;
  const url = getEnv('TURSO_DATABASE_URL');
  const authToken = getEnv('TURSO_AUTH_TOKEN');
  if (!url) throw new Error('Missing TURSO_DATABASE_URL');
  if (!authToken) throw new Error('Missing TURSO_AUTH_TOKEN');

  client = createClient({ url, authToken });
  return client;
}

export async function ensureSchema() {
  if (initialized) return;
  const db = getDb();
  await db.execute(
    `CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      data BLOB NOT NULL,
      created_at INTEGER NOT NULL
    )`
  );
  initialized = true;
}

