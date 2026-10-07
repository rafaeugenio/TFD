import 'server-only';

/**
 * Leitura e validação das variáveis do Assistente de Relatórios. Só roda no
 * servidor: nenhuma destas variáveis pode ter o prefixo NEXT_PUBLIC_, senão o
 * Next copia o valor para o pacote do navegador.
 */

export interface ConfigAssistente {
  jev: { apiKey: string; baseUrl: string; model: string };
  gemini: { apiKey: string; model: string };
}

export type ResultadoConfig =
  | { ok: true; config: ConfigAssistente }
  | { ok: false; faltando: string[] };

const texto = (v: string | undefined) => (typeof v === 'string' ? v.trim() : '');

export function lerConfigAssistente(): ResultadoConfig {
  const jevKey = texto(process.env.TYPESAFE_API_KEY);
  const geminiKey = texto(process.env.GEMINI_API_KEY);
  const faltando: string[] = [];
  if (!jevKey) faltando.push('TYPESAFE_API_KEY');
  if (!geminiKey) faltando.push('GEMINI_API_KEY');
  if (faltando.length) return { ok: false, faltando };

  const baseUrl = texto(process.env.TYPESAFE_BASE_URL) || 'https://api.typesafe.ai';
  // Aceita só https para não mandar a chave em texto aberto por engano.
  if (!/^https:\/\/[^\s/]+/.test(baseUrl)) return { ok: false, faltando: ['TYPESAFE_BASE_URL (precisa começar com https://)'] };

  return {
    ok: true,
    config: {
      jev: { apiKey: jevKey, baseUrl: baseUrl.replace(/\/+$/, ''), model: texto(process.env.TYPESAFE_MODEL) || 'jev-latest' },
      gemini: { apiKey: geminiKey, model: texto(process.env.GEMINI_MODEL) || 'gemini-3.5-flash-lite' },
    },
  };
}

/** Tempo máximo de cada chamada externa e da consulta ao banco. */
export const TEMPO_LIMITE_MS = { jev: 8_000, gemini: 10_000, banco: 10_000 } as const;
