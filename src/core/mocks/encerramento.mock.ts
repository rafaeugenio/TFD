export type MotivoEncerramento = 'ALTA_MEDICA' | 'TRANSFERENCIA' | 'DESISTENCIA' | 'ABANDONO' | 'OBITO';
export type StatusEncerramento = 'PENDENTE' | 'CONCLUIDO';

export interface ConciliacaoDetail {
  passagemIda: boolean;
  embarqueConfirmado: boolean;
  passagemRetornoEmitida: boolean;
  diariasPagas: boolean;
  diariasPendentes: number;
  complementosConciliados: boolean;
  complementosPendentes: number;
  documentosAnexados: boolean;
}

export interface EncerramentoItem {
  id: string;
  solicitacaoId: string;
  numeroProcesso: string;
  pacienteNome: string;
  cidCodigo: string;
  cidDescricao: string;
  motivo: MotivoEncerramento;
  dataAlta: string;
  status: StatusEncerramento;
  passagemRetorno: 'EMITIDA' | 'PENDENTE' | 'NAO_APLICAVEL';
  diarias: 'CONCILIADA' | 'PENDENTE';
  documentosAlta: 'ANEXADO' | 'PENDENTE';
  complementosPendentes: number;
  observacoes?: string;
  conciliacao: ConciliacaoDetail;
}

