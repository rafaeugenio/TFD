import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { RespostaAssistente } from '@/app/relatorios/_assistente/contrato';
import { lerConfigAssistente } from '@/lib/assistente-relatorios/config';
import { dentroDoLimite, verificarAcessoRelatorios } from '@/lib/assistente-relatorios/permissao';
import { sanitizarPergunta } from '@/lib/assistente-relatorios/sanitizar';
import { respostaDeErro, responderPergunta } from '@/lib/assistente-relatorios/assistente';

/**
 * POST /api/relatorios/assistente
 * Entrada: { "pergunta": "Quanto foi gasto em passagens nos últimos 3 meses?" }
 * Saída: RespostaAssistente (ver `src/app/relatorios/_assistente/contrato.ts`).
 *
 * Ordem: sessão e permissão, limite por usuário, limpeza da pergunta, chaves
 * configuradas, depois JEV, Gemini e consulta. Os logs não guardam a pergunta
 * nem a resposta, só o relatório escolhido, o status e o tempo.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const json = (corpo: RespostaAssistente, status = 200) =>
  Response.json(corpo, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  const inicio = Date.now();
  const geradoEm = new Date().toISOString();

  const sb = (await createServerSupabase()) as unknown as SupabaseClient;
  const acesso = await verificarAcessoRelatorios(sb);
  if (!acesso.ok) {
    return json(
      { status: 'erro', mensagem: acesso.status === 401 ? 'Sua sessão expirou. Entre de novo no sistema.' : 'Seu perfil não tem acesso a Relatórios.', geradoEm },
      acesso.status,
    );
  }
  if (!dentroDoLimite(acesso.usuarioId)) {
    return json({ status: 'erro', mensagem: 'Muitas perguntas em pouco tempo. Aguarde um minuto e tente de novo.', geradoEm }, 429);
  }

  let corpo: unknown;
  try {
    const bruto = await req.text();
    if (bruto.length > 4_000) return json({ status: 'erro', mensagem: 'A pergunta é longa demais.', geradoEm }, 413);
    corpo = JSON.parse(bruto);
  } catch {
    return json({ status: 'erro', mensagem: 'Envie a pergunta no formato esperado.', geradoEm }, 400);
  }

  const limpa = sanitizarPergunta((corpo as { pergunta?: unknown } | null)?.pergunta);
  if (!limpa.ok) {
    const mensagem =
      limpa.motivo === 'dado_pessoal'
        ? 'Por segurança, o assistente não aceita CPF, CNS, dados bancários, laudos, diagnósticos ou perguntas sobre pessoas específicas. Pergunte por totais e contagens.'
        : limpa.motivo === 'longa' ? 'A pergunta passou de 300 caracteres. Resuma e tente de novo.' : 'Escreva uma pergunta para analisar.';
    return json({ status: limpa.motivo === 'dado_pessoal' ? 'bloqueado' : 'erro', mensagem, geradoEm }, limpa.motivo === 'dado_pessoal' ? 200 : 400);
  }

  const cfg = lerConfigAssistente();
  if (!cfg.ok) {
    return json(
      {
        status: 'configuracao',
        mensagem: `O assistente ainda não está configurado neste ambiente. Falta definir no servidor: ${cfg.faltando.join(', ')}.`,
        geradoEm,
      },
      503,
    );
  }

  try {
    const resposta = await responderPergunta(limpa.pergunta, cfg.config, sb);
    console.info(`[assistente-relatorios] ${resposta.relatorio ?? '-'} ${resposta.status} ${Date.now() - inicio}ms`);
    return json(resposta);
  } catch (e) {
    const { corpo: erro, status } = respostaDeErro(e);
    console.warn(`[assistente-relatorios] erro ${e instanceof Error ? e.message : 'desconhecido'} ${Date.now() - inicio}ms`);
    return json(erro, status);
  }
}
