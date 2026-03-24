import { SolicitacaoTFD } from '../models/solicitacao.model';
import { MOCK_PACIENTES } from './pacientes.mock';

export const MOCK_SOLICITACOES: SolicitacaoTFD[] = [
  // ─── 1. NOVO ────────────────────────────────────────────
  {
    id: 'sol-001',
    numero: 'TFD-2026-000112',
    status: 'NOVO',
    paciente: MOCK_PACIENTES[0], // Maria das Gracas - Sao Luis
    diagnostico: {
      cid: 'C50.9',
      descricao: 'Neoplasia maligna da mama, nao especificada',
      especialidade: 'Oncologia',
      justificativa:
        'Paciente diagnosticada com carcinoma ductal invasivo grau III, necessitando de tratamento quimioterapico nao disponivel na rede estadual do Maranhao.',
      procedimentoSolicitado: 'Quimioterapia neoadjuvante com Trastuzumabe',
    },
    documentos: [
      {
        id: 'doc-001',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Oncologico_Maria_Santos.pdf',
        url: '/uploads/doc-001.pdf',
        dataUpload: '2026-03-15',
      },
      {
        id: 'doc-002',
        tipo: 'EXAME',
        nome: 'Biopsia_Mama_Resultado.pdf',
        url: '/uploads/doc-002.pdf',
        dataUpload: '2026-03-15',
      },
      {
        id: 'doc-003',
        tipo: 'CARTAO_SUS',
        nome: 'CNS_Maria_Santos.pdf',
        url: '/uploads/doc-003.pdf',
        dataUpload: '2026-03-15',
      },
    ],
    viagens: [],
    dataCriacao: '2026-03-15',
    dataAtualizacao: '2026-03-15',
    criadoPor: 'usr-001',
  },

  // ─── 2. EM_ANALISE ─────────────────────────────────────
  {
    id: 'sol-002',
    numero: 'TFD-2026-000098',
    status: 'EM_ANALISE',
    paciente: MOCK_PACIENTES[1], // Jose Ribamar - Imperatriz
    diagnostico: {
      cid: 'I25.1',
      descricao: 'Doenca aterosclerotica do coracao',
      especialidade: 'Cardiologia',
      justificativa:
        'Paciente com estenose coronariana severa em tres vasos, indicacao de cirurgia de revascularizacao miocardica. Procedimento de alta complexidade nao realizado em Imperatriz.',
      procedimentoSolicitado:
        'Cirurgia de revascularizacao do miocardio com CEC',
    },
    documentos: [
      {
        id: 'doc-004',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Cardio_Jose_Costa.pdf',
        url: '/uploads/doc-004.pdf',
        dataUpload: '2026-03-10',
      },
      {
        id: 'doc-005',
        tipo: 'EXAME',
        nome: 'Cateterismo_Cardiaco.pdf',
        url: '/uploads/doc-005.pdf',
        dataUpload: '2026-03-10',
      },
      {
        id: 'doc-006',
        tipo: 'DOCUMENTO_PESSOAL',
        nome: 'RG_CPF_Jose_Costa.pdf',
        url: '/uploads/doc-006.pdf',
        dataUpload: '2026-03-10',
      },
      {
        id: 'doc-007',
        tipo: 'COMPROVANTE_RESIDENCIA',
        nome: 'Comprovante_Residencia_Imperatriz.pdf',
        url: '/uploads/doc-007.pdf',
        dataUpload: '2026-03-10',
      },
    ],
    viagens: [],
    dataCriacao: '2026-03-10',
    dataAtualizacao: '2026-03-12',
    criadoPor: 'usr-001',
  },

  // ─── 3. EXIGENCIA ──────────────────────────────────────
  {
    id: 'sol-003',
    numero: 'TFD-2026-000085',
    status: 'EXIGENCIA',
    paciente: MOCK_PACIENTES[2], // Francisca - Caxias
    diagnostico: {
      cid: 'H33.0',
      descricao: 'Descolamento da retina com ruptura',
      especialidade: 'Oftalmologia',
      justificativa:
        'Descolamento de retina olho direito com perda progressiva de visao. Necessita cirurgia vitreorretiniana de urgencia.',
      procedimentoSolicitado: 'Vitrectomia posterior via pars plana',
    },
    documentos: [
      {
        id: 'doc-008',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Oftalmo_Francisca.pdf',
        url: '/uploads/doc-008.pdf',
        dataUpload: '2026-03-05',
      },
      {
        id: 'doc-009',
        tipo: 'EXAME',
        nome: 'OCT_Retina.pdf',
        url: '/uploads/doc-009.pdf',
        dataUpload: '2026-03-05',
      },
    ],
    parecer: {
      id: 'par-001',
      solicitacaoId: 'sol-003',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'EXIGENCIA',
      observacoes:
        'Necessario apresentar mapeamento de retina atualizado (menos de 30 dias) e laudo do oftalmo assistente com justificativa da impossibilidade de realizar o procedimento no Maranhao.',
      dataParecer: '2026-03-08',
    },
    viagens: [],
    dataCriacao: '2026-03-05',
    dataAtualizacao: '2026-03-08',
    criadoPor: 'usr-001',
    observacoes:
      'Paciente notificada por telefone sobre a exigencia em 08/03/2026.',
  },

  // ─── 4. AGUARDANDO_REGULACAO ───────────────────────────
  {
    id: 'sol-004',
    numero: 'TFD-2026-000071',
    status: 'AGUARDANDO_REGULACAO',
    paciente: MOCK_PACIENTES[3], // Antonio Carlos - Timon
    acompanhante: {
      id: 'acomp-001',
      nome: 'Maria de Fatima Sousa Lima',
      cpf: '321.654.987-00',
      parentesco: 'Esposa',
      telefone: '(99) 98567-8902',
      justificativa:
        'Paciente idoso (73 anos) com dificuldade de locomocao, necessita de acompanhante para deslocamento interestadual.',
    },
    diagnostico: {
      cid: 'M16.1',
      descricao: 'Coxartrose primaria, unilateral',
      especialidade: 'Ortopedia',
      justificativa:
        'Coxartrose avancada em quadril direito com limitacao funcional severa. Indicada artroplastia total de quadril. Fila de espera no Maranhao superior a 12 meses.',
      procedimentoSolicitado: 'Artroplastia total do quadril',
    },
    documentos: [
      {
        id: 'doc-010',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Ortopedico_Antonio.pdf',
        url: '/uploads/doc-010.pdf',
        dataUpload: '2026-02-20',
      },
      {
        id: 'doc-011',
        tipo: 'EXAME',
        nome: 'RX_Quadril_Bilateral.pdf',
        url: '/uploads/doc-011.pdf',
        dataUpload: '2026-02-20',
      },
      {
        id: 'doc-012',
        tipo: 'ENCAMINHAMENTO',
        nome: 'Encaminhamento_UBS_Timon.pdf',
        url: '/uploads/doc-012.pdf',
        dataUpload: '2026-02-20',
      },
    ],
    parecer: {
      id: 'par-002',
      solicitacaoId: 'sol-004',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'DEFERIDO',
      observacoes:
        'Parecer favoravel. Procedimento de alta complexidade com fila de espera extensa na rede estadual. Encaminhar para regulacao via CNRAC.',
      dataParecer: '2026-02-25',
    },
    regulacao: {
      id: 'reg-001',
      solicitacaoId: 'sol-004',
      tipoRota: 'CNRAC',
      responsavel: 'Patricia Helena Gomes',
      dataEncaminhamento: '2026-02-26',
      observacoes: 'Aguardando vaga no Hospital Sarah Kubitschek - Brasilia.',
      cobrancasExternas: [
        {
          id: 'cob-001',
          destinatario: 'CNRAC - Ministerio da Saude',
          dataEnvio: '2026-02-26',
          respondido: false,
          observacoes: 'Solicitacao de vaga encaminhada via sistema CNRAC.',
        },
      ],
    },
    viagens: [],
    dataCriacao: '2026-02-20',
    dataAtualizacao: '2026-03-01',
    criadoPor: 'usr-001',
  },

  // ─── 5. AGUARDANDO_AGENDAMENTO ─────────────────────────
  {
    id: 'sol-005',
    numero: 'TFD-2026-000063',
    status: 'AGUARDANDO_AGENDAMENTO',
    paciente: MOCK_PACIENTES[4], // Raimunda - Codo
    diagnostico: {
      cid: 'E11.4',
      descricao:
        'Diabetes mellitus tipo 2 com complicacoes neurologicas',
      especialidade: 'Endocrinologia',
      justificativa:
        'Neuropatia diabetica severa com ulcera em pe direito nao cicatrizante. Necessita avaliacao especializada em centro de referencia para pe diabetico.',
      procedimentoSolicitado:
        'Avaliacao multidisciplinar em centro de referencia para pe diabetico',
    },
    documentos: [
      {
        id: 'doc-013',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Endocrino_Raimunda.pdf',
        url: '/uploads/doc-013.pdf',
        dataUpload: '2026-02-10',
      },
      {
        id: 'doc-014',
        tipo: 'EXAME',
        nome: 'Eletroneuromiografia.pdf',
        url: '/uploads/doc-014.pdf',
        dataUpload: '2026-02-10',
      },
    ],
    parecer: {
      id: 'par-003',
      solicitacaoId: 'sol-005',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'DEFERIDO',
      observacoes:
        'Deferido. Encaminhar para Hospital das Clinicas da FMUSP, referencia em pe diabetico.',
      dataParecer: '2026-02-15',
    },
    regulacao: {
      id: 'reg-002',
      solicitacaoId: 'sol-005',
      tipoRota: 'SETI',
      responsavel: 'Patricia Helena Gomes',
      dataEncaminhamento: '2026-02-16',
      dataResposta: '2026-02-22',
      observacoes: 'Vaga autorizada pelo SETI. Aguardando data do hospital.',
      cobrancasExternas: [
        {
          id: 'cob-002',
          destinatario: 'SETI - Sao Paulo',
          dataEnvio: '2026-02-16',
          dataResposta: '2026-02-22',
          respondido: true,
          observacoes: 'Vaga confirmada. Hospital informara data da consulta.',
        },
      ],
    },
    viagens: [],
    dataCriacao: '2026-02-10',
    dataAtualizacao: '2026-02-22',
    criadoPor: 'usr-001',
  },

  // ─── 6. AGUARDANDO_EMISSAO ─────────────────────────────
  {
    id: 'sol-006',
    numero: 'TFD-2026-000054',
    status: 'AGUARDANDO_EMISSAO',
    paciente: MOCK_PACIENTES[5], // Pedro Henrique - Acailandia (menor)
    acompanhante: {
      id: 'acomp-002',
      nome: 'Claudia Barbosa Mendes',
      cpf: '654.321.098-76',
      parentesco: 'Mae',
      telefone: '(99) 98689-0124',
      justificativa: 'Paciente menor de idade (17 anos).',
    },
    diagnostico: {
      cid: 'Q21.1',
      descricao: 'Comunicacao interatrial (CIA)',
      especialidade: 'Cardiologia Pediatrica',
      justificativa:
        'CIA tipo ostium secundum com repercussao hemodinamica significativa (Qp/Qs 2.5:1). Indicado fechamento percutaneo com dispositivo Amplatzer.',
      procedimentoSolicitado:
        'Fechamento percutaneo de comunicacao interatrial',
    },
    documentos: [
      {
        id: 'doc-015',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Cardio_Pediatrico_Pedro.pdf',
        url: '/uploads/doc-015.pdf',
        dataUpload: '2026-01-28',
      },
      {
        id: 'doc-016',
        tipo: 'EXAME',
        nome: 'Ecocardiograma_Transtoracico.pdf',
        url: '/uploads/doc-016.pdf',
        dataUpload: '2026-01-28',
      },
      {
        id: 'doc-017',
        tipo: 'DOCUMENTO_PESSOAL',
        nome: 'Certidao_Nascimento_Pedro.pdf',
        url: '/uploads/doc-017.pdf',
        dataUpload: '2026-01-28',
      },
    ],
    parecer: {
      id: 'par-004',
      solicitacaoId: 'sol-006',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'DEFERIDO',
      observacoes:
        'Deferido com urgencia. Procedimento de alta complexidade nao disponivel no estado.',
      dataParecer: '2026-02-02',
    },
    regulacao: {
      id: 'reg-003',
      solicitacaoId: 'sol-006',
      tipoRota: 'SAAS_DUTRA',
      responsavel: 'Patricia Helena Gomes',
      dataEncaminhamento: '2026-02-03',
      dataResposta: '2026-02-10',
      observacoes:
        'Vaga confirmada no InCor - SP via SAAS Dutra para 20/03/2026.',
      cobrancasExternas: [],
    },
    agendamento: {
      id: 'agd-001',
      solicitacaoId: 'sol-006',
      unidadeDestino:
        'InCor - Instituto do Coracao do HCFMUSP - Sao Paulo/SP',
      medicoDestino: 'Dr. Carlos Eduardo Rochitte',
      dataAgendamento: '2026-03-20',
      horaAgendamento: '07:00',
      confirmado: true,
      observacoes:
        'Internacao prevista para o dia anterior (19/03). Jejum de 8h.',
    },
    viagens: [],
    dataCriacao: '2026-01-28',
    dataAtualizacao: '2026-03-10',
    criadoPor: 'usr-001',
  },

  // ─── 7. EMITIDA ────────────────────────────────────────
  {
    id: 'sol-007',
    numero: 'TFD-2026-000045',
    status: 'EMITIDA',
    paciente: MOCK_PACIENTES[6], // Ana Lucia - Bacabal
    diagnostico: {
      cid: 'C73',
      descricao: 'Neoplasia maligna da glandula tireoide',
      especialidade: 'Cirurgia de Cabeca e Pescoco',
      justificativa:
        'Carcinoma papilifero da tireoide com extensao extratiroidiana. Indicada tireoidectomia total com esvaziamento cervical.',
      procedimentoSolicitado:
        'Tireoidectomia total com esvaziamento cervical bilateral',
    },
    documentos: [
      {
        id: 'doc-018',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_CCP_Ana_Lucia.pdf',
        url: '/uploads/doc-018.pdf',
        dataUpload: '2026-01-20',
      },
      {
        id: 'doc-019',
        tipo: 'EXAME',
        nome: 'PAAF_Tireoide_Bethesda_VI.pdf',
        url: '/uploads/doc-019.pdf',
        dataUpload: '2026-01-20',
      },
      {
        id: 'doc-020',
        tipo: 'EXAME',
        nome: 'USG_Cervical.pdf',
        url: '/uploads/doc-020.pdf',
        dataUpload: '2026-01-20',
      },
    ],
    parecer: {
      id: 'par-005',
      solicitacaoId: 'sol-007',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'DEFERIDO',
      observacoes: 'Deferido. Caso oncologico com indicacao cirurgica clara.',
      dataParecer: '2026-01-25',
    },
    regulacao: {
      id: 'reg-004',
      solicitacaoId: 'sol-007',
      tipoRota: 'APROVADO_DIRETO',
      responsavel: 'Patricia Helena Gomes',
      dataEncaminhamento: '2026-01-26',
      dataResposta: '2026-01-26',
      observacoes:
        'Aprovacao direta por ser caso oncologico com classificacao de risco alta.',
      cobrancasExternas: [],
    },
    agendamento: {
      id: 'agd-002',
      solicitacaoId: 'sol-007',
      unidadeDestino:
        'Hospital A.C. Camargo Cancer Center - Sao Paulo/SP',
      medicoDestino: 'Dr. Luiz Paulo Kowalski',
      dataAgendamento: '2026-03-25',
      horaAgendamento: '06:30',
      confirmado: true,
      comprovanteUrl: '/uploads/comprovante-agd-002.pdf',
      observacoes: 'Internacao dia 24/03. Pre-operatorio completo exigido.',
    },
    viagens: [
      {
        id: 'viag-001',
        solicitacaoId: 'sol-007',
        tipo: 'IDA',
        situacao: 'EMITIDA',
        origem: 'Sao Luis/MA (SLZ)',
        destino: 'Sao Paulo/SP (GRU)',
        dataEmbarquePrevista: '2026-03-23',
        companhiaTransporte: 'LATAM',
        localizador: 'XKRT7M',
        valorPassagem: 892.5,
      },
      {
        id: 'viag-002',
        solicitacaoId: 'sol-007',
        tipo: 'VOLTA',
        situacao: 'EMITIDA',
        origem: 'Sao Paulo/SP (GRU)',
        destino: 'Sao Luis/MA (SLZ)',
        dataEmbarquePrevista: '2026-04-02',
        companhiaTransporte: 'LATAM',
        localizador: 'XKRT7M',
        valorPassagem: 892.5,
      },
    ],
    ajudaDeCusto: {
      id: 'ac-001',
      solicitacaoId: 'sol-007',
      status: 'APROVADO',
      dataInicio: '2026-03-23',
      dataFim: '2026-04-02',
      diasCompletos: 9,
      diaRetorno: true,
      valorDiariaCompleta: 24.75,
      valorDiariaRetorno: 8.4,
      valorTotal: 231.15, // (9 * 24.75) + 8.40
      comprovantes: [],
      observacoes: 'Valor calculado para paciente. Acompanhante nao autorizado.',
    },
    dataCriacao: '2026-01-20',
    dataAtualizacao: '2026-03-18',
    criadoPor: 'usr-001',
  },

  // ─── 8. EM_VIAGEM ──────────────────────────────────────
  {
    id: 'sol-008',
    numero: 'TFD-2026-000038',
    status: 'EM_VIAGEM',
    paciente: MOCK_PACIENTES[7], // Francisco - Balsas
    acompanhante: {
      id: 'acomp-003',
      nome: 'Josefa Maria Ribeiro',
      cpf: '987.654.321-00',
      parentesco: 'Filha',
      telefone: '(99) 99301-2346',
      justificativa:
        'Paciente idoso (65 anos) com dificuldade cognitiva leve, necessita acompanhante.',
    },
    diagnostico: {
      cid: 'N18.5',
      descricao: 'Doenca renal cronica, estagio 5',
      especialidade: 'Nefrologia',
      justificativa:
        'DRC estagio 5 em hemodialise ha 3 anos. Paciente em lista de transplante renal com doador vivo compativel (filha). Hospital de referencia em Sao Paulo.',
      procedimentoSolicitado: 'Transplante renal com doador vivo',
    },
    documentos: [
      {
        id: 'doc-021',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Nefro_Francisco.pdf',
        url: '/uploads/doc-021.pdf',
        dataUpload: '2026-01-10',
      },
      {
        id: 'doc-022',
        tipo: 'EXAME',
        nome: 'Crossmatch_Compatibilidade.pdf',
        url: '/uploads/doc-022.pdf',
        dataUpload: '2026-01-10',
      },
      {
        id: 'doc-023',
        tipo: 'ENCAMINHAMENTO',
        nome: 'Inscricao_Lista_Transplante.pdf',
        url: '/uploads/doc-023.pdf',
        dataUpload: '2026-01-10',
      },
    ],
    parecer: {
      id: 'par-006',
      solicitacaoId: 'sol-008',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'DEFERIDO',
      observacoes:
        'Deferido com prioridade maxima. Transplante renal com doador vivo.',
      dataParecer: '2026-01-15',
    },
    regulacao: {
      id: 'reg-005',
      solicitacaoId: 'sol-008',
      tipoRota: 'CNRAC',
      responsavel: 'Patricia Helena Gomes',
      dataEncaminhamento: '2026-01-16',
      dataResposta: '2026-02-20',
      observacoes:
        'Vaga autorizada pelo CNRAC no Hospital do Rim - UNIFESP.',
      cobrancasExternas: [
        {
          id: 'cob-003',
          destinatario: 'CNRAC - Ministerio da Saude',
          dataEnvio: '2026-01-16',
          dataResposta: '2026-02-20',
          respondido: true,
          observacoes: 'Vaga autorizada. Numero CNRAC: 2026-MA-00487.',
        },
      ],
    },
    agendamento: {
      id: 'agd-003',
      solicitacaoId: 'sol-008',
      unidadeDestino: 'Hospital do Rim - UNIFESP - Sao Paulo/SP',
      medicoDestino: 'Dr. Jose Osmar Medina Pestana',
      dataAgendamento: '2026-03-22',
      horaAgendamento: '06:00',
      confirmado: true,
      comprovanteUrl: '/uploads/comprovante-agd-003.pdf',
      observacoes:
        'Internacao 2 dias antes para preparacao. Doadora (filha) tambem sera internada.',
    },
    viagens: [
      {
        id: 'viag-003',
        solicitacaoId: 'sol-008',
        tipo: 'IDA',
        situacao: 'UTILIZADA',
        origem: 'Sao Luis/MA (SLZ)',
        destino: 'Sao Paulo/SP (GRU)',
        dataEmbarquePrevista: '2026-03-19',
        dataEmbarqueReal: '2026-03-19',
        companhiaTransporte: 'GOL',
        localizador: 'HJK92P',
        valorPassagem: 1245.0,
        observacoes: 'Duas passagens (paciente + acompanhante).',
      },
      {
        id: 'viag-004',
        solicitacaoId: 'sol-008',
        tipo: 'VOLTA',
        situacao: 'AGUARDANDO_EMISSAO',
        origem: 'Sao Paulo/SP (GRU)',
        destino: 'Sao Luis/MA (SLZ)',
        dataEmbarquePrevista: '2026-04-20',
        observacoes: 'Data de retorno estimada. Sera confirmada apos alta medica.',
      },
    ],
    ajudaDeCusto: {
      id: 'ac-002',
      solicitacaoId: 'sol-008',
      status: 'APROVADO',
      dataInicio: '2026-03-19',
      dataFim: '2026-04-20',
      diasCompletos: 31,
      diaRetorno: true,
      valorDiariaCompleta: 24.75,
      valorDiariaRetorno: 8.4,
      valorTotal: 775.65, // (31 * 24.75) + 8.40
      comprovantes: [],
      observacoes: 'Valor para paciente + acompanhante. Diaria dupla autorizada.',
    },
    permanencia: {
      id: 'perm-001',
      solicitacaoId: 'sol-008',
      dataInicio: '2026-03-19',
      dataFimPrevista: '2026-04-20',
      prorrogacoes: [],
      observacoes:
        'Paciente internado no Hospital do Rim desde 20/03. Cirurgia prevista para 22/03.',
    },
    dataCriacao: '2026-01-10',
    dataAtualizacao: '2026-03-19',
    criadoPor: 'usr-001',
  },

  // ─── 9. EM_PERMANENCIA ─────────────────────────────────
  {
    id: 'sol-009',
    numero: 'TFD-2026-000025',
    status: 'EM_PERMANENCIA',
    paciente: MOCK_PACIENTES[0], // Maria das Gracas (segunda solicitacao)
    diagnostico: {
      cid: 'G35',
      descricao: 'Esclerose multipla',
      especialidade: 'Neurologia',
      justificativa:
        'Esclerose multipla remitente-recorrente com falha terapeutica ao interferon beta. Necessita avaliacao para inicio de Natalizumabe em centro de referencia.',
      procedimentoSolicitado:
        'Avaliacao neurologica e infusao de Natalizumabe',
    },
    documentos: [
      {
        id: 'doc-024',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Neuro_Maria_EM.pdf',
        url: '/uploads/doc-024.pdf',
        dataUpload: '2026-01-05',
      },
      {
        id: 'doc-025',
        tipo: 'EXAME',
        nome: 'RNM_Encefalo_Medula.pdf',
        url: '/uploads/doc-025.pdf',
        dataUpload: '2026-01-05',
      },
    ],
    parecer: {
      id: 'par-007',
      solicitacaoId: 'sol-009',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'DEFERIDO',
      observacoes:
        'Deferido. Paciente com falha a primeira linha de tratamento.',
      dataParecer: '2026-01-10',
    },
    regulacao: {
      id: 'reg-006',
      solicitacaoId: 'sol-009',
      tipoRota: 'SETI',
      responsavel: 'Patricia Helena Gomes',
      dataEncaminhamento: '2026-01-11',
      dataResposta: '2026-01-20',
      observacoes: 'Vaga confirmada via SETI no HC-FMUSP - Neurologia.',
      cobrancasExternas: [],
    },
    agendamento: {
      id: 'agd-004',
      solicitacaoId: 'sol-009',
      unidadeDestino:
        'Hospital das Clinicas da FMUSP - Ambulatorio de Neuroimunologia - Sao Paulo/SP',
      dataAgendamento: '2026-03-05',
      horaAgendamento: '08:00',
      confirmado: true,
      comprovanteUrl: '/uploads/comprovante-agd-004.pdf',
    },
    viagens: [
      {
        id: 'viag-005',
        solicitacaoId: 'sol-009',
        tipo: 'IDA',
        situacao: 'UTILIZADA',
        origem: 'Sao Luis/MA (SLZ)',
        destino: 'Sao Paulo/SP (GRU)',
        dataEmbarquePrevista: '2026-03-04',
        dataEmbarqueReal: '2026-03-04',
        companhiaTransporte: 'LATAM',
        localizador: 'PQR45N',
        valorPassagem: 780.0,
      },
      {
        id: 'viag-006',
        solicitacaoId: 'sol-009',
        tipo: 'VOLTA',
        situacao: 'EMITIDA',
        origem: 'Sao Paulo/SP (GRU)',
        destino: 'Sao Luis/MA (SLZ)',
        dataEmbarquePrevista: '2026-03-28',
        companhiaTransporte: 'GOL',
        localizador: 'MNB78W',
        valorPassagem: 815.0,
      },
    ],
    ajudaDeCusto: {
      id: 'ac-003',
      solicitacaoId: 'sol-009',
      status: 'PAGO',
      dataInicio: '2026-03-04',
      dataFim: '2026-03-28',
      diasCompletos: 23,
      diaRetorno: true,
      valorDiariaCompleta: 24.75,
      valorDiariaRetorno: 8.4,
      valorTotal: 577.65, // (23 * 24.75) + 8.40
      comprovantes: [],
    },
    permanencia: {
      id: 'perm-002',
      solicitacaoId: 'sol-009',
      dataInicio: '2026-03-04',
      dataFimPrevista: '2026-03-20',
      prorrogacoes: [
        {
          id: 'pror-001',
          dataInicio: '2026-03-20',
          dataFim: '2026-03-28',
          justificativa:
            'Paciente necessita realizar segunda infusao de Natalizumabe e exames de controle pos-infusao.',
          aprovadoPor: 'Dr. Fernando Henrique Borges',
          dataAprovacao: '2026-03-18',
        },
      ],
      observacoes:
        'Paciente hospedada na Casa de Apoio ao Paciente do TFD em Sao Paulo. Segunda infusao em 25/03.',
    },
    dataCriacao: '2026-01-05',
    dataAtualizacao: '2026-03-18',
    criadoPor: 'usr-001',
  },

  // ─── 10. CONCLUIDO ─────────────────────────────────────
  {
    id: 'sol-010',
    numero: 'TFD-2026-000012',
    status: 'CONCLUIDO',
    paciente: MOCK_PACIENTES[3], // Antonio Carlos - Timon (segunda solicitacao)
    diagnostico: {
      cid: 'H25.1',
      descricao: 'Catarata senil nuclear',
      especialidade: 'Oftalmologia',
      justificativa:
        'Catarata nuclear bilateral avancada com acuidade visual 20/200 em ambos os olhos. Fila de espera para facectomia no Maranhao superior a 18 meses.',
      procedimentoSolicitado:
        'Facoemulsificacao com implante de lente intraocular bilateral',
    },
    documentos: [
      {
        id: 'doc-026',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Oftalmo_Antonio_Catarata.pdf',
        url: '/uploads/doc-026.pdf',
        dataUpload: '2025-11-15',
      },
      {
        id: 'doc-027',
        tipo: 'EXAME',
        nome: 'Biometria_Ocular.pdf',
        url: '/uploads/doc-027.pdf',
        dataUpload: '2025-11-15',
      },
    ],
    parecer: {
      id: 'par-008',
      solicitacaoId: 'sol-010',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'DEFERIDO',
      observacoes: 'Deferido. Paciente com baixa visao severa bilateral.',
      dataParecer: '2025-11-20',
    },
    regulacao: {
      id: 'reg-007',
      solicitacaoId: 'sol-010',
      tipoRota: 'SERVICO_SOCIAL',
      responsavel: 'Tereza Cristina Araujo',
      dataEncaminhamento: '2025-11-21',
      dataResposta: '2025-12-05',
      observacoes:
        'Encaminhado via Servico Social para mutirao de catarata em Teresina/PI.',
      cobrancasExternas: [],
    },
    agendamento: {
      id: 'agd-005',
      solicitacaoId: 'sol-010',
      unidadeDestino:
        'Hospital Getulio Vargas - Teresina/PI',
      dataAgendamento: '2026-01-15',
      horaAgendamento: '07:00',
      confirmado: true,
      comprovanteUrl: '/uploads/comprovante-agd-005.pdf',
      observacoes: 'Mutirao de catarata. Ambos os olhos no mesmo dia.',
    },
    viagens: [
      {
        id: 'viag-007',
        solicitacaoId: 'sol-010',
        tipo: 'IDA',
        situacao: 'UTILIZADA',
        origem: 'Timon/MA',
        destino: 'Teresina/PI',
        dataEmbarquePrevista: '2026-01-14',
        dataEmbarqueReal: '2026-01-14',
        companhiaTransporte: 'Transporte Terrestre SES',
        valorPassagem: 0,
        observacoes: 'Transporte terrestre. Timon-Teresina via ponte.',
      },
      {
        id: 'viag-008',
        solicitacaoId: 'sol-010',
        tipo: 'VOLTA',
        situacao: 'UTILIZADA',
        origem: 'Teresina/PI',
        destino: 'Timon/MA',
        dataEmbarquePrevista: '2026-01-16',
        dataEmbarqueReal: '2026-01-16',
        companhiaTransporte: 'Transporte Terrestre SES',
        valorPassagem: 0,
      },
    ],
    ajudaDeCusto: {
      id: 'ac-004',
      solicitacaoId: 'sol-010',
      status: 'PAGO',
      dataInicio: '2026-01-14',
      dataFim: '2026-01-16',
      diasCompletos: 1,
      diaRetorno: true,
      valorDiariaCompleta: 24.75,
      valorDiariaRetorno: 8.4,
      valorTotal: 33.15,
      comprovantes: [
        {
          id: 'doc-028',
          tipo: 'OUTROS',
          nome: 'Comprovante_Pagamento_Diaria.pdf',
          url: '/uploads/doc-028.pdf',
          dataUpload: '2026-01-20',
        },
      ],
    },
    permanencia: {
      id: 'perm-003',
      solicitacaoId: 'sol-010',
      dataInicio: '2026-01-14',
      dataFimPrevista: '2026-01-16',
      dataFimReal: '2026-01-16',
      prorrogacoes: [],
      motivoAlta: 'ALTA_MEDICA',
      observacoes: 'Procedimento realizado com sucesso em ambos os olhos. Alta no dia seguinte.',
    },
    dataCriacao: '2025-11-15',
    dataAtualizacao: '2026-01-20',
    criadoPor: 'usr-001',
  },

  // ─── 11. INDEFERIDO ────────────────────────────────────
  {
    id: 'sol-011',
    numero: 'TFD-2026-000089',
    status: 'INDEFERIDO',
    paciente: MOCK_PACIENTES[4], // Raimunda - Codo (segunda solicitacao)
    diagnostico: {
      cid: 'M54.5',
      descricao: 'Dor lombar baixa',
      especialidade: 'Ortopedia',
      justificativa:
        'Lombalgia cronica refrataria a tratamento conservador. Solicita avaliacao em centro de referencia em coluna.',
      procedimentoSolicitado:
        'Avaliacao com especialista em cirurgia de coluna',
    },
    documentos: [
      {
        id: 'doc-029',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Ortopedico_Raimunda_Coluna.pdf',
        url: '/uploads/doc-029.pdf',
        dataUpload: '2026-03-01',
      },
      {
        id: 'doc-030',
        tipo: 'EXAME',
        nome: 'RNM_Coluna_Lombar.pdf',
        url: '/uploads/doc-030.pdf',
        dataUpload: '2026-03-01',
      },
    ],
    parecer: {
      id: 'par-009',
      solicitacaoId: 'sol-011',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'INDEFERIDO',
      observacoes:
        'Indeferido. A ressonancia magnetica mostra apenas protrusao discal leve em L4-L5 sem compressao radicular. O procedimento solicitado (avaliacao com especialista em coluna) pode ser realizado no Hospital Universitario da UFMA, que dispoe de servico de ortopedia com subespecialidade em coluna. Recomenda-se encaminhamento via regulacao estadual.',
      dataParecer: '2026-03-05',
    },
    viagens: [],
    dataCriacao: '2026-03-01',
    dataAtualizacao: '2026-03-05',
    criadoPor: 'usr-001',
    observacoes:
      'Paciente informada do indeferimento e orientada a buscar atendimento no HU-UFMA.',
  },

  // ─── 12. CANCELADO ─────────────────────────────────────
  {
    id: 'sol-012',
    numero: 'TFD-2026-000077',
    status: 'CANCELADO',
    paciente: MOCK_PACIENTES[6], // Ana Lucia - Bacabal (segunda solicitacao)
    diagnostico: {
      cid: 'K80.2',
      descricao:
        'Calculo da vesicula biliar sem colecistite',
      especialidade: 'Cirurgia Geral',
      justificativa:
        'Colelitiase sintomatica com colicas biliares recorrentes. Solicita colecistectomia videolaparoscopica.',
      procedimentoSolicitado: 'Colecistectomia videolaparoscopica',
    },
    documentos: [
      {
        id: 'doc-031',
        tipo: 'LAUDO_MEDICO',
        nome: 'Laudo_Cirurgia_Ana_Lucia_Vesicula.pdf',
        url: '/uploads/doc-031.pdf',
        dataUpload: '2026-02-15',
      },
      {
        id: 'doc-032',
        tipo: 'EXAME',
        nome: 'USG_Abdomen_Total.pdf',
        url: '/uploads/doc-032.pdf',
        dataUpload: '2026-02-15',
      },
    ],
    parecer: {
      id: 'par-010',
      solicitacaoId: 'sol-012',
      medicoId: 'usr-003',
      medicoNome: 'Dr. Marcos Aurelio Fonseca',
      status: 'DEFERIDO',
      observacoes:
        'Deferido, porem procedimento disponivel na rede estadual com fila curta. Verificar possibilidade de realizacao no Socorrao II - Sao Luis.',
      dataParecer: '2026-02-20',
    },
    viagens: [],
    dataCriacao: '2026-02-15',
    dataAtualizacao: '2026-03-01',
    criadoPor: 'usr-001',
    observacoes:
      'Cancelado a pedido da paciente. Conseguiu agendamento para colecistectomia no Hospital Municipal de Bacabal para abril/2026.',
  },
];
