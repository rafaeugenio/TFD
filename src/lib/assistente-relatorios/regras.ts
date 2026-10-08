import 'server-only';
import { CATALOGO, type Agrupamento, type Filtros, type RelatorioId } from './catalogo';
import type { DecisaoJev } from './jev';

/**
 * Roteador de reserva para quando o JEV está fora do ar ou lento: escolhe a
 * consulta, o agrupamento e os filtros por palavras-chave do vocabulário do
 * TFD (as mesmas do glossário). É menos esperto que o JEV, mas mantém o
 * assistente respondendo. A confiança devolvida é fixa e baixa o bastante
 * para a tela deixar claro que foi uma leitura simples.
 */

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Ordem importa: o primeiro que casar vence (do mais específico ao mais geral). */
const REGRAS_RELATORIO: { id: RelatorioId; padrao: RegExp; exige?: RegExp }[] = [
  { id: 'bpa_sigtap', padrao: /sigtap|\bbpa\b|faturamento sus|valor sus|tabela sus|producao ambulatorial|codigo 08/ },
  { id: 'tempo_medio_conclusao', padrao: /tempo medio|demora|quanto tempo|quantos dias (leva|demora)|prazo medio/ },
  { id: 'pareceres_regulacao', padrao: /parecer|deferid|indeferid|deferimento|indeferimento|taxa de aprovacao/ },
  { id: 'agendamentos', padrao: /agendament|consultas? marcad|atendimentos? marcad|unidade executante/ },
  { id: 'pacientes_cadastrados', padrao: /pacientes? (cadastrad|ativos)|cadastro de pacientes|quantos pacientes/ },
  { id: 'deslocamentos', padrao: /deslocament|trechos?|\bkm\b|quilomet|milhas|rodamos|percorr/, exige: /quant|total|numero|km|milhas|rodamos|percorr/ },
  { id: 'custo_total', padrao: /custo total|custo do tfd|custou o tfd|gasto total|total gasto|quanto o tfd (custou|gastou)/ },
  { id: 'gasto_diarias', padrao: /diaria|ajudas? de custo|pernoite|alimentacao/ },
  { id: 'passagens_por_modal', padrao: /(qual|que) (modal|meio de transporte)|por modal|modal .*mais|aviao ou onibus/ },
  { id: 'custo_por_destino', padrao: /(destino|cidade|rota|para onde).*(gast|valor|custo|passag)|(gast|valor|custo|passag).*(destino|cidade|rota)/ },
  { id: 'gasto_passagens', padrao: /passage|bilhete|aviao|aereo|onibus|gast|valor real|emitid/ },
  { id: 'solicitacoes_em_andamento', padrao: /(andamento|parad|na fila|em aberto|pendente|agora|ativ)/, exige: /solicitac|processo|pedido|tfd|fila|setor/ },
  { id: 'solicitacoes_por_status', padrao: /solicitac|processo|pedido/ },
];

const REGRAS_AGRUPAMENTO: { ag: Agrupamento; padrao: RegExp }[] = [
  { ag: 'mes', padrao: /por mes|mensal|mes a mes|cada mes|evolucao|ao longo/ },
  { ag: 'procedimento', padrao: /procedimento/ },
  { ag: 'modal', padrao: /por modal|modal|meio de transporte|por tipo de transporte/ },
  { ag: 'destino', padrao: /destino|para onde/ },
  { ag: 'origem', padrao: /origem|de onde/ },
  { ag: 'setor', padrao: /setor|etapa|fila/ },
  { ag: 'especialidade', padrao: /especialidade/ },
  { ag: 'regional', padrao: /regional|\burs\b/ },
  { ag: 'municipio', padrao: /municipio|cidade/ },
  { ag: 'decisao', padrao: /deferid|indeferid|decisao|taxa/ },
  { ag: 'status', padrao: /situacao|status/ },
  { ag: 'categoria', padrao: /categoria|por tipo de custo/ },
  { ag: 'beneficiario', padrao: /beneficiario|acompanhante e paciente|paciente e acompanhante/ },
  { ag: 'prioridade', padrao: /por prioridade|urgente e normal/ },
  { ag: 'sexo', padrao: /sexo|homens e mulheres/ },
];

/** Pedido para o assistente alterar dados (o JEV faz isso melhor; aqui é a rede de segurança). */
const PEDIDO_DE_ALTERACAO = /\b(apag|delet|exclu|remov|cadastr[ea]|insir|alter[ea]|edit[ea]|aprov[ea]|cancel[ea])\w*\b.*\b(passage|solicitac|paciente|ajuda|registro|dado|processo)/;

export function decidirPorRegras(original: string, traduzida: string): DecisaoJev {
  const t = norm(`${original} ${traduzida}`);
  const pedeAlteracao = PEDIDO_DE_ALTERACAO.test(norm(original)) && !/como (faco|fazer|posso)/.test(norm(original));
  const regra = REGRAS_RELATORIO.find((r) => r.padrao.test(t) && (!r.exige || r.exige.test(t)));
  const base = { confianca: 0.7, probabilidade: 0.7, dadoIndividual: 0, desvio: pedeAlteracao ? 1 : 0, confiancaAgrupamento: 0.6 };
  if (!regra) return { ...base, relatorio: 'fora_do_catalogo', agrupamento: 'nenhum', filtros: {} };

  const def = CATALOGO[regra.id];
  const ag = REGRAS_AGRUPAMENTO.find((g) => def.agrupamentos.includes(g.ag) && g.padrao.test(t))?.ag ?? def.agrupamentoPadrao;

  const filtros: Filtros = {};
  if (def.filtros.includes('modal') && ag !== 'modal') {
    if (/aviao|aereo|voo/.test(t)) filtros.modal = ['AEREO'];
    else if (/onibus|terrestre|rodoviari|carro/.test(t)) filtros.modal = ['TERRESTRE'];
    else if (/barco|fluvial|lancha/.test(t)) filtros.modal = ['FLUVIAL'];
    else if (/transfer/.test(t)) filtros.modal = ['TRANSFER'];
  }
  if (def.filtros.includes('prioridade') && ag !== 'prioridade' && /urgent/.test(t)) filtros.prioridade = ['URGENTE'];
  if (def.filtros.includes('beneficiario') && ag !== 'beneficiario') {
    if (/(so|apenas|somente)?\s*(dos|de|para)? acompanhantes?\b/.test(t) && !/paciente/.test(t)) filtros.beneficiario = ['ACOMPANHANTE'];
  }
  return { ...base, relatorio: regra.id, agrupamento: ag, filtros };
}
