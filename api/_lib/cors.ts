import type { MiddlewareHandler } from 'hono';

function getAllowedOrigins(): string[] {
  const env = (process as any)?.env || {};
  const list = (env.ALLOWED_ORIGINS as string | undefined)?.split(',').map((s) => s.trim()).filter(Boolean) || [];
  if (list.length > 0) return list;
  // Fallback to EXPO_PUBLIC_API_BASE_URL origin if provided
  try {
    if (env.EXPO_PUBLIC_API_BASE_URL) {
      const u = new URL(env.EXPO_PUBLIC_API_BASE_URL);
      return [u.origin];
    }
  } catch {}
  return [];
}

export const corsStrict: MiddlewareHandler = async (c, next) => {
  const origin = c.req.header('Origin');
  const allowed = getAllowedOrigins();
  const isAllowed = origin && allowed.includes(origin);

  if (isAllowed) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
    c.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
};

