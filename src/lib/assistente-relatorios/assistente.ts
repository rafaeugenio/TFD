import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUGESTOES_INICIAIS, type RespostaAssistente, type Unidade } from '@/app/relatorios/_assistente/contrato';
import {
  AGRUPAMENTO_ROTULO, BENEFICIARIO_ROTULO, CATALOGO, MODAL_ROTULO, PRIORIDADE_ROTULO, STATUS_ROTULO,
  type Filtros, type RelatorioId,
} from './catalogo';
import type { ConfigAssistente } from './config';
import { executarConsulta, type ResultadoConsulta } from './consultas';
import { interpretarPergunta, narrarResposta, type DadosNarracao, type Interpretacao, type TurnoAnterior } from './gemini';
import { ErroServico } from './http';
import { CONFIANCA_MINIMA, LIMITE_DADO_INDIVIDUAL, LIMITE_DESVIO, decidirComJev } from './jev';
import { MAX_MESES, periodoPorTexto, resolverPeriodo, type PeriodoResolvido } from './periodo';

/**
 * Fluxo do assistente, depois da autenticação e da limpeza da pergunta:
 *  1. Gemini (gratuito) pensa na pergunta e a traduz numa frase explícita, com o período.
 *  2. JEV escolhe a consulta do catálogo, o agrupamento e os filtros, e mede risco e confiança.
 *  3. O código consulta o banco (só leitura, sessão do usuário) e calcula os números.
 *  4. Gemini escreve a resposta a partir do resultado agregado; o texto só é aceito
 *     se cada número dele existir no resultado. Se o Gemini falhar ou passar do
 *     limite gratuito, o código usa regras simples no passo 1 e texto próprio no 4.
 */

