/* -------------------------------------------------------------------------- */
/*  Modelos prontos. Cada modelo só PRÉ-CONFIGURA o construtor: depois de     */
/*  aberto, tudo continua editável. Escritos como a pergunta que o setor faz. */
/* -------------------------------------------------------------------------- */

import type { Modelo } from './tipos';

export const MODELOS: Modelo[] = [
  {
    id: 'passagens-emitidas',
    pergunta: 'Quanto foi gasto em passagens emitidas no mês?',
    nome: 'Passagens emitidas no mês',
    descricao: 'Bilhetes emitidos pela agência, com destino, modal e valor real.',
    setor: 'Passagens',
    config: {
      assunto: 'passagens',
      periodo: { tipo: 'mes_passado' },
      referenciaData: 'dataEmissao',
      colunas: ['pessoa', 'origem', 'destino', 'modal', 'tipoBilhete', 'dataEmissao', 'valorReal'],
      filtros: [],
      agruparPor: '',
    },
  },
  {
    id: 'real-x-sigtap',
    pergunta: 'O valor real das passagens ficou acima do SIGTAP?',
    nome: 'Valor real x valor SIGTAP',
    descricao: 'Compara o que a passagem custou com o valor calculado pelo SIGTAP.',
    setor: 'Financeiro',
    config: {
      assunto: 'passagens',
      periodo: { tipo: 'mes_passado' },
      referenciaData: 'dataEmissao',
      colunas: ['pessoa', 'destino', 'modal', 'tipoBilhete', 'qtdProcedimentos', 'valorReal', 'valorSigtap', 'diferencaSigtap'],
      // Transfer não tem valor SIGTAP; fica de fora para real, SIGTAP e
      // diferença fecharem a conta entre si.
      filtros: [{ campoId: 'tipoBilhete', valores: ['Ida e volta', 'Somente ida', 'Somente volta'] }],
      agruparPor: '',
    },
  },
  {
    id: 'financeiro-quadrimestre',
    pergunta: 'Qual o resumo financeiro do último quadrimestre?',
    nome: 'Relatório financeiro',
    descricao: 'Processos, bilhetes, deslocamento, ajuda de custo, óbitos e meta SIGTAP, mês a mês.',
    setor: 'Financeiro',
    config: {
      assunto: 'financeiro',
      periodo: { tipo: 'quadrimestre_passado' },
      referenciaData: 'porIndicador',
      colunas: ['mes', 'processos', 'bilhetes', 'valorRealPassagens', 'valorSigtapDeslocamento', 'valorAjudaLancada', 'valorAjudaPaga', 'obitos', 'valorObitos', 'procRealizados', 'metaMensal', 'percentualMeta'],
      filtros: [],
      agruparPor: '',
      metaAnualSigtap: 12000,
    },
  },
  {
    id: 'ajudas-pagas',
    pergunta: 'Quanto foi pago em ajuda de custo no mês?',
    nome: 'Ajudas de custo pagas',
    descricao: 'Pagamentos do mês com diárias, tipo de ajuda e valor.',
    setor: 'Ajuda de Custo',
    config: {
      assunto: 'ajudas',
      periodo: { tipo: 'mes_passado' },
      referenciaData: 'dataPagamento',
      colunas: ['pessoa', 'pessoaTipo', 'tipoAjuda', 'diarias', 'dataPagamento', 'valorCalculado', 'valorPago'],
      filtros: [],
      agruparPor: '',
    },
  },
  {
    id: 'pacientes-regional',
    pergunta: 'Quantos pacientes de cada regional foram atendidos?',
    nome: 'Pacientes por regional',
    descricao: 'Pacientes únicos com solicitação aberta no período, somados por regional.',
    setor: 'Gestão',
    config: {
      assunto: 'pacientes',
      periodo: { tipo: 'quadrimestre_passado' },
      referenciaData: 'aberta',
      colunas: ['paciente', 'municipio', 'regional', 'macrorregiao', 'cid', 'qtdSolicitacoes', 'primeiraVez'],
      filtros: [],
      agruparPor: 'regional',
    },
  },
  {
    id: 'setores',
    pergunta: 'Quantas solicitações passaram por cada setor?',
    nome: 'Passagem pelos setores',
    descricao: 'Solicitações que estiveram em cada setor no período e com quem ficaram.',
    setor: 'Gestão',
    config: {
      assunto: 'tramitacao',
      periodo: { tipo: 'mes_passado' },
      referenciaData: 'permanencia',
      colunas: ['numero', 'paciente', 'setor', 'responsavelSetor', 'dataEntrada', 'dataSaida'],
      filtros: [],
      agruparPor: 'setor',
    },
  },
  {
    id: 'pareceres-cid',
    pergunta: 'Quantos pareceres a Regulação deu e com quais CIDs?',
    nome: 'Pareceres por CID',
    descricao: 'Pareceres do período com decisão, CID e médico responsável.',
    setor: 'Regulação',
    config: {
      assunto: 'regulacao',
      periodo: { tipo: 'este_quadrimestre' },
      referenciaData: 'dataParecer',
      colunas: ['numero', 'paciente', 'dataParecer', 'decisao', 'cidPrincipal', 'regional', 'medico'],
      filtros: [],
      agruparPor: '',
    },
  },
  {
    id: 'obitos',
    pergunta: 'Quantos óbitos tivemos e qual o valor?',
    nome: 'Óbitos no período',
    descricao: 'Solicitações encerradas por óbito, com valor registrado.',
    setor: 'Financeiro',
    config: {
      assunto: 'obitos',
      periodo: { tipo: 'este_ano' },
      referenciaData: 'dataObito',
      colunas: ['numero', 'paciente', 'municipio', 'regional', 'dataObito', 'valorObito'],
      filtros: [],
      agruparPor: '',
    },
  },
];
