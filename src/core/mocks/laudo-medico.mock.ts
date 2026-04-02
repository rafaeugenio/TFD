import type { LaudoMedico } from '../models/laudo-medico.model';

/* ============================================================
   Mock data — Laudo Médico Digital (C1)
   3 entries representing the 3 possible states
   ============================================================ */

export const MOCK_LAUDOS_MEDICOS: LaudoMedico[] = [
  /* ─── 1. CONCLUIDO ────────────────────────────────────── */
  {
    id: 'laudo-001',
    solicitacaoId: 'sol-001',
    status: 'CONCLUIDO',
    cabecalho: {
      unidadeSaudeSolicitante: 'UPA Socorrão II — São Luís',
      numeroProntuario: 'TFD-PAC-0001',
      nomePaciente: 'Maria das Graças Santos',
      idadePaciente: 58,
      medicoSolicitanteNome: 'Dr. Roberto Mendes',
      medicoSolicitanteCPF: '123.456.789-00',
      medicoSolicitanteTelefone: '(98) 99812-3456',
      procedimentoSolicitado: 'Quimioterapia neoadjuvante com Trastuzumabe',
      codigoProcedimentoSUS: '0304010040',
      diagnosticoInicial: 'Neoplasia maligna da mama, não especificada',
      cid10: 'C50.9',
      caracterAtendimento: 'AMBULATORIAL',
    },
    secoes: {
      historicoDoenca:
        'Paciente relata surgimento de nódulo mamário há 6 meses, com crescimento progressivo. Realizou mamografia e ultrassonografia que evidenciaram lesão suspeita. Biópsia confirmou carcinoma ductal invasivo grau III.',
      exameFisico:
        'Nódulo palpável em mama esquerda, QSE, aproximadamente 3cm, de consistência endurecida, aderido a planos profundos. Linfonodos axilares palpáveis.',
      diagnosticoProvavel:
        'Carcinoma ductal invasivo de mama esquerda, grau III, HER2 positivo, estadiamento clínico IIB.',
      sinaisSintomasGerais:
        'Dor localizada em mama esquerda, fadiga moderada, perda ponderal de 3kg nos últimos 2 meses.',
      condicoesHemodinamicas:
        'PA 130/80 mmHg, FC 78 bpm, perfusão periférica adequada.',
      necessidadeMensuracaoPA: false,
      padraoRespiratorio:
        'Eupneica, FR 16 irpm, SpO2 97% em ar ambiente, sem uso de musculatura acessória.',
      funcaoRenalHepatica:
        'Creatinina 0.8 mg/dL, ureia 28 mg/dL, TGO 22 U/L, TGP 18 U/L, bilirrubinas normais.',
      estadoNeurologicoSumario:
        'Glasgow 15, pupilas isocóricas e fotorreagentes, sem déficits motores ou sensitivos.',
      estadoNutricional:
        'IMC 24.5 kg/m², albumina 3.8 g/dL, sem sinais de desnutrição.',
      condicoesInternacao: '',
      riscoCirurgicoASA: '',
      relatorioRiscoCirurgico: '',
      resultadosProvasDiagnosticas:
        'Mamografia: lesão BIRADS 5 em QSE mama E. USG mamária: nódulo sólido 2.8x2.3cm. Biópsia: carcinoma ductal invasivo grau III, RE(-), RP(-), HER2(3+), Ki67 45%.',
      tratamentosRealizados:
        'Realizada biópsia percutânea em março/2026 no Hospital Presidente Dutra. Não há serviço de oncologia com protocolo de Trastuzumabe disponível na rede estadual do Maranhão.',
      procedimentoUrgente: true,
      caracterizacaoUrgencia:
        'Tumor de alto grau com alta taxa de proliferação (Ki67 45%), necessitando início urgente de quimioterapia neoadjuvante para evitar progressão para estádio III.',
      historiaPregressa:
        'Hipertensão arterial controlada com Losartana 50mg. Sem diabetes. Menopausa aos 52 anos. G3P3A0. Sem histórico familiar de câncer de mama.',
      alergiaMedicamentos: false,
      descricaoAlergiaMedicamentos: '',
      alergiaContrastesAnestesicos: false,
      descricaoAlergiaContrastes: '',
      hemograma: {
        realizado: true,
        resultado: 'Hb 12.5, Ht 38%, leucócitos 7.200, plaquetas 245.000',
        dataExame: '2026-03-12',
      },
      coagulograma: {
        realizado: true,
        resultado: 'TP 12s (INR 1.0), TTPa 28s',
        dataExame: '2026-03-12',
      },
      creatinina: {
        realizado: true,
        resultado: '0.8 mg/dL',
        dataExame: '2026-03-12',
      },
      glicemiaJejum: {
        realizado: true,
        resultado: '92 mg/dL',
        dataExame: '2026-03-12',
      },
      eletrocardiograma: {
        realizado: true,
        resultado: 'Ritmo sinusal, FC 76 bpm, sem alterações de repolarização',
        dataExame: '2026-03-13',
      },
      outrosExames: 'Ecocardiograma: FE 65%, sem alterações valvares. Raio-X de tórax: sem alterações.',
      justificativaImpossibilidadeLocal:
        'O estado do Maranhão não dispõe de protocolo de quimioterapia com Trastuzumabe na rede pública estadual. O Hospital Presidente Dutra e o CECON não possuem o medicamento disponível para dispensação pelo SUS.',
      necessidadeAcompanhanteLaudo: true,
      justificativaAcompanhante:
        'Paciente necessita de acompanhante durante tratamento quimioterápico devido aos efeitos colaterais esperados (náuseas, imunossupressão) que impossibilitam deslocamento e autocuidado.',
      transporteRecomendado: 'AEREO',
      justificativaTransporte:
        'Devido à urgência no início do tratamento e à distância entre São Luís e São Paulo (aproximadamente 3.000 km), o transporte aéreo é recomendado para evitar deterioração do estado clínico.',
    },
    preenchidoPor: 'Dr. Roberto Mendes',
    preenchidoEm: '2026-03-16T10:30:00Z',
    criadoEm: '2026-03-15T08:00:00Z',
    atualizadoEm: '2026-03-16T10:30:00Z',
  },

  /* ─── 2. RASCUNHO ─────────────────────────────────────── */
  {
    id: 'laudo-002',
    solicitacaoId: 'sol-003',
    status: 'RASCUNHO',
    cabecalho: {
      unidadeSaudeSolicitante: 'Hospital Macrorregional Dr. Muniz de Aragão — Caxias',
      numeroProntuario: 'TFD-PAC-0003',
      nomePaciente: 'José Almeida Costa',
      idadePaciente: 45,
      medicoSolicitanteNome: 'Dra. Ana Paula Ferreira',
      medicoSolicitanteCPF: '987.654.321-00',
      medicoSolicitanteTelefone: '(99) 98456-7890',
      procedimentoSolicitado: 'Artrodese de coluna lombar L4-L5',
      codigoProcedimentoSUS: '0408050080',
      diagnosticoInicial: 'Espondilolistese lombar grau II',
      cid10: 'M43.1',
      caracterAtendimento: 'HOSPITALAR',
    },
    secoes: {
      historicoDoenca:
        'Paciente com lombalgia crônica há 3 anos, com piora progressiva e irradiação para membro inferior direito. Tratamento conservador sem melhora.',
      exameFisico:
        'Dor à palpação de processos espinhosos L4-L5. Lasègue positivo à direita. Força grau 4 em dorsiflexão do pé direito.',
      diagnosticoProvavel: '',
      sinaisSintomasGerais: '',
      condicoesHemodinamicas: '',
      necessidadeMensuracaoPA: null,
      padraoRespiratorio: '',
      funcaoRenalHepatica: '',
      estadoNeurologicoSumario: '',
      estadoNutricional: '',
      condicoesInternacao: 'Necessidade de internação para procedimento cirúrgico de artrodese lombar com monitorização pós-operatória.',
      riscoCirurgicoASA: 'ASA_2',
      relatorioRiscoCirurgico: 'Paciente com hipertensão controlada, sem outras comorbidades significativas.',
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
    },
    criadoEm: '2026-03-28T14:20:00Z',
    atualizadoEm: '2026-03-29T09:15:00Z',
  },

  /* ─── 3. VAZIO (sol sem laudo) — representado pela ausência de laudo ── */
  {
    id: 'laudo-003',
    solicitacaoId: 'sol-005',
    status: 'VAZIO',
    cabecalho: {
      unidadeSaudeSolicitante: '',
      numeroProntuario: 'TFD-PAC-0005',
      nomePaciente: 'Francisca Oliveira Lima',
      idadePaciente: 72,
      medicoSolicitanteNome: 'Dr. Carlos Eduardo Souza',
      medicoSolicitanteCPF: '',
      medicoSolicitanteTelefone: '',
      procedimentoSolicitado: 'Cirurgia de catarata bilateral',
      codigoProcedimentoSUS: '0407010011',
      diagnosticoInicial: 'Catarata senil bilateral',
      cid10: 'H25.1',
      caracterAtendimento: 'HOSPITALAR',
    },
    secoes: {
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
    },
    criadoEm: '2026-03-30T11:00:00Z',
    atualizadoEm: '2026-03-30T11:00:00Z',
  },
];
