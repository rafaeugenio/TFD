/* -------------------------------------------------------------------------- */
/*  Assuntos do construtor                                                    */
/*                                                                            */
/*  Cada assunto responde "o que é cada linha da tabela". Informações de      */
/*  outras categorias (paciente, regionalização, unidades, solicitação) entram */
/*  como grupos de colunas relacionadas, sempre ligadas pela solicitação, sem */
/*  cruzamento inventado entre registros.                                     */
/* -------------------------------------------------------------------------- */

import {
  Plane, Wallet, FileText, Users, Stethoscope, CalendarCheck, ArrowRightLeft, HeartCrack, Landmark, HeartHandshake, Home,
} from 'lucide-react';
import type { Assunto, AssuntoId, Campo, GrupoCampos, Linha, Totalizador } from './tipos';

/* ── Helpers de totalização ──────────────────────────────────────────────── */

const soma = (campo: string) => (linhas: Linha[]) =>
  Math.round(linhas.reduce((acc, l) => acc + (Number(l[campo]) || 0), 0) * 100) / 100;

const distintos = (campo: string) => (linhas: Linha[]) =>
  new Set(linhas.map((l) => l[campo]).filter((v) => v !== null && v !== '')).size;

const contar = (teste: (l: Linha) => boolean) => (linhas: Linha[]) => linhas.filter(teste).length;

const registros = (label: string, ajuda: string): Totalizador => ({
  id: 'registros', label, ajuda, formato: 'numero', calcular: (l) => l.length,
});

const pacientesUnicos: Totalizador = {
  id: 'pacientesUnicos',
  label: 'Pacientes únicos',
  ajuda: 'Cada paciente é contado uma única vez, mesmo com vários registros.',
  formato: 'numero',
  calcular: distintos('pacienteCpf'),
};

/* ── Grupos transversais ─────────────────────────────────────────────────── */

const c = (campo: Campo): Campo => campo;

