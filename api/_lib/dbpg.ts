import { sql } from '@vercel/postgres';

let initialized = false;

export async function ensurePgSchema() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      input_url TEXT,
      input_path TEXT,
      output_url TEXT,
      output_path TEXT,
      input_mime TEXT,
      output_mime TEXT
    );
  `;
  initialized = true;
}

export { sql };