const FONTE = 'Supabase/PostgreSQL do TFD, calculado no servidor';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const QTD = (v: number) => v.toLocaleString('pt-BR');
const DIAS = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${v === 1 ? 'dia' : 'dias'}`;
const formatador = (u: Unidade) => (u === 'BRL' ? BRL : u === 'dias' ? DIAS : QTD);

function descreverFiltros(f: Filtros): { rotulo: string; valor: string }[] {
  const lista: { rotulo: string; valor: string }[] = [];
  if (f.modal?.length) lista.push({ rotulo: 'Modal', valor: f.modal.map((m) => MODAL_ROTULO[m]).join(', ') });
  if (f.beneficiario?.length) lista.push({ rotulo: 'Beneficiário', valor: f.beneficiario.map((b) => BENEFICIARIO_ROTULO[b]).join(', ') });
  if (f.prioridade?.length) lista.push({ rotulo: 'Prioridade', valor: f.prioridade.map((p) => PRIORIDADE_ROTULO[p]).join(', ') });
  if (f.status?.length) lista.push({ rotulo: 'Situação', valor: f.status.map((s) => STATUS_ROTULO[s]).join(', ') });
  return lista;
}

const percentual = (v: number, total: number) => `${Math.round((v / total) * 100)}%`;

const plural = (n: number, um: string, varios: string) => `${QTD(n)} ${n === 1 ? um : varios}`;
/** Legenda curta do número principal: de quantos registros ele saiu. */
function legenda(rel: RelatorioId, r: ResultadoConsulta): string | undefined {
  switch (rel) {
    case 'gasto_passagens': case 'passagens_por_modal': case 'custo_por_destino':
      return `em ${plural(r.registros, 'passagem', 'passagens')}`;
    case 'gasto_diarias': return `em ${plural(r.registros, 'ajuda de custo concluída', 'ajudas de custo concluídas')}`;
    case 'tempo_medio_conclusao': return `de ${plural(r.registros, 'solicitação concluída', 'solicitações concluídas')}`;
    case 'custo_total': return 'passagens, adicionais e diárias';
    default: return undefined;
  }
}

/**
 * Resumo escrito pelo código quando há grupos para comparar (o número
 * principal já aparece em destaque na tela, então não é repetido).
 */
function resumoDeterministico(r: ResultadoConsulta): string | undefined {
  const fmt = formatador(r.unidade);
  const g = r.grupos;
  if (!g || r.total <= 0) return undefined;
  if (g.cronologico) {
    if (g.itens.length < 2) return undefined;
    const maior = [...g.itens].sort((a, b) => b.valor - a.valor)[0];
    return `O mês com maior valor foi ${maior.rotulo}, com ${fmt(maior.valor)}.`;
  }
  if (g.itens.length === 1) return `Tudo ficou em ${g.itens[0].rotulo}.`;
  const topo = g.itens[0];
  return r.unidade === 'dias'
    ? `A maior média foi ${topo.rotulo}, com ${fmt(topo.valor)}.`
    : `${topo.rotulo} lidera, com ${fmt(topo.valor)} (${percentual(topo.valor, r.total)} do total).`;
}

/** Números (com vírgula, ponto e %) que aparecem num texto. */
const numeros = (t: string) => (t.match(/\d+(?:[.,]\d+)*%?/g) ?? []).map((n) => n.replace(/[.,]$/, ''));

/** Aceita o texto do Gemini só se todo número dele vier dos dados ou da pergunta. */
function textoConfere(texto: string, dados: DadosNarracao): boolean {
  const permitidos = new Set(numeros(JSON.stringify(dados)));
  return numeros(texto).every((n) => permitidos.has(n));
}

/**
 * Reserva sem Gemini: continuação curta ("e no mês passado?", "e por destino?")
 * herda o assunto da pergunta anterior; o período vem da pergunta atual ou da anterior.
 */
function interpretarPorRegras(pergunta: string, historico: TurnoAnterior[]): Interpretacao {
  const anterior = historico[historico.length - 1];
  const continuacao = anterior && /^(e|e\s+(no|na|nos|nas|o|a|os|as|por|em|para|pro|pra))\b/i.test(pergunta.trim()) && pergunta.length <= 60;
  if (!continuacao) return { perguntaInterpretada: pergunta, periodo: periodoPorTexto(pergunta) };
  const base = anterior.interpretacao ?? anterior.pergunta;
  // O período mais recente vale: a pergunta atual, depois os ajustes anteriores, do último para o primeiro.
  const trechos = [pergunta, ...base.split(' Ajuste pedido: ').reverse()];
  const periodo = trechos.map((t) => periodoPorTexto(t)).find((p) => p.tipo !== 'nao_informado') ?? { tipo: 'nao_informado' as const };
  return { perguntaInterpretada: `${base} Ajuste pedido: ${pergunta}`.slice(0, 240), periodo };
}

const MSG_PERIODO: Record<string, string> = {
  periodo_ausente: 'Para qual período você quer ver? Diga, por exemplo, "neste mês", "nos últimos 3 meses" ou "em agosto de 2026".',
  periodo_invalido: 'Não consegui entender as datas do período. Tente "em agosto de 2026" ou "de 01/07/2026 a 30/09/2026".',
  periodo_futuro: 'Esse período ainda não começou. Escolha um período até hoje.',
  periodo_longo: `O período pedido passa de ${MAX_MESES} meses. Pergunte por um período menor, como "este ano" ou "nos últimos 12 meses".`,
};

export async function responderPergunta(
  pergunta: string,
  historico: TurnoAnterior[],
  cfg: ConfigAssistente,
  sb: SupabaseClient,
): Promise<RespostaAssistente> {
  const geradoEm = new Date().toISOString();
  const etapas: { rotulo: string; valor: string }[] = [];

  // 1) Gemini interpreta (com regras simples de reserva).
  let interp: Interpretacao;
  try {
    interp = await interpretarPergunta(pergunta, historico, cfg.gemini);
    etapas.push({ rotulo: 'Gemini entendeu', valor: interp.perguntaInterpretada });
  } catch (e) {
    if (!(e instanceof ErroServico)) throw e;
    interp = interpretarPorRegras(pergunta, historico);
    etapas.push({ rotulo: 'Gemini indisponível', valor: e.tipo === 'cobranca' ? 'O projeto do Gemini está sem crédito; a pergunta foi lida por regras simples.' : 'A pergunta foi lida por regras simples.' });
  }

  // Métricas que ficam em outro módulo: responde direto, sem gastar JEV nem Gemini.
  if (/sigtap|\bbpa\b|faturamento sus|tabela sus/i.test(`${pergunta} ${interp.perguntaInterpretada}`)) {
    return {
      status: 'nao_suportado',
      mensagem: 'Valores SIGTAP e BPA ficam no módulo Financeiro, nas competências de Faturamento e BPA. Aqui eu respondo o valor real gasto com passagens, diárias e o custo total.',
      sugestoes: ['Quanto foi gasto em passagens em setembro?', 'Qual foi o custo total do TFD no último trimestre?'],
      perguntaInterpretada: interp.perguntaInterpretada,
      geradoEm,
    };
  }

  // 2) JEV escolhe a consulta, os parâmetros, e mede risco e confiança.
  const decisao = await decidirComJev(pergunta, interp.perguntaInterpretada, cfg.jev);
  if (decisao.desvio >= LIMITE_DESVIO || decisao.dadoIndividual >= LIMITE_DADO_INDIVIDUAL) {
    return {
      status: 'bloqueado',
      mensagem: 'Respondo só totais, contagens e médias. Não mostro dados de pessoas específicas, não altero o sistema e não sigo instruções para mudar essas regras.',
      sugestoes: SUGESTOES_INICIAIS.slice(0, 3),
      geradoEm,
    };
  }
  if (decisao.relatorio === 'fora_do_catalogo') {
    return {
      status: 'nao_suportado',
      mensagem: 'Ainda não sei responder essa pergunta com os dados do TFD. Posso falar de gastos (passagens, diárias, custo total), solicitações (abertas, em andamento, por setor, especialidade ou município), pareceres, agendamentos, pacientes cadastrados e tempo médio de conclusão.',
      sugestoes: SUGESTOES_INICIAIS,
      perguntaInterpretada: interp.perguntaInterpretada,
      confianca: decisao.confianca,
      geradoEm,
    };
  }
  const rel: RelatorioId = decisao.relatorio;
  const def = CATALOGO[rel];
  etapas.push({ rotulo: 'JEV escolheu', valor: `${def.titulo} (${Math.round(decisao.confianca * 100)}% de confiança)` });
  if (decisao.confianca < CONFIANCA_MINIMA || decisao.probabilidade < CONFIANCA_MINIMA) {
    return {
      status: 'esclarecimento',
      mensagem: `Não tenho certeza do que você quer ver. É sobre "${def.titulo.toLowerCase()}"? Reformule dizendo o que quer somar ou contar e o período.`,
      sugestoes: SUGESTOES_INICIAIS.slice(0, 4),
      relatorio: rel,
      perguntaInterpretada: interp.perguntaInterpretada,
      confianca: decisao.confianca,
      geradoEm,
    };
  }

  // 3) Período calculado pelo código.
  let periodo: PeriodoResolvido | null = null;
  if (!(interp.periodo.tipo === 'nao_informado' && def.periodoOpcional)) {
    const per = resolverPeriodo(interp.periodo);
    if (!per.ok) {
      return {
        status: 'esclarecimento',
        mensagem: MSG_PERIODO[per.motivo] ?? MSG_PERIODO.periodo_invalido,
        sugestoes: [`${def.titulo} neste mês`, `${def.titulo} nos últimos 3 meses`, `${def.titulo} neste ano`],
        relatorio: rel,
        perguntaInterpretada: interp.perguntaInterpretada,
        confianca: decisao.confianca,
        geradoEm,
      };
    }
    periodo = per.periodo;
  }

  // 4) Consulta autorizada ao banco e cálculo em código.
  const r = await executarConsulta(sb, rel, periodo, decisao.filtros, decisao.agrupamento);
  etapas.push({ rotulo: 'Banco calculou', valor: `${QTD(r.registros)} ${r.registros === 1 ? 'registro considerado' : 'registros considerados'} no servidor` });
  const filtros = descreverFiltros(decisao.filtros);
  const agrupamento = decisao.agrupamento !== 'nenhum' ? AGRUPAMENTO_ROTULO[decisao.agrupamento] : null;
  const base: RespostaAssistente = {
    status: 'ok',
    relatorio: rel,
    perguntaInterpretada: interp.perguntaInterpretada,
    periodo: periodo ? { ...periodo, campoData: def.campoData } : undefined,
    filtros,
    premissa: def.premissa,
    avisos: r.avisos,
    confianca: decisao.confianca,
    fonte: FONTE,
    geradoEm,
  };
  if (r.registros === 0) {
    return { ...base, status: 'sem_resultado', mensagem: 'Não há registros para esse período e esses filtros.', etapas };
  }

  // 5) Gemini narra a partir do resultado agregado; o código confere os números.
  const fmt = formatador(r.unidade);
  const somaGrupos = r.unidade !== 'dias' && r.total > 0;
  const dados: DadosNarracao = {
    pergunta,
    interpretacao: interp.perguntaInterpretada,
    periodo: periodo ? `${periodo.descricao} (${periodo.inicio.split('-').reverse().join('/')} a ${periodo.fim.split('-').reverse().join('/')})` : 'situação atual',
    principal: { rotulo: r.rotulo, valor: fmt(r.total) },
    grupos: r.grupos?.itens.map((g) => ({ rotulo: g.rotulo, valor: fmt(g.valor), percentual: somaGrupos ? percentual(g.valor, r.total) : undefined })),
    composicao: r.composicao?.map((c) => ({ rotulo: c.rotulo, valor: BRL(c.valor) })),
    observacoes: r.avisos,
  };
  let resumo = resumoDeterministico(r);
  // O Gemini só escreve quando há grupos para comparar; com um número só, o destaque já responde (e economiza uma chamada).
  if ((r.grupos?.itens.length ?? 0) > 1) {
    try {
      const texto = await narrarResposta({ ...dados, grupos: dados.grupos?.slice(0, 6), composicao: undefined, observacoes: undefined }, cfg.gemini);
      if (textoConfere(texto, dados)) {
        resumo = texto;
        etapas.push({ rotulo: 'Gemini escreveu', valor: 'Texto conferido: todos os números vêm do resultado.' });
      } else {
        etapas.push({ rotulo: 'Texto do Gemini descartado', valor: 'Trazia número fora do resultado; usei o resumo calculado.' });
      }
    } catch (e) {
      if (!(e instanceof ErroServico)) throw e;
    }
  }

  return {
    ...base,
    resultado: { rotulo: r.rotulo, valor: r.total, unidade: r.unidade, legenda: legenda(rel, r), composicao: r.composicao },
    grupos: r.grupos && r.grupos.itens.length ? { titulo: agrupamento ?? 'Detalhe', unidade: r.unidade, itens: r.grupos.itens, omitidos: r.grupos.omitidos } : undefined,
    resumo,
    etapas,
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
      : e.tipo === 'cobranca' ? `O projeto de ${nome} está sem crédito. Use uma chave de projeto na faixa gratuita.`
      : e.tipo === 'resposta_invalida' ? 'Não consegui interpretar a pergunta com segurança. Tente reformular com o que quer somar e o período.'
      : `Não consegui falar com ${nome} agora. Tente de novo em instantes.`;
    return { corpo: { status: 'erro', mensagem, geradoEm }, status: e.tipo === 'resposta_invalida' ? 422 : 503 };
  }
  return { corpo: { status: 'erro', mensagem: 'Algo deu errado ao responder. Tente de novo.', geradoEm }, status: 500 };
}
