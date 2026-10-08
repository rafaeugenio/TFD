import 'server-only';

/**
 * Vocabulário do TFD que vai junto com cada pergunta para o Gemini e para o
 * JEV. Os modelos não são re-treinados: eles recebem estas definições e
 * exemplos no momento da pergunta (custo zero de treino, e dá para ajustar
 * aqui sem mexer em modelo). Para ensinar um termo novo, acrescente-o aqui.
 */

export const GLOSSARIO: { termo: string; sinonimos: string[]; significado: string }[] = [
  { termo: 'TFD', sinonimos: ['tratamento fora de domicílio', 'processo', 'solicitação'], significado: 'Programa que custeia transporte e diárias de quem precisa de tratamento fora do município. Cada pedido é uma solicitação (processo).' },
  { termo: 'passagem', sinonimos: ['bilhete', 'viagem', 'trecho emitido', 'emissão'], significado: 'Bilhete comprado para o paciente ou acompanhante (aéreo, terrestre, fluvial ou transfer). Gasto com passagens é o valor real pago.' },
  { termo: 'deslocamento', sinonimos: ['trecho', 'ida e volta', 'transporte', 'quilometragem', 'km', 'milhas'], significado: 'Cada trecho de viagem (ida ou volta). No BPA o deslocamento é valorado pela tabela SIGTAP por distância (a cada 50 km terrestre, 200 milhas aéreo, 27 milhas náuticas fluvial). Contar deslocamentos é contar trechos.' },
  { termo: 'modal', sinonimos: ['meio de transporte', 'aéreo', 'avião', 'terrestre', 'ônibus', 'fluvial', 'barco', 'transfer'], significado: 'Meio de transporte do trecho.' },
  { termo: 'ajuda de custo', sinonimos: ['diária', 'diárias', 'auxílio', 'pernoite', 'alimentação'], significado: 'Valor pago por dia fora do domicílio (R$ 24,75 com pernoite, R$ 8,40 no dia de retorno). Gasto com diárias é o valor real pago.' },
  { termo: 'SIGTAP', sinonimos: ['tabela SUS', 'tabela SIGTAP', 'valor SUS', 'código SIGTAP', 'procedimento SUS'], significado: 'Tabela de procedimentos e valores do SUS. No TFD, os códigos 08.03.01 valoram ajuda de custo e deslocamento no BPA. Valor SIGTAP é diferente do valor real pago.' },
  { termo: 'BPA', sinonimos: ['boletim de produção ambulatorial', 'produção', 'faturamento SUS', 'lançamento no SIA'], significado: 'Boletim enviado ao SIA/SUS com a produção do mês: ajudas de custo e deslocamentos valorados pela tabela SIGTAP.' },
  { termo: 'faturamento', sinonimos: ['competência de faturamento'], significado: 'Conferência mensal das passagens emitidas (valor real). Fica no módulo Financeiro, por competência.' },
  { termo: 'competência', sinonimos: ['mês de referência', 'fechamento do mês'], significado: 'Mês fechado de Faturamento e BPA no módulo Financeiro.' },
  { termo: 'adicional', sinonimos: ['extra', 'bagagem', 'passagem extra', 'transfer extra'], significado: 'Custo extra ligado a uma passagem (bagagem, passagem extra, transfer, hospedagem emergencial).' },
  { termo: 'regulação', sinonimos: ['médico regulador', 'auditor', 'parecer', 'deferimento', 'indeferimento', 'aprovada pelo médico'], significado: 'Etapa em que o médico regulador emite parecer: deferido ou indeferido.' },
  { termo: 'carimbo', sinonimos: ['CNRAC', 'CET', 'SETI', 'aprovado direto', 'rota de regulação'], significado: 'Caminho definido na regulação: aprovado direto, CNRAC (central nacional), CET/SETI (transplante) ou Serviço Social.' },
  { termo: 'agendamento', sinonimos: ['consulta marcada', 'atendimento marcado', 'unidade executante', 'hospital de destino'], significado: 'Data marcada na unidade de saúde de destino.' },
  { termo: 'setor', sinonimos: ['etapa', 'fila', 'onde está', 'parada em'], significado: 'Etapa do fluxo em que a solicitação está agora: dados básicos, regulação, passagens, ajuda de custo, acompanhamento, aprovação ou encerramento.' },
  { termo: 'em andamento', sinonimos: ['ativas', 'abertas agora', 'na fila', 'pendentes', 'em aberto'], significado: 'Solicitações que ainda não foram concluídas, indeferidas ou canceladas.' },
  { termo: 'encerramento', sinonimos: ['concluída', 'finalizada', 'alta', 'arquivada'], significado: 'Fim do processo (alta médica, desistência, óbito, transferência).' },
  { termo: 'acompanhante', sinonimos: ['familiar', 'responsável', 'doador'], significado: 'Pessoa que viaja com o paciente; também recebe passagem e ajuda de custo. Acompanhante doador conta como paciente no BPA.' },
  { termo: 'URS', sinonimos: ['regional', 'regional de saúde'], significado: 'Unidade regional de saúde que agrupa municípios.' },
];

/** Glossário compacto em texto, para instruções de modelo. */
export function glossarioTexto(): string {
  return GLOSSARIO.map((g) => `- ${g.termo} (${g.sinonimos.join(', ')}): ${g.significado}`).join('\n');
}

/** Só os termos que aparecem no texto (para não gastar contexto à toa). */
export function termosCitados(texto: string): typeof GLOSSARIO {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return GLOSSARIO.filter((g) => [g.termo, ...g.sinonimos].some((s) => new RegExp(`\\b${norm(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t)));
}

/** Exemplos de perguntas e como devem ser entendidas (few-shot para o Gemini). */
export const EXEMPLOS_INTERPRETACAO = [
  ['qual o valor sigtap de setembro?', 'Valor total SIGTAP (BPA) de ajudas de custo e deslocamentos em setembro de 2026.'],
  ['quanto deu o BPA do trimestre por procedimento', 'Valor SIGTAP do BPA no trimestre passado, separado por procedimento (ajuda de custo e deslocamento).'],
  ['quantos deslocamentos tivemos esse mês', 'Quantidade de deslocamentos (trechos de viagem) neste mês.'],
  ['quantos km rodamos de ônibus em agosto', 'Quantidade de deslocamentos terrestres e quilometragem em agosto de 2026.'],
  ['quanto gastamos de avião este ano', 'Soma em reais do gasto com passagens aéreas neste ano.'],
  ['quanto saiu de diária no mês passado', 'Soma em reais do gasto com diárias (ajuda de custo) no mês passado.'],
  ['quantos processos estão parados na regulação', 'Quantidade de solicitações em andamento agora, separadas por setor.'],
  ['qual a taxa de indeferimento do ano', 'Quantidade de pareceres da regulação neste ano, separados por decisão (deferido e indeferido).'],
] as const;
