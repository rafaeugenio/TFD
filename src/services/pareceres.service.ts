import { createClient } from '@/lib/supabase/client';
import type { DecisaoParecer, StatusSolicitacao } from '@/lib/supabase/database.types';
import { buscarDevolucaoAtiva, resolverDevolucao } from './devolucoes.service';

function getSupabase() {
  return createClient();
}

/**
 * Lista solicitações pendentes de parecer médico.
 * Filtra por status EM_ANALISE (aguardando parecer).
 */
export async function listarSolicitacoesPendentes(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
  includeIds?: string[];
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('solicitacoes')
    .select(
      '*, pacientes(nome_completo, cpf, data_nascimento, sexo, cns, telefone_celular, municipio), documentos(id, tipo, nome_arquivo, url_arquivo, created_at), pareceres(id, decisao, observacoes_medicas, created_at)',
      { count: 'exact' },
    );

  if (filters?.includeIds && filters.includeIds.length > 0) {
    query = query.or(`status.in.(EM_ANALISE),id.in.(${filters.includeIds.join(',')})`);
  } else {
    query = query.in('status', ['EM_ANALISE']);
  }

  query = query.order('created_at', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `numero_processo.ilike.%${filters.search}%,pacientes.nome_completo.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/**
 * Conta pareceres por decisão no período (mês corrente por padrão).
 */
export async function contarPareceresPorDecisao() {
  const supabase = getSupabase();
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from('pareceres')
    .select('decisao')
    .gte('created_at', inicioMes);

  if (error || !data) return { deferidos: 0, indeferidos: 0, exigencias: 0 };

  let deferidos = 0;
  let indeferidos = 0;
  let exigencias = 0;
  for (const p of data) {
    if (p.decisao === 'DEFERIDO') deferidos++;
    else if (p.decisao === 'INDEFERIDO') indeferidos++;
    else if (p.decisao === 'EXIGENCIA') exigencias++;
  }
  return { deferidos, indeferidos, exigencias };
}

/**
 * Cria um parecer médico e atualiza automaticamente o status da solicitação.
 *
 * Se existir uma devolução ativa para PARECER_MEDICO, ao deferir o processo
 * volta DIRETO ao setor de origem (ex: AGUARDANDO_AGENDAMENTO) em vez de
 * seguir o fluxo normal (AGUARDANDO_REGULACAO).
 *
 * Fluxo normal:
 * - DEFERIDO → AGUARDANDO_REGULACAO
 * - INDEFERIDO → INDEFERIDO
 * - EXIGENCIA → EXIGENCIA
 *
 * Com devolução ativa + DEFERIDO:
 * - DEFERIDO → status_retorno da devolução (ex: AGUARDANDO_AGENDAMENTO)
 */
export async function criarParecer(data: {
  solicitacao_id: string;
  medico_auditor_id?: string;
  decisao: DecisaoParecer;
  observacoes_medicas: string;
  justificativa?: string;
  autoriza_acompanhante?: boolean;
}) {
  const supabase = getSupabase();

  const result = await supabase
    .from('pareceres')
    .insert({
      solicitacao_id: data.solicitacao_id,
      medico_auditor_id: data.medico_auditor_id ?? null,
      decisao: data.decisao,
      observacoes_medicas: data.observacoes_medicas,
      justificativa: data.justificativa ?? null,
      autoriza_acompanhante: data.autoriza_acompanhante ?? null,
    } as any)
    .select()
    .single();

  if (result.error) return result;

  // Determinar o próximo status
  let novoStatus: StatusSolicitacao | null = null;

  if (data.decisao === 'DEFERIDO') {
    // Verificar se existe devolução ativa para PARECER_MEDICO
    const devolucao = await buscarDevolucaoAtiva(data.solicitacao_id, 'PARECER_MEDICO');

    if (devolucao.data) {
      // Retorno direto: volta ao status do setor que originou a devolução
      novoStatus = devolucao.data.status_retorno as StatusSolicitacao;
      // Resolver a devolução automaticamente
      await resolverDevolucao(
        devolucao.data.id,
        `Parecer deferido pelo médico auditor. Retorno direto ao setor de origem.`,
        data.medico_auditor_id,
      );
    } else {
      // Fluxo normal
      novoStatus = 'AGUARDANDO_REGULACAO';
    }
  } else if (data.decisao === 'INDEFERIDO') {
    novoStatus = 'INDEFERIDO';
  } else if (data.decisao === 'EXIGENCIA') {
    novoStatus = 'EXIGENCIA';
  }

  if (novoStatus) {
    await supabase
      .from('solicitacoes')
      .update({
        status: novoStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.solicitacao_id);
  }

  return result;
}