export const MOCK_ENCERRAMENTOS: EncerramentoItem[] = [
  // ── 4 × ALTA_MEDICA ──────────────────────────────────
  {
    id: 'enc-001',
    solicitacaoId: 'sol-007',
    numeroProcesso: 'TFD-2026-001178',
    pacienteNome: 'Ana Lucia Rodrigues Carvalho',
    cidCodigo: 'C50.9',
    cidDescricao: 'Neoplasia maligna da mama',
    motivo: 'ALTA_MEDICA',
    dataAlta: '2026-03-12',
    status: 'CONCLUIDO',
    passagemRetorno: 'EMITIDA',
    diarias: 'CONCILIADA',
    documentosAlta: 'ANEXADO',
    complementosPendentes: 0,
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: true,
      diariasPagas: true,
      diariasPendentes: 0,
      complementosConciliados: true,
      complementosPendentes: 0,
      documentosAnexados: true,
    },
  },
  {
    id: 'enc-002',
    solicitacaoId: 'sol-002',
    numeroProcesso: 'TFD-2026-001235',
    pacienteNome: 'Jose Ribamar Oliveira Costa',
    cidCodigo: 'C61',
    cidDescricao: 'Neoplasia maligna da prostata',
    motivo: 'ALTA_MEDICA',
    dataAlta: '2026-03-28',
    status: 'PENDENTE',
    passagemRetorno: 'PENDENTE',
    diarias: 'PENDENTE',
    documentosAlta: 'PENDENTE',
    complementosPendentes: 2,
    observacoes: 'Aguardando emissao de passagem de retorno e conciliacao de diarias',
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: false,
      diariasPagas: false,
      diariasPendentes: 3,
      complementosConciliados: false,
      complementosPendentes: 2,
      documentosAnexados: false,
    },
  },
  {
    id: 'enc-003',
    solicitacaoId: 'sol-011',
    numeroProcesso: 'TFD-2026-001290',
    pacienteNome: 'Maria das Gracas Sousa Lima',
    cidCodigo: 'I25.1',
    cidDescricao: 'Doenca aterosclerotica do coracao',
    motivo: 'ALTA_MEDICA',
    dataAlta: '2026-03-20',
    status: 'CONCLUIDO',
    passagemRetorno: 'EMITIDA',
    diarias: 'CONCILIADA',
    documentosAlta: 'ANEXADO',
    complementosPendentes: 0,
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: true,
      diariasPagas: true,
      diariasPendentes: 0,
      complementosConciliados: true,
      complementosPendentes: 0,
      documentosAnexados: true,
    },
  },
  {
    id: 'enc-004',
    solicitacaoId: 'sol-015',
    numeroProcesso: 'TFD-2026-001312',
    pacienteNome: 'Sebastiao Ferreira Neto',
    cidCodigo: 'H40.1',
    cidDescricao: 'Glaucoma primario de angulo aberto',
    motivo: 'ALTA_MEDICA',
    dataAlta: '2026-03-22',
    status: 'PENDENTE',
    passagemRetorno: 'EMITIDA',
    diarias: 'PENDENTE',
    documentosAlta: 'ANEXADO',
    complementosPendentes: 0,
    observacoes: 'Diarias pendentes de conciliacao — paciente ja retornou',
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: true,
      diariasPagas: false,
      diariasPendentes: 1,
      complementosConciliados: true,
      complementosPendentes: 0,
      documentosAnexados: true,
    },
  },

  // ── 2 × TRANSFERENCIA ────────────────────────────────
  {
    id: 'enc-005',
    solicitacaoId: 'sol-008',
    numeroProcesso: 'TFD-2026-001200',
    pacienteNome: 'Joana Darc Ribeiro Santos',
    cidCodigo: 'C34.9',
    cidDescricao: 'Neoplasia maligna do bronquio ou pulmao',
    motivo: 'TRANSFERENCIA',
    dataAlta: '2026-03-18',
    status: 'CONCLUIDO',
    passagemRetorno: 'NAO_APLICAVEL',
    diarias: 'CONCILIADA',
    documentosAlta: 'ANEXADO',
    complementosPendentes: 0,
    observacoes: 'Transferida para rede local — Hospital UDI, Sao Luis',
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: false,
      diariasPagas: true,
      diariasPendentes: 0,
      complementosConciliados: true,
      complementosPendentes: 0,
      documentosAnexados: true,
    },
  },
  {
    id: 'enc-006',
    solicitacaoId: 'sol-012',
    numeroProcesso: 'TFD-2026-001298',
    pacienteNome: 'Antonio Carlos Mendes Filho',
    cidCodigo: 'M16.1',
    cidDescricao: 'Coxartrose primaria unilateral',
    motivo: 'TRANSFERENCIA',
    dataAlta: '2026-03-24',
    status: 'PENDENTE',
    passagemRetorno: 'NAO_APLICAVEL',
    diarias: 'PENDENTE',
    documentosAlta: 'PENDENTE',
    complementosPendentes: 1,
    observacoes: 'Transferido para Hospital Sarah — Sao Luis, MA. Documentacao pendente.',
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: false,
      diariasPagas: false,
      diariasPendentes: 2,
      complementosConciliados: false,
      complementosPendentes: 1,
      documentosAnexados: false,
    },
  },

  // ── 2 × DESISTENCIA ──────────────────────────────────
  {
    id: 'enc-007',
    solicitacaoId: 'sol-009',
    numeroProcesso: 'TFD-2026-001215',
    pacienteNome: 'Luciana Barbosa Martins',
    cidCodigo: 'K80.2',
    cidDescricao: 'Calculo da vesicula biliar sem colecistite',
    motivo: 'DESISTENCIA',
    dataAlta: '2026-03-16',
    status: 'CONCLUIDO',
    passagemRetorno: 'EMITIDA',
    diarias: 'CONCILIADA',
    documentosAlta: 'ANEXADO',
    complementosPendentes: 0,
    observacoes: 'Paciente optou por realizar procedimento na rede local',
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: true,
      diariasPagas: true,
      diariasPendentes: 0,
      complementosConciliados: true,
      complementosPendentes: 0,
      documentosAnexados: true,
    },
  },
  {
    id: 'enc-008',
    solicitacaoId: 'sol-014',
    numeroProcesso: 'TFD-2026-001305',
    pacienteNome: 'Francisco de Assis Pereira',
    cidCodigo: 'E11.9',
    cidDescricao: 'Diabetes mellitus tipo 2 sem complicacoes',
    motivo: 'DESISTENCIA',
    dataAlta: '2026-03-21',
    status: 'PENDENTE',
    passagemRetorno: 'PENDENTE',
    diarias: 'PENDENTE',
    documentosAlta: 'PENDENTE',
    complementosPendentes: 0,
    observacoes: 'Paciente desistiu do tratamento por motivos pessoais. Passagem de retorno nao emitida.',
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: false,
      diariasPagas: false,
      diariasPendentes: 2,
      complementosConciliados: true,
      complementosPendentes: 0,
      documentosAnexados: false,
    },
  },

  // ── 1 × ABANDONO ──────────────────────────────────────
  {
    id: 'enc-009',
    solicitacaoId: 'sol-013',
    numeroProcesso: 'TFD-2026-001301',
    pacienteNome: 'Raimundo Nonato Silva',
    cidCodigo: 'F20.0',
    cidDescricao: 'Esquizofrenia paranoide',
    motivo: 'ABANDONO',
    dataAlta: '2026-03-19',
    status: 'PENDENTE',
    passagemRetorno: 'PENDENTE',
    diarias: 'PENDENTE',
    documentosAlta: 'PENDENTE',
    complementosPendentes: 1,
    observacoes: 'Paciente abandonou tratamento. Nao compareceu as ultimas 3 consultas agendadas.',
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: false,
      diariasPagas: false,
      diariasPendentes: 4,
      complementosConciliados: false,
      complementosPendentes: 1,
      documentosAnexados: false,
    },
  },

  // ── 1 × OBITO ─────────────────────────────────────────
  {
    id: 'enc-010',
    solicitacaoId: 'sol-016',
    numeroProcesso: 'TFD-2026-001320',
    pacienteNome: 'Maria Aparecida Gomes',
    cidCodigo: 'C18.9',
    cidDescricao: 'Neoplasia maligna do colon',
    motivo: 'OBITO',
    dataAlta: '2026-03-17',
    status: 'PENDENTE',
    passagemRetorno: 'NAO_APLICAVEL',
    diarias: 'PENDENTE',
    documentosAlta: 'PENDENTE',
    complementosPendentes: 0,
    observacoes: 'Obito em 17/03/2026. Acompanhante necessita retorno.',
    conciliacao: {
      passagemIda: true,
      embarqueConfirmado: true,
      passagemRetornoEmitida: false,
      diariasPagas: false,
      diariasPendentes: 2,
      complementosConciliados: true,
      complementosPendentes: 0,
      documentosAnexados: false,
    },
  },
];
