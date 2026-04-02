/* ============================================================
   Termo de Compromisso — Model
   C3: Digitalização do Termo de Compromisso (17 cláusulas)
   ============================================================ */

export type StatusTermo = 'PENDENTE' | 'REGISTRADO';

export type ModalidadeAceite =
  | 'ACEITE_PRESENCIAL'
  | 'UPLOAD_ASSINADO'
  | 'ASSINATURA_DIGITAL'; // futuro — gap A9

export type GrauParentesco =
  | 'PAI_MAE'
  | 'CONJUGE'
  | 'FILHO'
  | 'IRMAO'
  | 'TUTOR_LEGAL'
  | 'OUTRO';

export interface TermoCompromisso {
  id: string;
  solicitacaoId: string;
  numeroProcesso: string;

  /* Dados do paciente (snapshot no momento do registro) */
  pacienteNome: string;
  pacienteCpf: string;
  pacienteRg?: string;
  pacienteCns?: string;
  pacienteEndereco?: string;
  pacienteMunicipio?: string;

  /* Status e modalidade */
  status: StatusTermo;
  modalidadeAceite?: ModalidadeAceite;

  /* Dados do responsável (quando menor de idade ou incapaz) */
  responsavelNome?: string;
  responsavelCpf?: string;
  responsavelParentesco?: GrauParentesco;

  /* Upload (quando modalidade = UPLOAD_ASSINADO) */
  arquivoUrl?: string;
  arquivoNome?: string;

  /* Confirmação de leitura (aceite presencial) */
  confirmacaoLeitura?: boolean;

  /* Metadados */
  dataRegistro?: string;
  registradoPor?: string;
  dataCriacao: string;
}

/* ── 17 Cláusulas fixas (texto legal não editável) ── */

export const CLAUSULAS_TERMO: string[] = [
  'O TFD é concedido para atendimento em rede pública conveniada/contratada do SUS quando esgotados todos os meios de tratamento no Estado domiciliar;',
  'A autorização está condicionada à garantia de atendimento na unidade de referência, com horário e data definido previamente;',
  'A solicitação de TFD deverá ser feita pelo médico assistente do paciente nas unidades vinculadas ao SUS do Estado do Maranhão, através de Laudo Médico;',
  'Poderá ser solicitado, se necessário, exames ou documentos que complementem a análise de solicitação de tratamento fora do domicílio;',
  'O paciente deve realizar abertura de processo de TFD até 45 dias antes da data do agendamento;',
  'Paciente em continuidade ao tratamento deverá renovar o Laudo Médico a cada doze meses;',
  'Quando da necessidade de prorrogação do tempo de permanência na unidade de referência, dever-se-á apresentar relatório ou declaração, assinado pelo médico assistente da unidade, com especificação do tratamento a ser realizado e sua previsão de término;',
  'As despesas permitidas pelo TFD são aquelas relativas a transporte e ajuda de custo para paciente e acompanhante (quando necessário). Sendo o valor da ajuda de custo baseada na tabela SUS, segundo a Portaria/SAS/nº 55;',
  'Só é permitido o pagamento de despesas para deslocamento de acompanhante nos casos em que há indicação médica;',
  'Quando o deslocamento for por via aérea, e a permanência no local de tratamento for inferior a 5 (cinco) dias, paciente e acompanhante terão direito somente a uma bagagem de mão de até 10kg cada um;',
  'O acompanhante deve ser maior de 18 anos e menor de 60 anos;',
  'O acompanhante deve estar em condições de saúde necessárias para o acompanhamento e quando este for do sexo feminino, não deverá estar gestante;',
  'É vedado o pagamento de diárias a pacientes encaminhados por meio de TFD que permaneçam hospitalizados na Unidade de Referência;',
  'Os benefícios do TFD serão mantidos até a data do término do procedimento solicitado;',
  'A não observância dos termos abordados poderá acarretar a suspensão dos benefícios do Programa de Tratamento Fora de Domicílio;',
  'Quando já realizado o tratamento, o paciente deverá acompanhar dentro do estado domiciliar;',
  'Qualquer caso não especificado neste termo passará por análise;',
];

/* ── Opções de parentesco para dropdown ── */

export const PARENTESCO_OPTIONS: { value: GrauParentesco; label: string }[] = [
  { value: 'PAI_MAE', label: 'Pai/Mãe' },
  { value: 'CONJUGE', label: 'Cônjuge' },
  { value: 'FILHO', label: 'Filho(a)' },
  { value: 'IRMAO', label: 'Irmão(ã)' },
  { value: 'TUTOR_LEGAL', label: 'Tutor Legal' },
  { value: 'OUTRO', label: 'Outro' },
];
