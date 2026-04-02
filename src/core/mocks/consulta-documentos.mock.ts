/* ============================================================
   Consulta Geral de Documentos — Mock Data (E7)
   ============================================================ */

export interface DocumentoConsulta {
  id: string;
  numeroProcesso: string;
  paciente: string;
  tipoDocumento: string;
  tipoFormulario: string;
  etapa: string;
  status: string;
  statusInterno: string;
  dataInclusao: string;
  incluidoPor: string;
  possuiArquivo: boolean;
}

export const MOCK_DOCUMENTOS: DocumentoConsulta[] = [
  {
    id: 'doc-001',
    numeroProcesso: 'TFD-2026-001234',
    paciente: 'Maria das Graças Silva Santos',
    tipoDocumento: 'Laudo Médico',
    tipoFormulario: 'Laudo Médico',
    etapa: 'DIAGNOSTICO_CLINICO',
    status: 'Aprovado',
    statusInterno: 'APROVADA',
    dataInclusao: '2026-02-10T14:30:00',
    incluidoPor: 'Dr. Carlos Mendes',
    possuiArquivo: true,
  },
  {
    id: 'doc-002',
    numeroProcesso: 'TFD-2026-001234',
    paciente: 'Maria das Graças Silva Santos',
    tipoDocumento: 'RG',
    tipoFormulario: 'Solicitação',
    etapa: 'CADASTRO_PACIENTE',
    status: 'Aprovado',
    statusInterno: 'APROVADA',
    dataInclusao: '2026-02-08T09:15:00',
    incluidoPor: 'Ana Paula Ferreira',
    possuiArquivo: true,
  },
  {
    id: 'doc-003',
    numeroProcesso: 'TFD-2026-001235',
    paciente: 'José Ribamar Oliveira Costa',
    tipoDocumento: 'Parecer Assinado',
    tipoFormulario: 'Parecer',
    etapa: 'PARECER_MEDICO',
    status: 'Enviado p/ Rota',
    statusInterno: 'EM_ANALISE',
    dataInclusao: '2026-02-15T10:45:00',
    incluidoPor: 'Dr. Roberto Alves',
    possuiArquivo: true,
  },
  {
    id: 'doc-004',
    numeroProcesso: 'TFD-2026-001189',
    paciente: 'Francisca Alves Pereira',
    tipoDocumento: 'Comprovante de Agendamento',
    tipoFormulario: 'Relatório de Atendimento',
    etapa: 'AGENDAMENTO',
    status: 'Pendente',
    statusInterno: 'PENDENTE',
    dataInclusao: '2026-02-18T08:00:00',
    incluidoPor: 'Marcos Santos',
    possuiArquivo: false,
  },
  {
    id: 'doc-005',
    numeroProcesso: 'TFD-2026-001201',
    paciente: 'Antônio Carlos Sousa Lima',
    tipoDocumento: 'Passagem Emitida',
    tipoFormulario: 'Solicitação',
    etapa: 'VIAGENS',
    status: 'Aprovado',
    statusInterno: 'APROVADA',
    dataInclusao: '2026-02-20T11:30:00',
    incluidoPor: 'Juliana Costa',
    possuiArquivo: true,
  },
  {
    id: 'doc-006',
    numeroProcesso: 'TFD-2026-001245',
    paciente: 'Raimunda Nonata Ferreira',
    tipoDocumento: 'Comprovante de Pagamento',
    tipoFormulario: 'Recibo',
    etapa: 'AJUDA_CUSTO',
    status: 'Aprovado',
    statusInterno: 'CONCLUIDA',
    dataInclusao: '2026-02-22T15:20:00',
    incluidoPor: 'Fernanda Oliveira',
    possuiArquivo: true,
  },
  {
    id: 'doc-007',
    numeroProcesso: 'TFD-2026-001250',
    paciente: 'Pedro Henrique Barbosa Mendes',
    tipoDocumento: 'Termo de Compromisso',
    tipoFormulario: 'Termo de Compromisso',
    etapa: 'CADASTRO_PACIENTE',
    status: 'Rascunho',
    statusInterno: 'RASCUNHO',
    dataInclusao: '2026-02-25T09:00:00',
    incluidoPor: 'Ana Paula Ferreira',
    possuiArquivo: false,
  },
  {
    id: 'doc-008',
    numeroProcesso: 'TFD-2026-001178',
    paciente: 'Ana Lúcia Rodrigues Carvalho',
    tipoDocumento: 'Relatório de Alta',
    tipoFormulario: 'Relatório de Atendimento',
    etapa: 'ENCERRAMENTO',
    status: 'Aprovado',
    statusInterno: 'CONCLUIDA',
    dataInclusao: '2026-03-01T13:10:00',
    incluidoPor: 'Dr. Carlos Mendes',
    possuiArquivo: true,
  },
  {
    id: 'doc-009',
    numeroProcesso: 'TFD-2026-001199',
    paciente: 'Francisco das Chagas Ribeiro Neto',
    tipoDocumento: 'Documento de Regulação',
    tipoFormulario: 'Parecer',
    etapa: 'REGULACAO',
    status: 'Reprovado',
    statusInterno: 'INDEFERIDO',
    dataInclusao: '2026-03-03T10:00:00',
    incluidoPor: 'Dr. Roberto Alves',
    possuiArquivo: true,
  },
  {
    id: 'doc-010',
    numeroProcesso: 'TFD-2026-001260',
    paciente: 'Joana Batista Araújo',
    tipoDocumento: 'CNS',
    tipoFormulario: 'Solicitação',
    etapa: 'CADASTRO_PACIENTE',
    status: 'Pendente c/ Gestor',
    statusInterno: 'EXIGENCIA',
    dataInclusao: '2026-03-05T08:30:00',
    incluidoPor: 'Marcos Santos',
    possuiArquivo: true,
  },
  {
    id: 'doc-011',
    numeroProcesso: 'TFD-2026-001265',
    paciente: 'Carlos Eduardo Monteiro',
    tipoDocumento: 'Comunicado de Permanência',
    tipoFormulario: 'Relatório de Atendimento',
    etapa: 'PERMANENCIA',
    status: 'Enviado p/ Rota',
    statusInterno: 'EM_ANALISE',
    dataInclusao: '2026-03-07T14:00:00',
    incluidoPor: 'Fernanda Oliveira',
    possuiArquivo: false,
  },
  {
    id: 'doc-012',
    numeroProcesso: 'TFD-2026-001270',
    paciente: 'Luíza Helena Costa',
    tipoDocumento: 'Exame Complementar',
    tipoFormulario: 'Laudo Médico',
    etapa: 'DIAGNOSTICO_CLINICO',
    status: 'Em Aprovação',
    statusInterno: 'AGUARDANDO_REGULACAO',
    dataInclusao: '2026-03-10T09:45:00',
    incluidoPor: 'Dr. Carlos Mendes',
    possuiArquivo: true,
  },
];

