import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUGESTOES_INICIAIS, type RespostaAssistente } from '@/app/relatorios/_assistente/contrato';
import {
  AGRUPAMENTO_ROTULO, BENEFICIARIO_ROTULO, CATALOGO, MODAL_ROTULO, STATUS_ROTULO,
  type Filtros, type RelatorioId,
} from './catalogo';
import type { ConfigAssistente } from './config';
import { executarConsulta, type ResultadoConsulta } from './consultas';
import { extrairParametros } from './gemini';
import { ErroServico } from './http';
import { CONFIANCA_MINIMA, LIMITE_DADO_INDIVIDUAL, LIMITE_DESVIO, decidirComJev } from './jev';
import { MAX_MESES, resolverPeriodo, type PeriodoResolvido } from './periodo';

/**
 * Fluxo do Assistente de Relatórios, depois da autenticação e da limpeza da
 * pergunta: JEV escolhe o relatório, Gemini extrai os parâmetros, o código
 * valida, consulta o banco e escreve o resumo com os números calculados.
 */

const FONTE = 'Supabase/PostgreSQL do TFD, calculado no servidor';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const QTD = (v: number) => v.toLocaleString('pt-BR');

function descreverFiltros(f: Filtros): { rotulo: string; valor: string }[] {
  const lista: { rotulo: string; valor: string }[] = [];
  if (f.modal?.length) lista.push({ rotulo: 'Modal', valor: f.modal.map((m) => MODAL_ROTULO[m]).join(', ') });
  if (f.beneficiario?.length) lista.push({ rotulo: 'Beneficiário', valor: f.beneficiario.map((b) => BENEFICIARIO_ROTULO[b]).join(', ') });
  if (f.status?.length) lista.push({ rotulo: 'Situação', valor: f.status.map((s) => STATUS_ROTULO[s]).join(', ') });
  return lista;
}

/** Resumo escrito pelo código a partir dos números já calculados (a IA não toca em valores). */
function resumir(rel: RelatorioId, r: ResultadoConsulta, p: PeriodoResolvido): string {
  const fmt = r.unidade === 'BRL' ? BRL : QTD;
  const periodo = p.descricao.toLowerCase().startsWith('de ') ? p.descricao.toLowerCase() : `no período (${p.descricao.toLowerCase()})`;
  let frase: string;
  switch (rel) {
    case 'solicitacoes_por_status':
      frase = `${QTD(r.total)} ${r.total === 1 ? 'solicitação foi aberta' : 'solicitações foram abertas'} ${periodo}.`;
      break;
    case 'gasto_diarias':
      frase = `Foram pagos ${BRL(r.total)} em diárias ${periodo}, em ${QTD(r.registros)} ${r.registros === 1 ? 'ajuda de custo concluída' : 'ajudas de custo concluídas'}.`;
      break;
    case 'custo_total':
      frase = `O custo total do TFD foi de ${BRL(r.total)} ${periodo}.`;
      break;
    default:
      frase = `Foram gastos ${BRL(r.total)} em passagens ${periodo}, em ${QTD(r.registros)} ${r.registros === 1 ? 'passagem' : 'passagens'}.`;
  }
  const g = r.grupos;
  if (g && !g.cronologico && g.itens.length > 1 && r.total > 0) {
    const topo = g.itens[0];
    const pct = Math.round((topo.valor / r.total) * 100);
    frase += ` O maior valor foi ${topo.rotulo}, com ${fmt(topo.valor)} (${pct}% do total).`;
  } else if (g && !g.cronologico && g.itens.length === 1 && r.total > 0) {
    frase += ` Todo o valor ficou em ${g.itens[0].rotulo}.`;
  }
  return frase;
}

const MSG_PERIODO: Record<string, string> = {
  periodo_ausente: 'Para qual período você quer ver? Diga, por exemplo, "neste mês", "nos últimos 3 meses" ou "em agosto de 2026".',
  periodo_invalido: 'Não consegui entender as datas do período. Tente "em agosto de 2026" ou "de 01/07/2026 a 30/09/2026".',
  periodo_futuro: 'Esse período ainda não começou. Escolha um período até hoje.',
  periodo_longo: `O período pedido passa de ${MAX_MESES} meses. Pergunte por um período menor, como "este ano" ou "nos últimos 12 meses".`,
};