const grupoPaciente: GrupoCampos = {
  id: 'paciente',
  label: 'Paciente e onde mora',
  ajuda: 'Dados do paciente da solicitação. Dados bancários e documentos não aparecem aqui.',
  campos: [
    c({ id: 'paciente', label: 'Nome do paciente', tipo: 'texto', filtravel: true }),
    c({ id: 'municipio', label: 'Município do paciente', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Município de residência informado no cadastro do paciente.' }),
    c({ id: 'regional', label: 'Regional de saúde', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Obtida automaticamente pelo município, conforme o cadastro de Regionais.' }),
    c({ id: 'macrorregiao', label: 'Macrorregião', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Obtida automaticamente pela regional do município.' }),
    c({ id: 'cid', label: 'CID do último parecer', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'CID principal registrado no parecer médico mais recente da solicitação.' }),
  ],
};

const grupoSolicitacao: GrupoCampos = {
  id: 'solicitacao',
  label: 'Solicitação',
  ajuda: 'Dados do processo ao qual o registro pertence.',
  campos: [
    c({ id: 'numero', label: 'Número da solicitação', tipo: 'texto', filtravel: true }),
    c({ id: 'setorAtual', label: 'Setor em que está hoje', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Setor atual da solicitação, ou "Encerrada".' }),
    c({ id: 'tipoSolicitacao', label: 'Tipo de solicitação', tipo: 'categoria', filtravel: true, agrupavel: true }),
    c({ id: 'carimbo', label: 'Carimbo da Regulação', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Encaminhamento definido pela Regulação (CNRAC, CET, agendamento manual).' }),
  ],
};

const grupoUnidades: GrupoCampos = {
  id: 'unidades',
  label: 'Unidades de saúde',
  ajuda: 'Unidades ligadas à solicitação: onde o laudo foi feito e para onde o paciente vai.',
  campos: [
    c({ id: 'unidadeDestino', label: 'Unidade de destino (tratamento)', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Unidade do agendamento confirmado.' }),
    c({ id: 'unidadeOrigemLaudo', label: 'Unidade que emitiu o laudo', tipo: 'categoria', filtravel: true, agrupavel: true }),
  ],
};

const grupoPrototipo: GrupoCampos = {
  id: 'prototipo',
  label: 'Sobre o protótipo',
  ajuda: 'Só existe nesta versão de teste, para separar registros do protótipo e de demonstração.',
  campos: [
    c({ id: 'origemDado', label: 'Origem do dado', tipo: 'categoria', filtravel: true, agrupavel: true }),
  ],
};

const transversais = [grupoPaciente, grupoSolicitacao, grupoUnidades, grupoPrototipo];

/* ── Assuntos ────────────────────────────────────────────────────────────── */

export const ASSUNTOS: Assunto[] = [
  {
    id: 'passagens',
    label: 'Passagens',
    pergunta: 'Quanto gastamos com passagens e para onde os pacientes viajaram?',
    cadaLinha: 'uma passagem. Ida e volta compradas juntas contam como um único bilhete.',
    icone: Plane,
    aviso: 'Ida e volta é sempre um único bilhete. O transfer aparece na lista, mas não conta como bilhete.',
    datas: [
      { id: 'dataEmissao', label: 'Data de emissão da passagem', ajuda: 'Dia em que a agência emitiu o bilhete. É a data usada no faturamento.', modo: 'dia', campoInicio: 'dataEmissao' },
      { id: 'dataViagem', label: 'Data da viagem', ajuda: 'Dia do embarque. Em ida e volta, vale a data da ida.', modo: 'dia', campoInicio: 'dataViagem' },
      { id: 'dataCadastro', label: 'Data de cadastro no sistema', ajuda: 'Dia em que a passagem foi registrada no TFD.', modo: 'dia', campoInicio: 'dataCadastro' },
    ],
    grupos: [
      {
        id: 'passagem',
        label: 'Passagem',
        campos: [
          c({ id: 'pessoa', label: 'Quem viajou', tipo: 'texto', filtravel: true }),
          c({ id: 'pessoaTipo', label: 'Paciente ou acompanhante', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'origem', label: 'Cidade de origem', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'destino', label: 'Cidade de destino', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'modal', label: 'Modal', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Aéreo, terrestre, fluvial ou transfer.' }),
          c({ id: 'tipoBilhete', label: 'Tipo de bilhete', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Somente ida, somente volta, ida e volta ou transfer.' }),
          c({ id: 'companhia', label: 'Companhia', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'dataIda', label: 'Data da ida', tipo: 'data' }),
          c({ id: 'dataVolta', label: 'Data da volta', tipo: 'data' }),
          c({ id: 'dataEmissao', label: 'Data de emissão da passagem', tipo: 'data', agrupavel: true, ajuda: 'Dia em que a agência emitiu o bilhete.' }),
          c({ id: 'dataCadastro', label: 'Data de cadastro no sistema', tipo: 'data', agrupavel: true }),
        ],
      },
      {
        id: 'valoresPassagem',
        label: 'Valores e SIGTAP',
        ajuda: 'Valor real e valor SIGTAP são coisas diferentes e aparecem sempre separados.',
        campos: [
          c({ id: 'valorReal', label: 'Valor real da passagem', tipo: 'moeda', filtravel: true, somavel: true, ajuda: 'Quanto a passagem custou de fato.' }),
          c({ id: 'valorSigtap', label: 'Valor calculado pelo SIGTAP', tipo: 'moeda', somavel: true, ajuda: 'Quantidade de procedimentos SIGTAP vezes o valor da tabela SIGTAP.' }),
          c({ id: 'diferencaSigtap', label: 'Diferença (real menos SIGTAP)', tipo: 'moeda', somavel: true, ajuda: 'Positivo: a passagem custou mais que o valor SIGTAP.' }),
          c({ id: 'qtdProcedimentos', label: 'Procedimentos SIGTAP', tipo: 'numero', somavel: true, ajuda: 'Calculado pela distância e pelo modal. Ida e volta soma os dois trechos.' }),
          c({ id: 'distancia', label: 'Distância', tipo: 'numero', ajuda: 'Distância calculada entre origem e destino.' }),
          c({ id: 'unidadeDistancia', label: 'Unidade da distância', tipo: 'categoria', ajuda: 'km no terrestre, milhas no aéreo, milhas náuticas no fluvial.' }),
          c({ id: 'bilhetes', label: 'Conta como bilhete', tipo: 'numero', somavel: true, ajuda: '1 para ida, volta ou ida e volta. 0 para transfer.' }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['pessoa', 'origem', 'destino', 'modal', 'tipoBilhete', 'dataIda', 'valorReal'],
    totais: [
      registros('Registros', 'Linhas encontradas, incluindo transfers.'),
      { id: 'bilhetes', label: 'Bilhetes', ajuda: 'Ida, volta e ida e volta contam 1 cada. Transfer não conta.', formato: 'numero', calcular: soma('bilhetes') },
      { id: 'valorReal', label: 'Valor real das passagens', ajuda: 'Soma do valor real.', formato: 'moeda', calcular: soma('valorReal') },
      { id: 'valorSigtap', label: 'Valor SIGTAP', ajuda: 'Soma do valor calculado pelo SIGTAP.', formato: 'moeda', calcular: soma('valorSigtap'), exigeCampo: 'valorSigtap' },
      { id: 'diferencaSigtap', label: 'Diferença real menos SIGTAP', ajuda: 'Soma das diferenças. Transfers não têm SIGTAP e ficam fora dessa soma.', formato: 'moeda', calcular: soma('diferencaSigtap'), exigeCampo: 'diferencaSigtap' },
      pacientesUnicos,
    ],
  },
  {
    id: 'ajudas',
    label: 'Ajuda de custo',
    pergunta: 'Quanto foi lançado e pago em ajuda de custo?',
    cadaLinha: 'um lançamento de ajuda de custo, do paciente ou do acompanhante.',
    icone: Wallet,
    aviso: 'O valor é calculado pelo sistema com a tabela SIGTAP. Ajudas aditivas e subtrativas mostram só a diferença em relação à ajuda de referência.',
    datas: [
      { id: 'dataPagamento', label: 'Data de pagamento', ajuda: 'Dia em que a ajuda foi paga. Ajudas ainda não pagas ficam de fora.', modo: 'dia', campoInicio: 'dataPagamento' },
      { id: 'dataCadastro', label: 'Data de cadastro no sistema', ajuda: 'Dia em que a ajuda foi lançada no TFD.', modo: 'dia', campoInicio: 'dataCadastro' },
      { id: 'dataInicio', label: 'Data de início da ajuda', ajuda: 'Primeiro dia coberto pela ajuda.', modo: 'dia', campoInicio: 'dataInicio' },
      { id: 'periodoCoberto', label: 'Dias cobertos pela ajuda', ajuda: 'Entra toda ajuda cujo período (início a fim) tem algum dia dentro do período escolhido.', modo: 'intervalo', campoInicio: 'dataInicio', campoFim: 'dataFim' },
    ],
    grupos: [
      {
        id: 'ajuda',
        label: 'Ajuda de custo',
        campos: [
          c({ id: 'pessoa', label: 'Quem recebe', tipo: 'texto', filtravel: true }),
          c({ id: 'pessoaTipo', label: 'Paciente ou acompanhante', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'tipoAjuda', label: 'Tipo de ajuda', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Padrão, integral, aditiva ou subtrativa.' }),
          c({ id: 'diarias', label: 'Quantidade de diárias', tipo: 'numero', filtravel: true, somavel: true }),
          c({ id: 'dataInicio', label: 'Data de início', tipo: 'data' }),
          c({ id: 'dataFim', label: 'Data de fim', tipo: 'data' }),
          c({ id: 'dataCadastro', label: 'Data de cadastro no sistema', tipo: 'data', agrupavel: true }),
          c({ id: 'dataPagamento', label: 'Data de pagamento', tipo: 'data', agrupavel: true }),
          c({ id: 'situacaoPagamento', label: 'Situação do pagamento', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'pernoite', label: 'Pernoite no retorno', tipo: 'categoria', filtravel: true }),
        ],
      },
      {
        id: 'valoresAjuda',
        label: 'Valores e saldo',
        campos: [
          c({ id: 'valorCalculado', label: 'Valor calculado', tipo: 'moeda', filtravel: true, somavel: true, ajuda: 'Resultado do cálculo do sistema com a tabela SIGTAP.' }),
          c({ id: 'valorPago', label: 'Valor pago', tipo: 'moeda', somavel: true }),
          c({ id: 'ajusteDias', label: 'Ajuste em dias', tipo: 'numero', somavel: true, ajuda: 'Diferença de dias em relação à ajuda de referência (positivo = acréscimo).' }),
          c({ id: 'ajusteValor', label: 'Ajuste em valor', tipo: 'moeda', somavel: true, ajuda: 'Positivo em ajudas aditivas, negativo em subtrativas.' }),
          c({ id: 'saldoPaciente', label: 'Saldo atual do paciente', tipo: 'moeda', ajuda: 'Saldo mantido pelo sistema entre as solicitações do paciente. Não soma.' }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['pessoa', 'pessoaTipo', 'tipoAjuda', 'diarias', 'dataPagamento', 'valorCalculado'],
    totais: [
      registros('Ajudas de custo', 'Lançamentos encontrados.'),
      { id: 'diarias', label: 'Diárias', ajuda: 'Soma das diárias.', formato: 'numero', calcular: soma('diarias') },
      { id: 'valorCalculado', label: 'Valor calculado', ajuda: 'Soma do valor calculado.', formato: 'moeda', calcular: soma('valorCalculado') },
      { id: 'valorPago', label: 'Valor pago', ajuda: 'Soma do valor pago.', formato: 'moeda', calcular: soma('valorPago'), exigeCampo: 'valorPago' },
      { id: 'aditivos', label: 'Ajustes aditivos', ajuda: 'Soma dos acréscimos.', formato: 'moeda', calcular: (l) => soma('ajusteValor')(l.filter((x) => Number(x.ajusteValor) > 0)), exigeCampo: 'ajusteValor' },
      { id: 'subtrativos', label: 'Ajustes subtrativos', ajuda: 'Soma das subtrações.', formato: 'moeda', calcular: (l) => soma('ajusteValor')(l.filter((x) => Number(x.ajusteValor) < 0)), exigeCampo: 'ajusteValor' },
      pacientesUnicos,
    ],
  },
  {
    id: 'solicitacoes',
    label: 'Solicitações',
    pergunta: 'Quantos processos foram abertos ou encerrados?',
    cadaLinha: 'uma solicitação (um processo).',
    icone: FileText,
    datas: [
      { id: 'dataAbertura', label: 'Data de abertura', ajuda: 'Dia em que a solicitação foi criada.', modo: 'dia', campoInicio: 'dataAbertura' },
      { id: 'dataEncerramento', label: 'Data de encerramento', ajuda: 'Dia em que foi encerrada. Solicitações em andamento ficam de fora.', modo: 'dia', campoInicio: 'dataEncerramento' },
      { id: 'aberta', label: 'Período em que esteve aberta', ajuda: 'Entra toda solicitação que estava aberta em algum dia do período, mesmo que tenha começado antes.', modo: 'intervalo', campoInicio: 'dataAbertura', campoFim: 'dataEncerramento' },
    ],
    grupos: [
      {
        id: 'processo',
        label: 'Processo',
        campos: [
          c({ id: 'dataAbertura', label: 'Data de abertura', tipo: 'data', agrupavel: true }),
          c({ id: 'dataEncerramento', label: 'Data de encerramento', tipo: 'data', agrupavel: true }),
          c({ id: 'motivoEncerramento', label: 'Motivo do encerramento', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'criadoPor', label: 'Quem abriu a solicitação', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'qtdPassagens', label: 'Bilhetes da solicitação', tipo: 'numero', somavel: true }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['numero', 'paciente', 'municipio', 'dataAbertura', 'setorAtual', 'motivoEncerramento'],
    totais: [
      registros('Processos', 'Solicitações encontradas.'),
      pacientesUnicos,
      { id: 'encerradas', label: 'Encerradas', ajuda: 'Solicitações com data de encerramento.', formato: 'numero', calcular: contar((l) => Boolean(l.dataEncerramento)) },
      { id: 'obitos', label: 'Encerradas por óbito', ajuda: 'Motivo do encerramento igual a óbito.', formato: 'numero', calcular: contar((l) => l.motivoEncerramento === 'Óbito') },
    ],
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    pergunta: 'Quantos pacientes foram atendidos e de onde eles são?',
    cadaLinha: 'um paciente. Cada pessoa aparece uma única vez, mesmo com várias solicitações.',
    contagem: ['paciente encontrado', 'pacientes encontrados'],
    icone: Users,
    aviso: 'Um paciente entra no período se tinha solicitação aberta em algum dia dele. Uma solicitação de março a junho aparece no 1º e no 2º quadrimestre.',
    datas: [
      { id: 'aberta', label: 'Período em que tinha solicitação aberta', ajuda: 'Considera a solicitação do começo ao fim, respeitando quem atravessa dois períodos.', modo: 'intervalo', campoInicio: 'dataAbertura', campoFim: 'dataEncerramento' },
      { id: 'dataAbertura', label: 'Data de abertura da solicitação', ajuda: 'Só entram pacientes com solicitação aberta dentro do período.', modo: 'dia', campoInicio: 'dataAbertura' },
    ],
    grupos: [
      {
        id: 'atendimento',
        label: 'Atendimento no período',
        campos: [
          c({ id: 'qtdSolicitacoes', label: 'Solicitações no período', tipo: 'numero', somavel: true, filtravel: true }),
          c({ id: 'primeiraVez', label: 'Primeira vez ou recorrente', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Recorrente: já tinha outra solicitação antes das que aparecem neste período.' }),
          c({ id: 'cidadeDestino', label: 'Cidade de destino do tratamento', tipo: 'categoria', filtravel: true, agrupavel: true }),
        ],
      },
      grupoPaciente,
      grupoUnidades,
      grupoPrototipo,
    ],
    colunasPadrao: ['paciente', 'municipio', 'regional', 'cid', 'qtdSolicitacoes', 'primeiraVez'],
    totais: [
      { id: 'registros', label: 'Pacientes únicos', ajuda: 'Cada paciente contado uma vez.', formato: 'numero', calcular: (l) => l.length },
      { id: 'primeiraVez', label: 'Primeira vez', ajuda: 'Nenhuma solicitação anterior às do período.', formato: 'numero', calcular: contar((l) => l.primeiraVez === 'Primeira vez') },
      { id: 'recorrentes', label: 'Recorrentes', ajuda: 'Já tinham outra solicitação antes.', formato: 'numero', calcular: contar((l) => l.primeiraVez === 'Recorrente') },
    ],
  },
  {
    id: 'regulacao',
    label: 'Pareceres da Regulação',
    pergunta: 'Quantos pareceres foram dados e com quais CIDs?',
    cadaLinha: 'um parecer médico.',
    icone: Stethoscope,
    datas: [
      { id: 'dataParecer', label: 'Data do parecer', ajuda: 'Dia em que o médico registrou o parecer.', modo: 'dia', campoInicio: 'dataParecer' },
      { id: 'dataLaudo', label: 'Data do laudo', ajuda: 'Data do laudo médico anexado à solicitação.', modo: 'dia', campoInicio: 'dataLaudo' },
    ],
    grupos: [
      {
        id: 'parecer',
        label: 'Parecer',
        campos: [
          c({ id: 'dataParecer', label: 'Data do parecer', tipo: 'data', agrupavel: true }),
          c({ id: 'dataLaudo', label: 'Data do laudo', tipo: 'data' }),
          c({ id: 'decisao', label: 'Decisão', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'tipoParecer', label: 'Tipo de parecer', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'cidPrincipal', label: 'CID principal', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'cidSecundario', label: 'CID secundário', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'medico', label: 'Médico responsável', tipo: 'categoria', filtravel: true, agrupavel: true }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['numero', 'paciente', 'dataParecer', 'decisao', 'cidPrincipal', 'medico'],
    totais: [
      registros('Pareceres', 'Pareceres encontrados.'),
      { id: 'deferidos', label: 'Deferidos', ajuda: 'Pareceres com decisão deferida.', formato: 'numero', calcular: contar((l) => l.decisao === 'Deferido') },
      { id: 'indeferidos', label: 'Indeferidos', ajuda: 'Pareceres com decisão indeferida.', formato: 'numero', calcular: contar((l) => l.decisao === 'Indeferido') },
      pacientesUnicos,
    ],
  },
  {
    id: 'agendamentos',
    label: 'Agendamentos',
    pergunta: 'Quantas consultas, exames e cirurgias foram agendados?',
    cadaLinha: 'um agendamento confirmado.',
    icone: CalendarCheck,
    datas: [
      { id: 'dataAgendamento', label: 'Data marcada do atendimento', ajuda: 'Dia em que o paciente será atendido na unidade.', modo: 'dia', campoInicio: 'dataAgendamento' },
      { id: 'dataRegistro', label: 'Data em que o agendamento foi registrado', ajuda: 'Dia em que a Regulação confirmou o agendamento no sistema.', modo: 'dia', campoInicio: 'dataRegistro' },
    ],
    grupos: [
      {
        id: 'agendamento',
        label: 'Agendamento',
        campos: [
          c({ id: 'tipoProcedimento', label: 'Tipo de atendimento', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Consulta, exame, cirurgia ou tratamento contínuo.' }),
          c({ id: 'dataAgendamento', label: 'Data marcada', tipo: 'data', agrupavel: true }),
          c({ id: 'dataRegistro', label: 'Data do registro', tipo: 'data' }),
          c({ id: 'unidadeAgendamento', label: 'Unidade do agendamento', tipo: 'categoria', filtravel: true, agrupavel: true }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['numero', 'paciente', 'tipoProcedimento', 'dataAgendamento', 'unidadeAgendamento'],
    totais: [
      registros('Agendamentos', 'Agendamentos confirmados encontrados.'),
      { id: 'consultas', label: 'Consultas', ajuda: 'Agendamentos do tipo consulta.', formato: 'numero', calcular: contar((l) => l.tipoProcedimento === 'Consulta') },
      { id: 'exames', label: 'Exames', ajuda: 'Agendamentos do tipo exame.', formato: 'numero', calcular: contar((l) => l.tipoProcedimento === 'Exame') },
      pacientesUnicos,
    ],
  },
  {
    id: 'tramitacao',
    label: 'Passagem pelos setores',
    pergunta: 'Quantas solicitações passaram por um setor e com quem ficaram?',
    cadaLinha: 'a passagem de uma solicitação por um setor.',
    icone: ArrowRightLeft,
    aviso: 'Mostra em qual setor a solicitação esteve, em que período e com quem. Hora e tempo de permanência ficam de fora de propósito.',
    datas: [
      { id: 'permanencia', label: 'Período em que esteve no setor', ajuda: 'Entra toda solicitação que esteve no setor em algum dia do período.', modo: 'intervalo', campoInicio: 'dataEntrada', campoFim: 'dataSaida' },
      { id: 'dataEntrada', label: 'Data de entrada no setor', ajuda: 'Só entram as solicitações que chegaram ao setor dentro do período.', modo: 'dia', campoInicio: 'dataEntrada' },
    ],
    grupos: [
      {
        id: 'setor',
        label: 'Setor',
        campos: [
          c({ id: 'setor', label: 'Setor', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'responsavelSetor', label: 'Responsável no setor', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'situacaoSetor', label: 'Ainda está no setor?', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'dataEntrada', label: 'Data de entrada no setor', tipo: 'data' }),
          c({ id: 'dataSaida', label: 'Data de saída do setor', tipo: 'data' }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['numero', 'paciente', 'setor', 'responsavelSetor', 'dataEntrada', 'dataSaida'],
    totais: [
      { id: 'solicitacoes', label: 'Solicitações', ajuda: 'Cada solicitação contada uma vez.', formato: 'numero', calcular: distintos('numero') },
      registros('Passagens por setor', 'Linhas encontradas. A mesma solicitação pode passar por mais de um setor.'),
      pacientesUnicos,
    ],
  },
  {
    id: 'obitos',
    label: 'Óbitos',
    pergunta: 'Quantos óbitos foram registrados e qual o valor?',
    cadaLinha: 'uma solicitação encerrada por óbito.',
    icone: HeartCrack,
    aviso: 'Óbito é identificado pelo motivo de encerramento da solicitação.',
    datas: [
      { id: 'dataObito', label: 'Data do encerramento por óbito', ajuda: 'Dia em que a solicitação foi encerrada com motivo óbito.', modo: 'dia', campoInicio: 'dataObito' },
      { id: 'dataAbertura', label: 'Data de abertura da solicitação', ajuda: 'Dia em que a solicitação foi criada.', modo: 'dia', campoInicio: 'dataAbertura' },
    ],
    grupos: [
      {
        id: 'obito',
        label: 'Óbito',
        campos: [
          c({ id: 'dataObito', label: 'Data do encerramento', tipo: 'data', agrupavel: true }),
          c({ id: 'valorObito', label: 'Valor registrado', tipo: 'moeda', somavel: true, ajuda: 'Despesas registradas no encerramento por óbito.' }),
          c({ id: 'dataAbertura', label: 'Data de abertura da solicitação', tipo: 'data' }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['numero', 'paciente', 'municipio', 'dataObito', 'valorObito'],
    totais: [
      registros('Óbitos', 'Solicitações encerradas por óbito.'),
      { id: 'valorObito', label: 'Valor total', ajuda: 'Soma do valor registrado.', formato: 'moeda', calcular: soma('valorObito') },
    ],
  },
  {
    id: 'servico_social',
    label: 'Serviço Social',
    pergunta: 'Quantas demandas sociais foram atendidas no mês, por quem e quantos documentos geraram?',
    cadaLinha: 'uma demanda social aberta para o Serviço Social.',
    contagem: ['demanda encontrada', 'demandas encontradas'],
    icone: HeartHandshake,
    aviso: 'Os instrumentos avulsos, sem demanda, não entram aqui. Eles aparecem nas Casas de apoio quando citam uma casa.',
    datas: [
      { id: 'dataEncaminhamento', label: 'Data em que a demanda foi aberta', ajuda: 'Dia em que o setor encaminhou o pedido ao Serviço Social.', modo: 'dia', campoInicio: 'dataEncaminhamento' },
      { id: 'dataConclusao', label: 'Data de conclusão ou cancelamento', ajuda: 'Dia em que a demanda foi concluída ou cancelada. Demandas abertas não têm essa data.', modo: 'dia', campoInicio: 'dataConclusao' },
    ],
    grupos: [
      {
        id: 'demanda',
        label: 'Demanda social',
        campos: [
          c({ id: 'setorOrigem', label: 'Setor que pediu', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'situacao', label: 'Situação da demanda', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'encaminhadoPor', label: 'Quem abriu a demanda', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'profissional', label: 'Profissional responsável', tipo: 'categoria', filtravel: true, agrupavel: true, ajuda: 'Quem assumiu a demanda. "Não assumida" quando ninguém pegou ainda.' }),
          c({ id: 'dataEncaminhamento', label: 'Data em que a demanda foi aberta', tipo: 'data', agrupavel: true }),
          c({ id: 'dataConclusao', label: 'Data de conclusão ou cancelamento', tipo: 'data', agrupavel: true }),
          c({ id: 'diasAtendimento', label: 'Dias até concluir', tipo: 'numero', ajuda: 'Dias entre abrir e concluir. Fica vazio enquanto a demanda está aberta.' }),
        ],
      },
      {
        id: 'documentos',
        label: 'Documentos gerados',
        campos: [
          c({ id: 'qtdInstrumentos', label: 'Instrumentos da demanda', tipo: 'numero', somavel: true, filtravel: true, ajuda: 'Parecer social, encaminhamento, declaração e outros documentos vinculados à demanda.' }),
          c({ id: 'instrumentosAssinados', label: 'Instrumentos com documento assinado anexado', tipo: 'numero', somavel: true }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['numero', 'paciente', 'setorOrigem', 'situacao', 'profissional', 'dataEncaminhamento', 'qtdInstrumentos'],
    totais: [
      registros('Demandas', 'Demandas sociais encontradas.'),
      { id: 'abertas', label: 'Em aberto', ajuda: 'Pendentes ou em atendimento.', formato: 'numero', calcular: contar((l) => l.situacao === 'Pendente' || l.situacao === 'Em atendimento') },
      { id: 'concluidas', label: 'Concluídas', ajuda: 'Demandas com a orientação final registrada.', formato: 'numero', calcular: contar((l) => l.situacao === 'Concluída') },
      { id: 'instrumentos', label: 'Instrumentos gerados', ajuda: 'Soma dos documentos vinculados às demandas.', formato: 'numero', calcular: soma('qtdInstrumentos') },
      pacientesUnicos,
    ],
  },
  {
    id: 'casas_apoio',
    label: 'Casas de apoio',
    pergunta: 'Para quais casas de apoio os pacientes foram encaminhados no mês?',
    cadaLinha: 'um encaminhamento do Serviço Social para uma casa de apoio.',
    contagem: ['encaminhamento', 'encaminhamentos'],
    icone: Home,
    aviso: 'Só entram encaminhamentos em que a casa foi escolhida. Casas sem nenhum encaminhamento no período não aparecem.',
    datas: [
      { id: 'dataEncaminhamento', label: 'Data do encaminhamento', ajuda: 'Dia em que o instrumento foi elaborado pelo Serviço Social.', modo: 'dia', campoInicio: 'dataEncaminhamento' },
    ],
    grupos: [
      {
        id: 'encaminhamento',
        label: 'Encaminhamento',
        campos: [
          c({ id: 'casa', label: 'Casa de apoio', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'cidadeCasa', label: 'Cidade da casa', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'dataEncaminhamento', label: 'Data do encaminhamento', tipo: 'data', agrupavel: true }),
          c({ id: 'elaboradoPor', label: 'Profissional que elaborou', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'vinculo', label: 'Demanda ou avulso', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'sigiloso', label: 'Sigiloso', tipo: 'categoria', filtravel: true, agrupavel: true }),
          c({ id: 'assinado', label: 'Documento assinado anexado', tipo: 'categoria', filtravel: true, agrupavel: true }),
        ],
      },
      ...transversais,
    ],
    colunasPadrao: ['casa', 'cidadeCasa', 'numero', 'paciente', 'dataEncaminhamento', 'elaboradoPor', 'assinado'],
    totais: [
      registros('Encaminhamentos', 'Encaminhamentos encontrados.'),
      { id: 'casas', label: 'Casas utilizadas', ajuda: 'Casas diferentes que receberam encaminhamento.', formato: 'numero', calcular: distintos('casa') },
      { id: 'assinados', label: 'Com documento assinado', ajuda: 'Encaminhamentos com a cópia assinada anexada.', formato: 'numero', calcular: contar((l) => l.assinado === 'Sim') },
      pacientesUnicos,
    ],
  },
  {
    id: 'financeiro',
    label: 'Indicadores financeiros',
    pergunta: 'Qual o resumo financeiro do período, mês a mês?',
    cadaLinha: 'um mês do período, com os indicadores do relatório financeiro.',
    contagem: ['mês', 'meses'],
    icone: Landmark,
    aviso: 'Cada indicador usa a sua própria data, indicada no nome. A meta SIGTAP é um valor informado; o realizado é calculado pelo sistema.',
    datas: [
      { id: 'porIndicador', label: 'Cada indicador usa a data indicada no próprio nome', ajuda: 'Bilhetes e passagens pela emissão, ajuda lançada pelo cadastro, ajuda paga pelo pagamento, processos pela abertura, óbitos pelo encerramento.', modo: 'dia', campoInicio: 'mesInicio' },
    ],
    grupos: [
      {
        id: 'processos',
        label: 'Processos e óbitos',
        campos: [
          c({ id: 'processos', label: 'Processos abertos (pela abertura)', tipo: 'numero', somavel: true }),
          c({ id: 'obitos', label: 'Óbitos (pelo encerramento)', tipo: 'numero', somavel: true }),
          c({ id: 'valorObitos', label: 'Valor dos óbitos (pelo encerramento)', tipo: 'moeda', somavel: true }),
        ],
      },
      {
        id: 'deslocamento',
        label: 'Passagens e deslocamento',
        campos: [
          c({ id: 'bilhetes', label: 'Bilhetes (pela emissão)', tipo: 'numero', somavel: true, ajuda: 'Ida e volta conta 1. Transfer não conta.' }),
          c({ id: 'valorRealPassagens', label: 'Valor real das passagens (pela emissão)', tipo: 'moeda', somavel: true }),
          c({ id: 'valorSigtapDeslocamento', label: 'Deslocamento aprovado SIGTAP (pela emissão)', tipo: 'moeda', somavel: true }),
          c({ id: 'procDeslocamento', label: 'Procedimentos de deslocamento (pela emissão)', tipo: 'numero', somavel: true }),
        ],
      },
      {
        id: 'ajudaFin',
        label: 'Ajuda de custo',
        campos: [
          c({ id: 'ajudasLancadas', label: 'Ajudas lançadas (pelo cadastro)', tipo: 'numero', somavel: true }),
          c({ id: 'diarias', label: 'Diárias lançadas (pelo cadastro)', tipo: 'numero', somavel: true }),
          c({ id: 'valorAjudaLancada', label: 'Ajuda de custo calculada (pelo cadastro)', tipo: 'moeda', somavel: true }),
          c({ id: 'valorAjudaPaga', label: 'Ajuda de custo paga (pelo pagamento)', tipo: 'moeda', somavel: true }),
        ],
      },
      {
        id: 'meta',
        label: 'Meta SIGTAP',
        ajuda: 'Meta é informada por você. Realizado é calculado pelo sistema.',
        campos: [
          c({ id: 'procRealizados', label: 'Procedimentos SIGTAP realizados (calculado)', tipo: 'numero', somavel: true, ajuda: 'Procedimentos de deslocamento mais diárias de ajuda de custo.' }),
          c({ id: 'metaMensal', label: 'Meta mensal de procedimentos (informada)', tipo: 'numero', somavel: true, ajuda: 'Meta anual informada dividida por 12.' }),
          c({ id: 'percentualMeta', label: 'Realizado em relação à meta (%)', tipo: 'numero' }),
        ],
      },
    ],
    colunasPadrao: ['mes', 'processos', 'bilhetes', 'valorRealPassagens', 'valorSigtapDeslocamento', 'valorAjudaLancada', 'valorAjudaPaga', 'obitos'],
    totais: [
      { id: 'valorRealPassagens', label: 'Valor real das passagens', ajuda: 'Soma no período, pela emissão.', formato: 'moeda', calcular: soma('valorRealPassagens') },
      { id: 'valorSigtapDeslocamento', label: 'Deslocamento SIGTAP', ajuda: 'Soma no período, pela emissão.', formato: 'moeda', calcular: soma('valorSigtapDeslocamento') },
      { id: 'valorAjudaPaga', label: 'Ajuda de custo paga', ajuda: 'Soma no período, pelo pagamento.', formato: 'moeda', calcular: soma('valorAjudaPaga') },
      { id: 'processos', label: 'Processos', ajuda: 'Solicitações abertas no período.', formato: 'numero', calcular: soma('processos') },
    ],
  },
];

/** Campo "Mês" usado pelos indicadores financeiros (coluna fixa). */
export const CAMPO_MES: Campo = { id: 'mes', label: 'Mês', tipo: 'texto' };

export function assuntoPorId(id: AssuntoId): Assunto {
  return ASSUNTOS.find((a) => a.id === id) ?? ASSUNTOS[0];
}

/** Todos os campos de um assunto, na ordem dos grupos. */
export function camposDoAssunto(a: Assunto): Campo[] {
  const extras = a.id === 'financeiro' ? [CAMPO_MES] : [];
  const vistos = new Set<string>();
  return [...extras, ...a.grupos.flatMap((g) => g.campos)].filter((campo) => {
    if (vistos.has(campo.id)) return false;
    vistos.add(campo.id);
    return true;
  });
}

export function campoPorId(a: Assunto, id: string): Campo | undefined {
  return camposDoAssunto(a).find((campo) => campo.id === id);
}

/** Filtros compatíveis com o assunto, só dos campos marcados como filtráveis.
 *  Nos indicadores financeiros só a regionalização filtra, porque cada linha
 *  já é um mês consolidado. */
export function filtrosDoAssunto(a: Assunto): Campo[] {
  if (a.id === 'financeiro') {
    return grupoPaciente.campos.filter((c2) => ['municipio', 'regional', 'macrorregiao'].includes(c2.id));
  }
  return camposDoAssunto(a).filter((campo) => campo.filtravel);
}

export const ASSUNTOS_ORDEM: AssuntoId[] = [
  'passagens', 'ajudas', 'solicitacoes', 'pacientes', 'regulacao', 'agendamentos', 'tramitacao', 'obitos', 'servico_social', 'casas_apoio', 'financeiro',
];
