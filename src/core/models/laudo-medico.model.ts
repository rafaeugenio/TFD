/* ============================================================
   Laudo Médico Digital — Interfaces & Types (C1)
   ============================================================ */

/** Status do laudo médico digital */
export type StatusLaudo = 'VAZIO' | 'RASCUNHO' | 'CONCLUIDO';

/** Classificação ASA (American Society of Anesthesiologists) */
export type RiscoCirurgicoASA = 'ASA_1' | 'ASA_2' | 'ASA_3' | 'ASA_4' | 'ASA_5';

/** Tipo de transporte recomendado */
export type TransporteRecomendado = 'RODOVIARIO' | 'AEREO';

/** Caráter do atendimento */
export type CaraterAtendimento = 'HOSPITALAR' | 'AMBULATORIAL';

/* ── Exame complementar (seção 10) ──────────────────────── */

export interface ExameComplementarLaudo {
  realizado: boolean;
  resultado: string;
  dataExame: string;
}

/* ── Cabeçalho (dados pré-populados) ────────────────────── */

export interface CabecalhoLaudo {
  unidadeSaudeSolicitante: string;
  numeroProntuario: string;
  nomePaciente: string;
  idadePaciente: number;
  medicoSolicitanteNome: string;
  medicoSolicitanteCPF: string;
  medicoSolicitanteTelefone: string;
  procedimentoSolicitado: string;
  codigoProcedimentoSUS: string;
  diagnosticoInicial: string;
  cid10: string;
  caracterAtendimento: CaraterAtendimento;
}

/* ── Seções clínicas (formulário) ───────────────────────── */

export interface SecoesClinicas {
  /* Seção 1 — Histórico da Doença */
  historicoDoenca: string;

  /* Seção 2 — Exame Físico */
  exameFisico: string;

  /* Seção 3 — Diagnóstico Provável */
  diagnosticoProvavel: string;

  /* Seção 4 — Principais Sinais e Sintomas Clínicos */
  sinaisSintomasGerais: string;
  condicoesHemodinamicas: string;
  necessidadeMensuracaoPA: boolean | null;
  padraoRespiratorio: string;
  funcaoRenalHepatica: string;
  estadoNeurologicoSumario: string;
  estadoNutricional: string;

  /* Seção 5 — Condições para Internação + Risco Cirúrgico */
  condicoesInternacao: string;
  riscoCirurgicoASA: RiscoCirurgicoASA | '';
  relatorioRiscoCirurgico: string;

  /* Seção 6 — Resultados de Provas Diagnósticas */
  resultadosProvasDiagnosticas: string;

  /* Seção 7 — Tratamentos Realizados */
  tratamentosRealizados: string;

  /* Seção 8 — Urgência */
  procedimentoUrgente: boolean | null;
  caracterizacaoUrgencia: string;

  /* Seção 9 — História Pregressa */
  historiaPregressa: string;
  alergiaMedicamentos: boolean | null;
  descricaoAlergiaMedicamentos: string;
  alergiaContrastesAnestesicos: boolean | null;
  descricaoAlergiaContrastes: string;

  /* Seção 10 — Exames Complementares Mínimos */
  hemograma: ExameComplementarLaudo;
  coagulograma: ExameComplementarLaudo;
  creatinina: ExameComplementarLaudo;
  glicemiaJejum: ExameComplementarLaudo;
  eletrocardiograma: ExameComplementarLaudo;
  outrosExames: string;

  /* Seção 11 — Justificativa para TFD */
  justificativaImpossibilidadeLocal: string;

  /* Seção 12 — Necessidade de Acompanhante */
  necessidadeAcompanhanteLaudo: boolean | null;
  justificativaAcompanhante: string;

  /* Seção 13 — Transporte Recomendável */
  transporteRecomendado: TransporteRecomendado | '';
  justificativaTransporte: string;
}

/* ── Entidade principal ─────────────────────────────────── */

export interface LaudoMedico {
  id: string;
  solicitacaoId: string;
  status: StatusLaudo;
  cabecalho: CabecalhoLaudo;
  secoes: SecoesClinicas;
  preenchidoPor?: string;
  preenchidoEm?: string;
  criadoEm: string;
  atualizadoEm: string;
}

/* ── Estado inicial (formulário vazio) ──────────────────── */

export const SECOES_CLINICAS_INITIAL: SecoesClinicas = {
  historicoDoenca: '',
  exameFisico: '',
  diagnosticoProvavel: '',
  sinaisSintomasGerais: '',
  condicoesHemodinamicas: '',
  necessidadeMensuracaoPA: null,
  padraoRespiratorio: '',
  funcaoRenalHepatica: '',
  estadoNeurologicoSumario: '',
  estadoNutricional: '',
  condicoesInternacao: '',
  riscoCirurgicoASA: '',
  relatorioRiscoCirurgico: '',
  resultadosProvasDiagnosticas: '',
  tratamentosRealizados: '',
  procedimentoUrgente: null,
  caracterizacaoUrgencia: '',
  historiaPregressa: '',
  alergiaMedicamentos: null,
  descricaoAlergiaMedicamentos: '',
  alergiaContrastesAnestesicos: null,
  descricaoAlergiaContrastes: '',
  hemograma: { realizado: false, resultado: '', dataExame: '' },
  coagulograma: { realizado: false, resultado: '', dataExame: '' },
  creatinina: { realizado: false, resultado: '', dataExame: '' },
  glicemiaJejum: { realizado: false, resultado: '', dataExame: '' },
  eletrocardiograma: { realizado: false, resultado: '', dataExame: '' },
  outrosExames: '',
  justificativaImpossibilidadeLocal: '',
  necessidadeAcompanhanteLaudo: null,
  justificativaAcompanhante: '',
  transporteRecomendado: '',
  justificativaTransporte: '',
};