export async function responderPergunta(pergunta: string, cfg: ConfigAssistente, sb: SupabaseClient): Promise<RespostaAssistente> {
  const geradoEm = new Date().toISOString();

  // 1) JEV: qual relatório, risco e confiança.
  const decisao = await decidirComJev(pergunta, cfg.jev);
  if (decisao.desvio >= LIMITE_DESVIO || decisao.dadoIndividual >= LIMITE_DADO_INDIVIDUAL) {
    return {
      status: 'bloqueado',
      mensagem: 'Este assistente responde só totais e contagens agregadas. Ele não mostra dados de pessoas específicas, não altera o sistema e não segue instruções para mudar essas regras.',
      sugestoes: SUGESTOES_INICIAIS.slice(0, 3),
      geradoEm,
    };
  }
  if (decisao.relatorio === 'fora_do_catalogo') {
    return {
      status: 'nao_suportado',
      mensagem: 'Ainda não sei responder essa pergunta. Por enquanto respondo sobre gasto com passagens, diárias, custo total, passagens por modal ou destino e solicitações por situação.',
      sugestoes: SUGESTOES_INICIAIS,
      confianca: decisao.confianca,
      geradoEm,
    };
  }
  if (decisao.confianca < CONFIANCA_MINIMA || decisao.probabilidade < CONFIANCA_MINIMA) {
    const def = CATALOGO[decisao.relatorio];
    return {
      status: 'esclarecimento',
      mensagem: `Não tenho certeza do que você quer ver. Você quer saber sobre "${def.titulo.toLowerCase()}"? Reformule a pergunta citando o que quer somar ou contar e o período.`,
      sugestoes: SUGESTOES_INICIAIS.slice(0, 4),
      relatorio: def.id,
      confianca: decisao.confianca,
      geradoEm,
    };
  }

  // 2) Gemini: parâmetros estruturados (já validados contra o catálogo).
  const rel = decisao.relatorio;
  const def = CATALOGO[rel];
  const params = await extrairParametros(pergunta, rel, cfg.gemini);

  // 3) Período calculado pelo código.
  const per = resolverPeriodo(params.periodo);
  if (!per.ok) {
    return {
      status: 'esclarecimento',
      mensagem: MSG_PERIODO[per.motivo] ?? MSG_PERIODO.periodo_invalido,
      sugestoes: [`${def.titulo} neste mês`, `${def.titulo} nos últimos 3 meses`, `${def.titulo} neste ano`],
      relatorio: rel,
      confianca: decisao.confianca,
      geradoEm,
    };
  }

  // 4) Consulta autorizada ao banco e soma em código.
  const r = await executarConsulta(sb, rel, per.periodo, params.filtros, params.agrupamento);
  const filtros = descreverFiltros(params.filtros);
  const agrupamento = params.agrupamento !== 'nenhum' ? AGRUPAMENTO_ROTULO[params.agrupamento] : null;
  // O título de relatórios já agrupados (ex.: "por modal") não repete o agrupamento padrão.
  const porExtra = agrupamento && params.agrupamento !== def.agrupamentoPadrao ? ` por ${agrupamento.toLowerCase()}` : '';
  const base = {
    relatorio: rel,
    perguntaInterpretada: `${def.titulo}${porExtra}, ${per.periodo.descricao.toLowerCase()}`,
    periodo: { ...per.periodo, campoData: def.campoData },
    filtros,
    premissa: def.premissa,
    avisos: r.avisos,
    confianca: decisao.confianca,
    fonte: FONTE,
    geradoEm,
  };

  if (r.registros === 0 && r.total === 0) {
    return { ...base, status: 'sem_resultado', mensagem: 'Não há registros para esse período e esses filtros.' };
  }

  return {
    ...base,
    status: 'ok',
    resultado: { rotulo: r.rotulo, valor: r.total, unidade: r.unidade, composicao: r.composicao },
    grupos: r.grupos && r.grupos.itens.length
      ? { titulo: agrupamento ?? 'Detalhe', unidade: r.unidade, itens: r.grupos.itens, omitidos: r.grupos.omitidos }
      : undefined,
    resumo: resumir(rel, r, per.periodo),
  };
}

/** Converte falha de serviço em resposta amigável, sem detalhes internos. */
export function respostaDeErro(e: unknown): { corpo: RespostaAssistente; status: number } {
  const geradoEm = new Date().toISOString();
  if (e instanceof ErroServico) {
    const nome = e.servico === 'banco' ? 'o banco de dados' : e.servico === 'jev' ? 'o serviço de classificação (JEV)' : 'o serviço de interpretação (Gemini)';
    const mensagem =
      e.tipo === 'timeout' ? `A consulta demorou demais em ${nome}. Tente de novo em instantes.`
      : e.tipo === 'limite' && e.servico === 'banco' ? 'O período tem registros demais para responder de uma vez. Pergunte por um período menor.'
      : e.tipo === 'limite' ? `O limite de uso de ${nome} foi atingido. Aguarde um minuto e tente de novo.`
      : e.tipo === 'autenticacao' ? `A chave de ${nome} foi recusada. Confira a configuração do servidor.`
      : e.tipo === 'modelo' ? `O modelo configurado para ${nome} não está disponível. Confira a variável de modelo no servidor.`
      : e.tipo === 'resposta_invalida' ? 'Não consegui interpretar a pergunta com segurança. Tente reformular com o que quer somar e o período.'
      : `Não consegui falar com ${nome} agora. Tente de novo em instantes.`;
    return { corpo: { status: 'erro', mensagem, geradoEm }, status: e.tipo === 'resposta_invalida' ? 422 : 503 };
  }
  return { corpo: { status: 'erro', mensagem: 'Algo deu errado ao responder. Tente de novo.', geradoEm }, status: 500 };
}
