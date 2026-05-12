import { headers } from 'next/headers';

/**
 * URL pública usada nos links de email (primeiro acesso / redefinição).
 * Ordem de prioridade:
 *   1. NEXT_PUBLIC_APP_URL (definida explicitamente em prod/preview)
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL (definidas automaticamente pela Vercel)
 *   3. Cabeçalhos x-forwarded-host/host da request atual
 *
 * Nunca cai em localhost quando rodando atrás de um host real — o fallback
 * só acontece em desenvolvimento local quando nada disso está disponível.
 */
export async function getAppBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prodHost) return `https://${stripTrailingSlash(prodHost)}`;

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${stripTrailingSlash(vercelHost)}`;

  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() pode não estar disponível fora do request scope
  }

  return 'http://localhost:3000';
}

function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}
