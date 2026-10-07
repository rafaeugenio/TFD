import 'server-only';

/** Erro de serviço externo com tipo controlado (sem expor detalhes ao usuário). */
export class ErroServico extends Error {
  constructor(
    readonly servico: 'jev' | 'gemini' | 'banco',
    readonly tipo: 'timeout' | 'limite' | 'indisponivel' | 'autenticacao' | 'modelo' | 'resposta_invalida',
  ) {
    super(`${servico}:${tipo}`);
  }
}

/** POST JSON com tempo limite e uma nova tentativa para 429/529/503. */
export async function postJson(
  servico: 'jev' | 'gemini',
  url: string,
  headers: Record<string, string>,
  corpo: unknown,
  tempoMs: number,
): Promise<unknown> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(tempoMs),
        cache: 'no-store',
      });
    } catch (e) {
      const nome = (e as { name?: string })?.name;
      throw new ErroServico(servico, nome === 'TimeoutError' || nome === 'AbortError' ? 'timeout' : 'indisponivel');
    }
    if (resp.ok) {
      try {
        return await resp.json();
      } catch {
        throw new ErroServico(servico, 'resposta_invalida');
      }
    }
    if (resp.status === 401 || resp.status === 403) throw new ErroServico(servico, 'autenticacao');
    if (resp.status === 404) throw new ErroServico(servico, 'modelo');
    const repetivel = resp.status === 429 || resp.status === 529 || resp.status === 503;
    if (repetivel && tentativa === 0) {
      await new Promise((r) => setTimeout(r, 700));
      continue;
    }
    throw new ErroServico(servico, resp.status === 429 ? 'limite' : resp.status >= 500 ? 'indisponivel' : 'resposta_invalida');
  }
  throw new ErroServico(servico, 'indisponivel');
}
