import type { TermoCompromisso } from '../models/termo-compromisso.model';
import { MOCK_PACIENTES } from './pacientes.mock';

/* ── Mock: processos com Termo de Compromisso ── */

export const MOCK_TERMOS: TermoCompromisso[] = [
  // ─── 1. Registrado — Aceite presencial ────────────────
  {
    id: 'termo-001',
    solicitacaoId: 'sol-001',
    numeroProcesso: 'TFD-2026-000112',
    pacienteNome: MOCK_PACIENTES[0].nome,
    pacienteCpf: MOCK_PACIENTES[0].cpf,
    pacienteRg: '1234567 SSP/MA',
    pacienteCns: MOCK_PACIENTES[0].cns,
    pacienteEndereco: `${MOCK_PACIENTES[0].endereco.logradouro}, ${MOCK_PACIENTES[0].endereco.numero} — ${MOCK_PACIENTES[0].endereco.cidade}/${MOCK_PACIENTES[0].endereco.uf}`,
    pacienteMunicipio: MOCK_PACIENTES[0].municipioOrigem,
    status: 'REGISTRADO',
    modalidadeAceite: 'ACEITE_PRESENCIAL',
    confirmacaoLeitura: true,
    dataRegistro: '2026-03-15T10:32:00',
    registradoPor: 'Maria Silva',
    dataCriacao: '2026-03-15T09:00:00',
  },

  // ─── 2. Pendente ──────────────────────────────────────
  {
    id: 'termo-002',
    solicitacaoId: 'sol-002',
    numeroProcesso: 'TFD-2026-000234',
    pacienteNome: MOCK_PACIENTES[1].nome,
    pacienteCpf: MOCK_PACIENTES[1].cpf,
    pacienteRg: '2345678 SSP/MA',
    pacienteCns: MOCK_PACIENTES[1].cns,
    pacienteEndereco: `${MOCK_PACIENTES[1].endereco.logradouro}, ${MOCK_PACIENTES[1].endereco.numero} — ${MOCK_PACIENTES[1].endereco.cidade}/${MOCK_PACIENTES[1].endereco.uf}`,
    pacienteMunicipio: MOCK_PACIENTES[1].municipioOrigem,
    status: 'PENDENTE',
    dataCriacao: '2026-03-18T14:15:00',
  },

  // ─── 3. Registrado — Upload de scan ───────────────────
  {
    id: 'termo-003',
    solicitacaoId: 'sol-003',
    numeroProcesso: 'TFD-2026-000356',
    pacienteNome: MOCK_PACIENTES[2].nome,
    pacienteCpf: MOCK_PACIENTES[2].cpf,
    pacienteRg: '3456789 SSP/MA',
    pacienteCns: MOCK_PACIENTES[2].cns,
    pacienteEndereco: `${MOCK_PACIENTES[2].endereco.logradouro}, ${MOCK_PACIENTES[2].endereco.numero} — ${MOCK_PACIENTES[2].endereco.cidade}/${MOCK_PACIENTES[2].endereco.uf}`,
    pacienteMunicipio: MOCK_PACIENTES[2].municipioOrigem,
    status: 'REGISTRADO',
    modalidadeAceite: 'UPLOAD_ASSINADO',
    arquivoUrl: '/uploads/termo-scan-003.pdf',
    arquivoNome: 'Termo_Assinado_Francisca_Pereira.pdf',
    dataRegistro: '2026-03-20T08:45:00',
    registradoPor: 'João Atendente',
    dataCriacao: '2026-03-19T11:30:00',
  },

  // ─── 4. Pendente — Paciente menor de idade ────────────
  {
    id: 'termo-004',
    solicitacaoId: 'sol-006',
    numeroProcesso: 'TFD-2026-000478',
    pacienteNome: MOCK_PACIENTES[5].nome, // Pedro Henrique — nascido em 2008 (menor)
    pacienteCpf: MOCK_PACIENTES[5].cpf,
    pacienteRg: '6789012 SSP/MA',
    pacienteCns: MOCK_PACIENTES[5].cns,
    pacienteEndereco: `${MOCK_PACIENTES[5].endereco.logradouro}, ${MOCK_PACIENTES[5].endereco.numero} — ${MOCK_PACIENTES[5].endereco.cidade}/${MOCK_PACIENTES[5].endereco.uf}`,
    pacienteMunicipio: MOCK_PACIENTES[5].municipioOrigem,
    status: 'PENDENTE',
    dataCriacao: '2026-03-25T16:00:00',
  },
];
