import { Permanencia } from '../models/ajuda-custo.model';

export type StatusPermanencia = 'ATIVA' | 'PRORROGADA' | 'ALTA_PENDENTE' | 'CONCLUIDA';

export interface PermanenciaDisplay extends Permanencia {
  pacienteNome: string;
  numeroSolicitacao: string;
  destino: string;
  statusDisplay: StatusPermanencia;
  totalDias: number;
  totalProrrogacoes: number;
}

export const MOCK_PERMANENCIAS: PermanenciaDisplay[] = [
  {
    id: 'perm-001',
    solicitacaoId: 'sol-003',
    dataInicio: '2026-03-15',
    dataFimPrevista: '2026-03-22',
    prorrogacoes: [
      {
        id: 'pror-001',
        dataInicio: '2026-03-22',
        dataFim: '2026-03-29',
        justificativa: 'Necessidade de sessão adicional de quimioterapia',
        aprovadoPor: 'Maria Silva',
        dataAprovacao: '2026-03-21',
      },
    ],
    pacienteNome: 'Francisca Alves Pereira',
    numeroSolicitacao: 'TFD-2026-001189',
    destino: 'Hospital Sírio-Libanês — São Paulo, SP',
    statusDisplay: 'PRORROGADA',
    totalDias: 14,
    totalProrrogacoes: 1,
  },
  {
    id: 'perm-002',
    solicitacaoId: 'sol-005',
    dataInicio: '2026-03-24',
    dataFimPrevista: '2026-03-29',
    prorrogacoes: [],
    pacienteNome: 'Raimunda Nonata Ferreira',
    numeroSolicitacao: 'TFD-2026-001245',
    destino: 'Hospital das Clínicas — Recife, PE',
    statusDisplay: 'ATIVA',
    totalDias: 5,
    totalProrrogacoes: 0,
  },
  {
    id: 'perm-003',
    solicitacaoId: 'sol-007',
    dataInicio: '2026-03-01',
    dataFimPrevista: '2026-03-08',
    dataFimReal: '2026-03-12',
    prorrogacoes: [
      {
        id: 'pror-002',
        dataInicio: '2026-03-08',
        dataFim: '2026-03-12',
        justificativa: 'Aguardando resultado de biopsia',
        aprovadoPor: 'Maria Silva',
        dataAprovacao: '2026-03-07',
      },
    ],
    motivoAlta: 'ALTA_MEDICA',
    pacienteNome: 'Ana Lucia Rodrigues Carvalho',
    numeroSolicitacao: 'TFD-2026-001178',
    destino: 'Hospital de Base — Brasilia, DF',
    statusDisplay: 'CONCLUIDA',
    totalDias: 11,
    totalProrrogacoes: 1,
  },
  {
    id: 'perm-004',
    solicitacaoId: 'sol-010',
    dataInicio: '2026-03-26',
    dataFimPrevista: '2026-04-01',
    prorrogacoes: [],
    pacienteNome: 'Carlos Eduardo Monteiro',
    numeroSolicitacao: 'TFD-2026-001265',
    destino: 'INCA — Rio de Janeiro, RJ',
    statusDisplay: 'ATIVA',
    totalDias: 6,
    totalProrrogacoes: 0,
  },
  {
    id: 'perm-005',
    solicitacaoId: 'sol-002',
    dataInicio: '2026-03-22',
    dataFimPrevista: '2026-03-30',
    prorrogacoes: [],
    pacienteNome: 'Jose Ribamar Oliveira Costa',
    numeroSolicitacao: 'TFD-2026-001235',
    destino: 'Hospital Araujo Jorge — Goiania, GO',
    statusDisplay: 'ALTA_PENDENTE',
    totalDias: 8,
    totalProrrogacoes: 0,
    observacoes: 'Paciente recebeu alta medica em 28/03, aguardando passagem de retorno',
  },
  {
    id: 'perm-006',
    solicitacaoId: 'sol-006',
    dataInicio: '2026-03-28',
    dataFimPrevista: '2026-04-04',
    prorrogacoes: [],
    pacienteNome: 'Pedro Henrique Barbosa Mendes',
    numeroSolicitacao: 'TFD-2026-001250',
    destino: 'Hospital das Clínicas — São Paulo, SP',
    statusDisplay: 'ATIVA',
    totalDias: 7,
    totalProrrogacoes: 0,
    observacoes: 'Paciente menor de idade — acompanhante obrigatório',
  },
];
