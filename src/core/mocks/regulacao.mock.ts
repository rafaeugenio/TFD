/* ============================================================
   TFD — Mock data: Regulação queue
   ============================================================ */

export type CategoriaRegulacao =
  | 'PRONTOS'
  | 'CNRAC'
  | 'SETI'
  | 'EXTERNO'
  | 'SERVICO_SOCIAL'
  | 'PRORROGACAO';

export type PrioridadeRegulacao = 'NORMAL' | 'URGENTE' | 'EMERGENCIAL';

export interface RegulacaoItem {
  id: string;
  solicitacaoId: string;
  numeroProcesso: string;
  pacienteNome: string;
  pacienteCpf: string;
  cidCodigo: string;
  cidDescricao: string;
  categoria: CategoriaRegulacao;
  diasNaFila: number;
  ultimaAcao: string;
  ultimaAcaoData: string;
  prioridade: PrioridadeRegulacao;
  temPendencias: boolean;
  cobrancasPendentes: number;
  parecerMedico?: {
    status: string;
    medico: string;
    data: string;
    observacoes: string;
  };
  observacoes?: string;
}

export const MOCK_REGULACAO: RegulacaoItem[] = [
  /* ---- PRONTOS PARA ANÁLISE ---- */
  {
    id: 'reg-001',
    solicitacaoId: 'sol-001',
    numeroProcesso: 'TFD-2026-001234',
    pacienteNome: 'Maria das Graças Silva Santos',
    pacienteCpf: '12345678901',
    cidCodigo: 'C50.9',
    cidDescricao: 'Neoplasia maligna da mama',
    categoria: 'PRONTOS',
    diasNaFila: 2,
    ultimaAcao: 'Parecer médico deferido',
    ultimaAcaoData: '2026-03-22',
    prioridade: 'URGENTE',
    temPendencias: false,
    cobrancasPendentes: 0,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dr. Ricardo Andrade',
      data: '2026-03-22',
      observacoes: 'Paciente necessita de tratamento oncológico de alta complexidade. Recomenda-se encaminhamento para centro de referência.',
    },
  },
  {
    id: 'reg-002',
    solicitacaoId: 'sol-009',
    numeroProcesso: 'TFD-2026-001260',
    pacienteNome: 'Joana Batista Araujo',
    pacienteCpf: '98765432100',
    cidCodigo: 'H35.3',
    cidDescricao: 'Degeneração da mácula e do pólo posterior',
    categoria: 'PRONTOS',
    diasNaFila: 1,
    ultimaAcao: 'Parecer médico deferido',
    ultimaAcaoData: '2026-03-23',
    prioridade: 'NORMAL',
    temPendencias: false,
    cobrancasPendentes: 0,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dra. Fernanda Moreira',
      data: '2026-03-23',
      observacoes: 'Paciente com degeneração macular avançada. Necessita cirurgia de retina em centro especializado.',
    },
  },
  {
    id: 'reg-003',
    solicitacaoId: 'sol-015',
    numeroProcesso: 'TFD-2026-001290',
    pacienteNome: 'Sebastião Ferreira Lima',
    pacienteCpf: '45678912300',
    cidCodigo: 'I25.1',
    cidDescricao: 'Doença aterosclerótica do coração',
    categoria: 'PRONTOS',
    diasNaFila: 4,
    ultimaAcao: 'Parecer médico deferido',
    ultimaAcaoData: '2026-03-20',
    prioridade: 'EMERGENCIAL',
    temPendencias: false,
    cobrancasPendentes: 0,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dr. Paulo Mendes',
      data: '2026-03-20',
      observacoes: 'Paciente com obstrução coronariana grave. Necessita cirurgia de revascularização com urgência.',
    },
  },

  /* ---- AGUARDANDO CNRAC ---- */
  {
    id: 'reg-004',
    solicitacaoId: 'sol-003',
    numeroProcesso: 'TFD-2026-001189',
    pacienteNome: 'Francisca Alves Pereira',
    pacienteCpf: '11122233344',
    cidCodigo: 'C34.9',
    cidDescricao: 'Neoplasia maligna dos brônquios ou pulmões',
    categoria: 'CNRAC',
    diasNaFila: 12,
    ultimaAcao: 'Encaminhado para CNRAC',
    ultimaAcaoData: '2026-03-12',
    prioridade: 'URGENTE',
    temPendencias: true,
    cobrancasPendentes: 1,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dr. Ricardo Andrade',
      data: '2026-03-10',
      observacoes: 'Paciente necessita de quimioterapia de alta complexidade. Encaminhado via CNRAC.',
    },
    observacoes: 'Aguardando vaga no Hospital Sírio-Libanês',
  },
  {
    id: 'reg-005',
    solicitacaoId: 'sol-011',
    numeroProcesso: 'TFD-2026-001270',
    pacienteNome: 'Manoel Ribeiro Sousa',
    pacienteCpf: '55566677788',
    cidCodigo: 'C71.9',
    cidDescricao: 'Neoplasia maligna do encéfalo',
    categoria: 'CNRAC',
    diasNaFila: 8,
    ultimaAcao: 'Cobrança enviada para CNRAC',
    ultimaAcaoData: '2026-03-18',
    prioridade: 'EMERGENCIAL',
    temPendencias: true,
    cobrancasPendentes: 2,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dr. Paulo Mendes',
      data: '2026-03-14',
      observacoes: 'Tumor cerebral com indicação cirúrgica. Alta complexidade — CNRAC obrigatório.',
    },
  },

  /* ---- AGUARDANDO SETI ---- */
  {
    id: 'reg-006',
    solicitacaoId: 'sol-012',
    numeroProcesso: 'TFD-2026-001275',
    pacienteNome: 'Luiza Helena Costa Martins',
    pacienteCpf: '77788899900',
    cidCodigo: 'N18.5',
    cidDescricao: 'Doença renal crônica, estágio 5',
    categoria: 'SETI',
    diasNaFila: 15,
    ultimaAcao: 'Encaminhado para SETI',
    ultimaAcaoData: '2026-03-09',
    prioridade: 'EMERGENCIAL',
    temPendencias: true,
    cobrancasPendentes: 1,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dra. Fernanda Moreira',
      data: '2026-03-08',
      observacoes: 'Paciente em estágio terminal de doença renal. Indicação de transplante renal. Encaminhamento via SETI.',
    },
    observacoes: 'Paciente em diálise — acompanhamento periódico necessário',
  },
  {
    id: 'reg-007',
    solicitacaoId: 'sol-013',
    numeroProcesso: 'TFD-2026-001280',
    pacienteNome: 'Roberto Carlos Nascimento',
    pacienteCpf: '33344455566',
    cidCodigo: 'K74.6',
    cidDescricao: 'Cirrose hepática',
    categoria: 'SETI',
    diasNaFila: 6,
    ultimaAcao: 'Encaminhado para SETI',
    ultimaAcaoData: '2026-03-18',
    prioridade: 'URGENTE',
    temPendencias: false,
    cobrancasPendentes: 0,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dr. Ricardo Andrade',
      data: '2026-03-17',
      observacoes: 'Cirrose hepática avançada. Paciente na lista de transplante hepático. Encaminhamento SETI.',
    },
  },

  /* ---- AGUARDANDO RESPOSTA EXTERNA (SAAS/Dutra) ---- */
  {
    id: 'reg-008',
    solicitacaoId: 'sol-004',
    numeroProcesso: 'TFD-2026-001201',
    pacienteNome: 'Antonio Carlos Sousa Lima',
    pacienteCpf: '22233344455',
    cidCodigo: 'M16.1',
    cidDescricao: 'Coxartrose primária unilateral',
    categoria: 'EXTERNO',
    diasNaFila: 11,
    ultimaAcao: 'Consulta enviada ao SAAS/Dutra',
    ultimaAcaoData: '2026-03-13',
    prioridade: 'NORMAL',
    temPendencias: true,
    cobrancasPendentes: 1,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dr. Paulo Mendes',
      data: '2026-03-12',
      observacoes: 'Paciente necessita de artroplastia total de quadril. Verificar disponibilidade no SAAS/Dutra.',
    },
  },
  {
    id: 'reg-009',
    solicitacaoId: 'sol-014',
    numeroProcesso: 'TFD-2026-001285',
    pacienteNome: 'Teresa Cristina Almeida',
    pacienteCpf: '66677788899',
    cidCodigo: 'G20',
    cidDescricao: 'Doença de Parkinson',
    categoria: 'EXTERNO',
    diasNaFila: 3,
    ultimaAcao: 'Consulta enviada ao SAAS/Dutra',
    ultimaAcaoData: '2026-03-21',
    prioridade: 'NORMAL',
    temPendencias: false,
    cobrancasPendentes: 0,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dra. Fernanda Moreira',
      data: '2026-03-20',
      observacoes: 'Paciente com doença de Parkinson avançada. Necessita avaliação neurocirúrgica para DBS.',
    },
  },

  /* ---- SERVIÇO SOCIAL ---- */
  {
    id: 'reg-010',
    solicitacaoId: 'sol-006',
    numeroProcesso: 'TFD-2026-001250',
    pacienteNome: 'Pedro Henrique Barbosa Mendes',
    pacienteCpf: '88899900011',
    cidCodigo: 'Q21.1',
    cidDescricao: 'Comunicação interatrial',
    categoria: 'SERVICO_SOCIAL',
    diasNaFila: 5,
    ultimaAcao: 'Encaminhado ao Serviço Social',
    ultimaAcaoData: '2026-03-19',
    prioridade: 'URGENTE',
    temPendencias: false,
    cobrancasPendentes: 0,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dr. Ricardo Andrade',
      data: '2026-03-18',
      observacoes: 'Paciente menor de idade necessita de acompanhante. Questão de acompanhante sem vínculo formal — encaminhar ao Serviço Social.',
    },
    observacoes: 'Menor de idade — acompanhante não é responsável legal',
  },
  {
    id: 'reg-011',
    solicitacaoId: 'sol-016',
    numeroProcesso: 'TFD-2026-001295',
    pacienteNome: 'Raimundo Nonato Pereira Silva',
    pacienteCpf: '44455566677',
    cidCodigo: 'F32.1',
    cidDescricao: 'Episódio depressivo moderado',
    categoria: 'SERVICO_SOCIAL',
    diasNaFila: 7,
    ultimaAcao: 'Avaliação social em andamento',
    ultimaAcaoData: '2026-03-17',
    prioridade: 'NORMAL',
    temPendencias: false,
    cobrancasPendentes: 0,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dra. Fernanda Moreira',
      data: '2026-03-16',
      observacoes: 'Paciente com transtorno depressivo moderado. Necessita acompanhante para viagem. Encaminhado ao Serviço Social para avaliação.',
    },
  },

  /* ---- PRORROGAÇÕES ---- */
  {
    id: 'reg-012',
    solicitacaoId: 'sol-005',
    numeroProcesso: 'TFD-2026-001245',
    pacienteNome: 'Raimunda Nonata Ferreira',
    pacienteCpf: '99900011122',
    cidCodigo: 'C73',
    cidDescricao: 'Neoplasia maligna da glândula tireoide',
    categoria: 'PRORROGACAO',
    diasNaFila: 2,
    ultimaAcao: 'Solicitação de prorrogação recebida',
    ultimaAcaoData: '2026-03-22',
    prioridade: 'NORMAL',
    temPendencias: false,
    cobrancasPendentes: 0,
    observacoes: 'Paciente necessita de mais 7 dias para completar tratamento radioterápico',
  },
  {
    id: 'reg-013',
    solicitacaoId: 'sol-010',
    numeroProcesso: 'TFD-2026-001265',
    pacienteNome: 'Carlos Eduardo Monteiro',
    pacienteCpf: '11100022233',
    cidCodigo: 'C18.9',
    cidDescricao: 'Neoplasia maligna do cólon',
    categoria: 'PRORROGACAO',
    diasNaFila: 1,
    ultimaAcao: 'Solicitação de prorrogação recebida',
    ultimaAcaoData: '2026-03-23',
    prioridade: 'URGENTE',
    temPendencias: false,
    cobrancasPendentes: 0,
    observacoes: 'Necessita prorrogação de 5 dias — nova sessão de quimioterapia agendada',
  },
  {
    id: 'reg-014',
    solicitacaoId: 'sol-007',
    numeroProcesso: 'TFD-2026-001178',
    pacienteNome: 'Ana Lucia Rodrigues Carvalho',
    pacienteCpf: '22211133344',
    cidCodigo: 'C50.4',
    cidDescricao: 'Neoplasia maligna do quadrante superior externo da mama',
    categoria: 'PRORROGACAO',
    diasNaFila: 9,
    ultimaAcao: 'Aguardando aprovação da prorrogação',
    ultimaAcaoData: '2026-03-15',
    prioridade: 'NORMAL',
    temPendencias: false,
    cobrancasPendentes: 0,
    observacoes: 'Segunda prorrogação — paciente aguardando resultado de biópsia',
  },
  {
    id: 'reg-015',
    solicitacaoId: 'sol-017',
    numeroProcesso: 'TFD-2026-001300',
    pacienteNome: 'José Maria Santos Oliveira',
    pacienteCpf: '55544433322',
    cidCodigo: 'C61',
    cidDescricao: 'Neoplasia maligna da próstata',
    categoria: 'PRONTOS',
    diasNaFila: 3,
    ultimaAcao: 'Parecer médico deferido',
    ultimaAcaoData: '2026-03-21',
    prioridade: 'NORMAL',
    temPendencias: false,
    cobrancasPendentes: 0,
    parecerMedico: {
      status: 'DEFERIDO',
      medico: 'Dr. Paulo Mendes',
      data: '2026-03-21',
      observacoes: 'Paciente com neoplasia de próstata. Indicação de prostatectomia radical em centro especializado.',
    },
  },
];
