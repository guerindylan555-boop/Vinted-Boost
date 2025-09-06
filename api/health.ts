export const config = { runtime: 'nodejs20.x' };

export default function handler() {
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