/** Tipo de formulário — opções do dropdown */
export const TIPOS_FORMULARIO = [
  'Solicitação',
  'Laudo Médico',
  'Relatório de Atendimento',
  'Parecer',
  'Termo de Compromisso',
  'Fatura',
  'Recibo',
  'Documento Avulso',
] as const;

/** Tipos de documento — enum completo */
export const TIPOS_DOCUMENTO = [
  'RG', 'CPF', 'CNS', 'Comprovante de Residência', 'Documento Acompanhante',
  'Laudo Médico', 'Exame Complementar', 'Relatório de Tratamento Anterior',
  'Documento de Encaminhamento', 'Relatório Médico de Acompanhamento',
  'Parecer Assinado', 'Documento de Regulação', 'Resposta CNRAC', 'Resposta SETI',
  'Comprovante de Agendamento', 'Passagem Emitida', 'Cotação de Passagem',
  'Comprovante de Embarque', 'MEDIF', 'Dados Bancários', 'Comprovante de Pagamento',
  'Comunicado de Permanência', 'Relatório de Permanência', 'Relatório de Alta',
  'Certidão de Óbito', 'Termo de Compromisso', 'Declaração de Rendimentos',
  'Autorização Conta Terceiros', 'Declaração de Residência', 'Outros',
] as const;

/** Etapas do processo TFD */
export const ETAPAS = [
  'CADASTRO_PACIENTE', 'DIAGNOSTICO_CLINICO', 'PARECER_MEDICO', 'REGULACAO',
  'AGENDAMENTO', 'VIAGENS', 'AJUDA_CUSTO', 'PERMANENCIA', 'ENCERRAMENTO', 'GERAL',
] as const;

/** Status legado (exibido ao usuário) */
export const STATUS_LEGADO = [
  'Rascunho', 'Pendente', 'Enviado p/ Rota', 'Em Aprovação',
  'Reprovado', 'Pendente c/ Gestor', 'Aprovado',
] as const;

/** Label amigável para etapas */
export const ETAPA_LABELS: Record<string, string> = {
  CADASTRO_PACIENTE: 'Cadastro do Paciente',
  DIAGNOSTICO_CLINICO: 'Diagnóstico Clínico',
  PARECER_MEDICO: 'Parecer Médico',
  REGULACAO: 'Regulação',
  AGENDAMENTO: 'Agendamento',
  VIAGENS: 'Viagens',
  AJUDA_CUSTO: 'Ajuda de Custo',
  PERMANENCIA: 'Permanência',
  ENCERRAMENTO: 'Encerramento',
  GERAL: 'Geral',
};
