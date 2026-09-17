/* -------------------------------------------------------------------------- */
/*  Base de dados do construtor de relatórios                                 */
/*                                                                            */
/*  Transforma as solicitações do protótipo (as mesmas que o FluxoV2Provider  */
/*  carrega) em linhas de negócio por assunto. Regras já existentes no        */
/*  sistema são CONSUMIDAS, nunca recriadas:                                  */
/*  - valor e diárias da ajuda de custo: `calcularAjudaCustoTipo`;            */
/*  - saldo do paciente: `saldoDoPaciente`;                                   */
/*  - procedimento SIGTAP do deslocamento: `resolveSigtapPassagem` e          */
/*    `calcularQuantidadePassagem`;                                           */
/*  - regional do município: `regionalDoMunicipio`.                           */
/*                                                                            */
/*  O mock atual não tem várias informações pedidas pelos relatórios (data de */
/*  emissão da passagem separada do cadastro, data de pagamento da ajuda,     */
/*  histórico de tramitação, quem criou a solicitação, distância). Esses      */
/*  campos são COMPLETADOS de forma determinística (mesma solicitação gera    */
/*  sempre o mesmo valor) e há registros de demonstração para que todos os    */
/*  cenários possam ser testados. Tudo que é complemento fica listado em      */
/*  `DIVERGENCIAS` e sinalizado na tela.                                      */
/* -------------------------------------------------------------------------- */

import {
  calcularAjudaCustoTipo,
  MOTIVO_ENCERRAMENTO_LABEL,
  STATUS_LABEL,
  TIPO_PARECER_LABEL,
  TIPO_PROCEDIMENTO_LABEL,
  TIPO_CALCULO_AJUDA_LABEL,
  type AjudaCustoMock,
  type SolicitacaoMock,
  type StatusGlobalV2,
  type ViagemMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { regionalDoMunicipio, nomeCidade } from '@/app/fluxo-v2/_utils/derivarRegional';
import { saldoDoPaciente } from '@/app/fluxo-v2/_state/saldoAjudaCustoStore';
import { calcularQuantidadePassagem, resolveSigtapPassagem } from '../_shared/sigtap-mapper';
import type { Linha } from './tipos';

/* ── Aleatoriedade determinística ────────────────────────────────────────── */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function gerador(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const escolher = <T,>(r: () => number, lista: T[]): T => lista[Math.floor(r() * lista.length)];
const inteiro = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

function somarDias(isoData: string, dias: number): string {
  const d = new Date(`${isoData.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const hojeISO = () => new Date().toISOString().slice(0, 10);
const menor = (a: string, b: string) => (a < b ? a : b);

/* ── Hierarquia município → regional → macrorregião ──────────────────────── */

/**
 * O protótipo guarda a "região" do paciente em `zonaRegional`, que é o nível
 * usado pelo filtro em cascata das filas. Aqui ela é apresentada como
 * macrorregião. Quando o paciente não tem zona, ela é derivada do município.
 * PENDÊNCIA: confirmar com o cadastro de Regionais (vínculo com a região) se
 * essa zona é de fato a macrorregião oficial de saúde.
 */
const MACRO_POR_MUNICIPIO: Record<string, 'Norte' | 'Sul' | 'Leste'> = {
  'sao luis': 'Norte', rosario: 'Norte', 'itapecuru-mirim': 'Norte', chapadinha: 'Norte',
  viana: 'Norte', pinheiro: 'Norte', 'ze doca': 'Norte', 'santa ines': 'Norte',
  imperatriz: 'Sul', acailandia: 'Sul', balsas: 'Sul', 'barra do corda': 'Sul',
  caxias: 'Leste', timon: 'Leste', codo: 'Leste', coroata: 'Leste', bacabal: 'Leste',
  pedreiras: 'Leste', 'presidente dutra': 'Leste', 'sao joao dos patos': 'Leste',
};

const chave = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function macrorregiao(zona: string | undefined, municipio: string): string {
  if (zona && zona !== 'Centro' && zona !== 'Oeste') return `Macrorregião ${zona}`;
  const m = MACRO_POR_MUNICIPIO[chave(nomeCidade(municipio))];
  return m ? `Macrorregião ${m}` : 'Macrorregião não informada';
}

/* ── SIGTAP de deslocamento ──────────────────────────────────────────────── */

/**
 * Valor unitário dos procedimentos de deslocamento, conforme a tabela SIGTAP
 * cadastrada no sistema (seed `sigtap_procedimentos`). O CÓDIGO e a
 * quantidade vêm do mapeador SIGTAP já existente; aqui só se lê o valor.
 * PENDÊNCIA: histórico/snapshot da tabela quando os parâmetros mudam não está
 * confirmado, então o relatório usa sempre o valor vigente.
 */
const VALOR_UNITARIO_SIGTAP: Record<string, number> = {
  aereo: 181.5,
  terrestre: 4.95,
  fluvial: 3.7,
};

/** Distância aproximada em km até a cidade de destino (complemento: o mock
 *  não traz a distância calculada da passagem). */
const KM_ATE_DESTINO: Record<string, number> = {
  'sao paulo': 2350, brasilia: 1520, recife: 1210, fortaleza: 650, teresina: 330,
  'rio de janeiro': 2440, belem: 480, barretos: 2160, salvador: 1320, 'porto alegre': 3150,
  imperatriz: 520, 'sao luis': 20,
};

function distanciaPorModal(destino: string, modal: string, r: () => number) {
  const km = KM_ATE_DESTINO[chave(nomeCidade(destino))] ?? inteiro(r, 400, 1800);
  if (modal === 'aereo') return { valor: Math.round(km / 1.609), unidade: 'milhas' };
  if (modal === 'fluvial') return { valor: Math.round((km * 0.6) / 1.852), unidade: 'milhas náuticas' };
  return { valor: Math.round(km * 1.25), unidade: 'km' };
}

/* ── Rótulos ─────────────────────────────────────────────────────────────── */

const MODAL_LABEL: Record<string, string> = {
  aereo: 'Aéreo', terrestre: 'Terrestre', fluvial: 'Fluvial', transfer: 'Transfer',
};

const CARIMBO_LABEL: Record<string, string> = {
  APROVADO_DIRETO: 'Aprovado direto',
  CNRAC: 'CNRAC',
  CET: 'CET',
  SAAS: 'SAAS',
  AGENDAMENTO: 'Agendamento manual',
};

const SETORES: { status: StatusGlobalV2; label: string }[] = [
  { status: 'em_dados_basicos', label: 'Dados Básicos' },
  { status: 'em_regulacao', label: 'Regulação' },
  { status: 'em_passagens', label: 'Passagens' },
  { status: 'em_ajuda_custo', label: 'Ajuda de Custo' },
  { status: 'em_acompanhamento', label: 'Acompanhamento' },
];

const RESPONSAVEIS_POR_SETOR: Record<string, string[]> = {
  'Dados Básicos': ['Ana Lívia Cardoso', 'Jonas Carvalho'],
  Regulação: ['Manu Costa', 'Dr. Carlos Mendes', 'Enf. Patrícia Nunes'],
  Passagens: ['Luiz Cutrim', 'Keila Souza'],
  'Ajuda de Custo': ['Thiago Mendes', 'Neide Ramos', 'Keila Souza'],
  Acompanhamento: ['Maria Silva', 'Neide Ramos'],
};

const ATENDENTES = ['Ana Lívia Cardoso', 'Jonas Carvalho', 'Maria Silva', 'Keila Souza'];

function motivoLabel(motivo: string | undefined): string {
  if (!motivo) return '';
  return MOTIVO_ENCERRAMENTO_LABEL[motivo.toLowerCase()] ?? motivo;
}

export const ehObito = (motivo: string | undefined) => chave(motivo ?? '').includes('obito');

/* ── Base agregada ───────────────────────────────────────────────────────── */

export interface BaseRelatorios {
  passagens: Linha[];
  ajudas: Linha[];
  solicitacoes: Linha[];
  regulacao: Linha[];
  agendamentos: Linha[];
  tramitacao: Linha[];
  obitos: Linha[];
  /** Registros de demonstração somados aos do protótipo. */
  totalDemonstracao: number;
  totalProtocolo: number;
}

/** Colunas da solicitação e do paciente que acompanham qualquer assunto. */
function dimensoes(s: SolicitacaoMock, demo: boolean): Linha {
  const p = s.paciente;
  const parecer = [...s.pareceres].sort((a, b) => b.data.localeCompare(a.data))[0];
  const confirmada = s.agendamento?.tentativas.find((t) => t.desfecho === 'agendamento_confirmado');
  const municipio = nomeCidade(p.municipio) || 'Não informado';
  return {
    numero: s.numero,
    paciente: p.nome,
    pacienteCpf: p.cpf,
    municipio,
    regional: regionalDoMunicipio(p.regional, p.municipio),
    macrorregiao: macrorregiao(p.zonaRegional, p.municipio),
    cid: parecer?.cidPrincipal
      ? `${parecer.cidPrincipal}${parecer.cidPrincipalNome ? ` · ${parecer.cidPrincipalNome}` : ''}`
      : 'Sem CID registrado',
    unidadeDestino: confirmada?.unidade ?? 'Sem unidade de destino',
    unidadeOrigemLaudo: s.laudoOrigemUnidade ?? 'Não informada',
    cidadeDestino: '',
    setorAtual: s.encerramento ? 'Encerrada' : STATUS_LABEL[s.status] ?? s.status,
    tipoSolicitacao: s.tipoSolicitacao === 'ajuda_custo' ? 'Somente ajuda de custo' : 'Normal',
    carimbo: s.carimboRegulacao ? CARIMBO_LABEL[s.carimboRegulacao] ?? s.carimboRegulacao : 'Sem carimbo',
    origemDado: demo ? 'Demonstração' : 'Protótipo',
  };
}

function nomeAcompanhante(s: SolicitacaoMock, id?: string) {
  return s.acompanhantes.find((a) => a.id === id)?.nome ?? s.acompanhantes[0]?.nome ?? 'Acompanhante';
}

/**
 * Passagens. Regra crítica: IDA E VOLTA É UM ÚNICO BILHETE.
 * O protótipo grava ida e volta como dois registros (a gravação divide o
 * valor 50/50). Para não quebrar o faturamento, o relatório reúne a ida e a
 * volta do mesmo beneficiário e modal em um único bilhete "Ida e volta", com
 * o valor somado de volta ao valor original. Transfer não conta como bilhete.
 */
function montarPassagens(s: SolicitacaoMock, base: Linha): Linha[] {
  const ativas = s.viagens.filter((v) => v.ativa !== false);
  const usadas = new Set<string>();
  const linhas: Linha[] = [];
  const beneficiario = (v: ViagemMock) => `${v.beneficiarioTipo}:${v.beneficiarioId ?? ''}`;

  const ordenadas = [...ativas].sort((a, b) => a.data.localeCompare(b.data));
  for (const v of ordenadas) {
    if (usadas.has(v.id)) continue;
    usadas.add(v.id);
    let volta: ViagemMock | undefined;
    if (v.tipo === 'ida' && v.modal !== 'transfer') {
      volta = ordenadas.find(
        (x) => !usadas.has(x.id) && x.tipo === 'volta' && x.modal === v.modal
          && beneficiario(x) === beneficiario(v) && x.data >= v.data,
      );
      if (volta) usadas.add(volta.id);
    }

    const r = gerador(hash(v.id));
    const ehTransfer = v.modal === 'transfer' || v.tipo === 'transfer';
    const tipoBilhete = ehTransfer ? 'Transfer' : volta ? 'Ida e volta' : v.tipo === 'volta' ? 'Somente volta' : 'Somente ida';
    const dataCadastro = (v.dataCriacao || somarDias(v.data, -inteiro(r, 7, 20))).slice(0, 10);
    const dataEmissao = somarDias(dataCadastro, -inteiro(r, 0, 5));
    const pessoaTipo = v.beneficiarioTipo === 'acompanhante' ? 'Acompanhante' : 'Paciente';
    const pessoa = pessoaTipo === 'Acompanhante' ? nomeAcompanhante(s, v.beneficiarioId) : s.paciente.nome;

    let distancia: number | null = null;
    let unidade = '';
    let qtd = 0;
    let valorSigtap: number | null = null;
    if (!ehTransfer) {
      const dist = v.distanciaValor
        ? { valor: v.distanciaValor, unidade: v.distanciaUnidade === 'milhas' ? 'milhas' : v.distanciaUnidade === 'milhas_nauticas' ? 'milhas náuticas' : 'km' }
        : distanciaPorModal(v.destino, v.modal, r);
      distancia = dist.valor;
      unidade = dist.unidade;
      const proc = resolveSigtapPassagem({
        beneficiario: v.beneficiarioTipo,
        modal: v.modal as 'aereo' | 'terrestre' | 'fluvial',
        cnrac: s.carimboRegulacao === 'CNRAC',
      });
      const porTrecho = calcularQuantidadePassagem(dist.valor, proc.unidadeDivisor) ?? 0;
      qtd = porTrecho * (volta ? 2 : 1);
      valorSigtap = Math.round(qtd * (VALOR_UNITARIO_SIGTAP[v.modal] ?? 0) * 100) / 100;
    }

    const valorReal = Math.round((v.valor + (volta?.valor ?? 0)) * 100) / 100;
    linhas.push({
      ...base,
      id: v.id,
      pessoaTipo,
      pessoa,
      origem: nomeCidade(v.origem) || v.origem,
      destino: nomeCidade(v.destino) || v.destino,
      cidadeDestino: nomeCidade(v.destino) || v.destino,
      modal: MODAL_LABEL[v.modal] ?? v.modal,
      tipoBilhete,
      dataIda: v.tipo === 'volta' ? null : v.data.slice(0, 10),
      dataVolta: volta ? volta.data.slice(0, 10) : v.tipo === 'volta' ? v.data.slice(0, 10) : null,
      dataViagem: v.data.slice(0, 10),
      dataEmissao,
      dataCadastro,
      distancia,
      unidadeDistancia: unidade,
      qtdProcedimentos: ehTransfer ? null : qtd,
      valorSigtap,
      valorReal,
      diferencaSigtap: valorSigtap === null ? null : Math.round((valorReal - valorSigtap) * 100) / 100,
      bilhetes: ehTransfer ? 0 : 1,
      companhia: v.companhia ?? 'Não informada',
    });
  }
  return linhas;
}

function montarAjudas(s: SolicitacaoMock, base: Linha): Linha[] {
  const ativas = s.ajudasCusto.filter((a) => a.ativa !== false);
  const saldo = saldoDoPaciente(s.paciente.cpf);
  return ativas.map((a: AjudaCustoMock) => {
    const r = gerador(hash(a.id));
    const tipo = a.tipoCalculo ?? 'padrao';
    const referencia = a.ajudaReferenciaId ? s.ajudasCusto.find((x) => x.id === a.ajudaReferenciaId) : undefined;
    const calc = calcularAjudaCustoTipo({
      tipoCalculo: tipo,
      dataInicio: a.dataInicio,
      dataFim: a.dataFim,
      valorDiariaFinal: a.valorDiariaFinal,
      pernoiteRetorno: a.pernoiteRetorno,
      ajudaReferencia: referencia,
    });

    let ajusteDias: number | null = null;
    let ajusteValor: number | null = null;
    if (referencia && (tipo === 'aditiva' || tipo === 'subtrativa')) {
      const ref = calcularAjudaCustoTipo({
        tipoCalculo: 'padrao',
        dataInicio: referencia.dataInicio,
        dataFim: referencia.dataFim,
        pernoiteRetorno: referencia.pernoiteRetorno,
      });
      ajusteDias = calc.dias - ref.dias;
      ajusteValor = tipo === 'subtrativa' ? -(calc.diferencaGerada ?? 0) : calc.valor;
    }

    const dataCadastro = somarDias(a.dataInicio, -inteiro(r, 1, 9));
    const pago = r() < 0.75;
    const dataPagamento = pago ? menor(somarDias(dataCadastro, inteiro(r, 3, 12)), hojeISO()) : null;
    const pessoaTipo = a.beneficiarioTipo === 'acompanhante' ? 'Acompanhante' : 'Paciente';

    return {
      ...base,
      id: a.id,
      pessoaTipo,
      pessoa: pessoaTipo === 'Acompanhante' ? nomeAcompanhante(s, a.beneficiarioId) : s.paciente.nome,
      tipoAjuda: TIPO_CALCULO_AJUDA_LABEL[tipo] ?? tipo,
      diarias: calc.dias,
      dataInicio: a.dataInicio.slice(0, 10),
      dataFim: a.dataFim.slice(0, 10),
      dataCadastro,
      dataPagamento,
      situacaoPagamento: pago ? 'Pago' : 'Aguardando pagamento',
      valorCalculado: calc.valor,
      valorPago: pago ? calc.valor : null,
      ajusteDias,
      ajusteValor,
      saldoPaciente: Math.round(saldo * 100) / 100,
      pernoite: a.pernoiteRetorno ? 'Sim' : 'Não',
    };
  });
}

function montarRegulacao(s: SolicitacaoMock, base: Linha): Linha[] {
  return s.pareceres.map((p) => ({
    ...base,
    id: p.id,
    dataParecer: p.data.slice(0, 10),
    dataLaudo: s.dataLaudo ? s.dataLaudo.slice(0, 10) : null,
    decisao: p.decisao === 'deferido' ? 'Deferido' : 'Indeferido',
    tipoParecer: p.tipo ? TIPO_PARECER_LABEL[p.tipo] ?? p.tipo : 'Não informado',
    cidPrincipal: p.cidPrincipal ? `${p.cidPrincipal}${p.cidPrincipalNome ? ` · ${p.cidPrincipalNome}` : ''}` : 'Sem CID',
    cidSecundario: p.cidSecundario ? `${p.cidSecundario}${p.cidSecundarioNome ? ` · ${p.cidSecundarioNome}` : ''}` : 'Sem CID secundário',
    medico: p.medico,
  }));
}

function montarAgendamentos(s: SolicitacaoMock, base: Linha): Linha[] {
  return (s.agendamento?.tentativas ?? [])
    .filter((t) => t.desfecho === 'agendamento_confirmado')
    .map((t) => ({
      ...base,
      id: t.id,
      tipoProcedimento: t.tipoProcedimento ? TIPO_PROCEDIMENTO_LABEL[t.tipoProcedimento] ?? t.tipoProcedimento : 'Não informado',
      dataAgendamento: (t.dataAgendamento ?? t.data).slice(0, 10),
      dataRegistro: t.data.slice(0, 10),
      unidadeAgendamento: t.unidade,
    }));
}

/**
 * Histórico de tramitação. O protótipo guarda só a última tramitação, então a
 * passagem pelos setores anteriores ao atual é reconstruída em ordem, com
 * datas entre a abertura e hoje (ou o encerramento). Complemento de
 * demonstração: no sistema real isso vem do log de movimentações.
 */
function montarTramitacao(s: SolicitacaoMock, base: Linha): Linha[] {
  const r = gerador(hash(`${s.id}:tram`));
  const idxAtual = s.encerramento
    ? SETORES.length - 1
    : Math.max(0, SETORES.findIndex((x) => x.status === s.status));
  const limite = s.encerramento?.data?.slice(0, 10) ?? hojeISO();
  let entrada = s.dataCriacao.slice(0, 10);
  const linhas: Linha[] = [];
  for (let i = 0; i <= idxAtual; i++) {
    const setor = SETORES[i].label;
    const ultimo = i === idxAtual;
    const saidaPrevista = somarDias(entrada, inteiro(r, 2, 14));
    const saida = ultimo ? (s.encerramento ? limite : null) : menor(saidaPrevista, limite);
    const responsavel =
      ultimo && !s.encerramento && s.responsaveisAtuais?.[0]?.nome
        ? s.responsaveisAtuais[0].nome
        : escolher(r, RESPONSAVEIS_POR_SETOR[setor]);
    linhas.push({
      ...base,
      id: `${s.id}:${i}`,
      setor,
      dataEntrada: entrada,
      dataSaida: saida,
      responsavelSetor: responsavel,
      situacaoSetor: saida ? 'Já saiu do setor' : 'Ainda está no setor',
    });
    if (saida) entrada = saida;
  }
  return linhas;
}

/* ── Registros de demonstração ───────────────────────────────────────────── */

const NOMES = ['Maria', 'José', 'Ana', 'Francisco', 'Antônia', 'João', 'Raimunda', 'Pedro', 'Francisca', 'Luiz', 'Joana', 'Carlos', 'Rosa', 'Paulo', 'Luzia', 'Sebastião', 'Márcia', 'Raimundo', 'Helena', 'Benedito'];
const SOBRENOMES = ['Silva', 'Sousa', 'Costa', 'Pereira', 'Ferreira', 'Almeida', 'Carvalho', 'Ribeiro', 'Araújo', 'Lima', 'Gomes', 'Nascimento', 'Rocha', 'Barros', 'Mendes'];
const MUNICIPIOS = ['São Luís', 'Imperatriz', 'Caxias', 'Timon', 'Codó', 'Bacabal', 'Santa Inês', 'Pinheiro', 'Balsas', 'Chapadinha', 'Açailândia', 'Barra do Corda', 'Pedreiras', 'Rosário', 'Zé Doca'];
const DESTINOS: { cidade: string; uf: string; unidade: string; modal: 'aereo' | 'terrestre' }[] = [
  { cidade: 'São Paulo', uf: 'SP', unidade: 'Hospital A.C. Camargo Cancer Center', modal: 'aereo' },
  { cidade: 'São Paulo', uf: 'SP', unidade: 'Hospital das Clínicas da FMUSP', modal: 'aereo' },
  { cidade: 'Barretos', uf: 'SP', unidade: 'Hospital de Amor de Barretos', modal: 'aereo' },
  { cidade: 'Brasília', uf: 'DF', unidade: 'Rede Sarah Brasília', modal: 'aereo' },
  { cidade: 'Recife', uf: 'PE', unidade: 'IMIP Recife', modal: 'aereo' },
  { cidade: 'Rio de Janeiro', uf: 'RJ', unidade: 'Instituto Nacional de Câncer (INCA)', modal: 'aereo' },
  { cidade: 'Teresina', uf: 'PI', unidade: 'Hospital Universitário do Piauí', modal: 'terrestre' },
  { cidade: 'Fortaleza', uf: 'CE', unidade: 'Hospital Infantil Albert Sabin', modal: 'terrestre' },
];
const CIDS = [
  ['C50', 'Neoplasia maligna da mama'], ['C61', 'Neoplasia maligna da próstata'], ['C91', 'Leucemia linfoide'],
  ['Q21', 'Malformação congênita dos septos cardíacos'], ['N18', 'Doença renal crônica'], ['G40', 'Epilepsia'],
  ['I25', 'Doença isquêmica crônica do coração'], ['H33', 'Descolamento da retina'],
];
const UNIDADES_ORIGEM = ['Hospital Universitário da UFMA', 'Hospital Carlos Macieira', 'Hospital Regional de Imperatriz', 'Hospital Macrorregional de Caxias', 'Instituto Maranhense de Oncologia Aldenora Bello'];
const STATUS_ABERTOS: StatusGlobalV2[] = ['em_dados_basicos', 'em_regulacao', 'em_passagens', 'em_ajuda_custo', 'em_acompanhamento'];
const MOTIVOS = ['alta_medica', 'alta_medica', 'alta_medica', 'transferencia', 'desistencia', 'obito'];

/** Gera solicitações de demonstração entre setembro de 2025 e hoje, com a
 *  mesma estrutura do protótipo, para que todos os assuntos tenham volume. */
function gerarDemonstracao(qtd: number): SolicitacaoMock[] {
  const r = gerador(20260917);
  const pacientes: SolicitacaoMock['paciente'][] = [];
  const lista: SolicitacaoMock[] = [];
  const inicioBase = new Date('2025-09-01T12:00:00').getTime();
  const hoje = new Date(`${hojeISO()}T12:00:00`).getTime();

  for (let i = 0; i < qtd; i++) {
    const abertura = new Date(inicioBase + r() * (hoje - inicioBase)).toISOString().slice(0, 10);
    const recorrente = pacientes.length > 8 && r() < 0.22;
    const municipio = escolher(r, MUNICIPIOS);
    const paciente = recorrente
      ? escolher(r, pacientes)
      : {
          id: `demo-p-${i}`,
          nome: `${escolher(r, NOMES)} ${escolher(r, SOBRENOMES)} ${escolher(r, SOBRENOMES)}`,
          cpf: `900.${String(100 + i).padStart(3, '0')}.${inteiro(r, 100, 999)}-${inteiro(r, 10, 99)}`,
          dataNascimento: `${inteiro(r, 1945, 2018)}-0${inteiro(r, 1, 9)}-1${inteiro(r, 0, 9)}`,
          sexo: r() < 0.5 ? 'F' : 'M',
          telefone: '(98) 90000-0000',
          municipio: `${municipio} - MA`,
          regional: '',
          zonaRegional: 'Centro',
          endereco: { logradouro: '', numero: '', bairro: '', cep: '' },
        } as SolicitacaoMock['paciente'];
    if (!recorrente) pacientes.push(paciente);

    const destino = escolher(r, DESTINOS);
    const cid = escolher(r, CIDS);
    const encerrada = abertura < '2026-06-15' && r() < 0.55;
    const motivo = encerrada ? escolher(r, MOTIVOS) : undefined;
    const temAcomp = r() < 0.45;
    const id = `demo-s-${i}`;
    const dataAg = somarDias(abertura, inteiro(r, 12, 40));

    const viagens: ViagemMock[] = [];
    const ajudas: AjudaCustoMock[] = [];
    const vaiViajar = r() < 0.8;
    if (vaiViajar) {
      const beneficiarios: Array<'paciente' | 'acompanhante'> = temAcomp ? ['paciente', 'acompanhante'] : ['paciente'];
      beneficiarios.forEach((b, bi) => {
        const ida = somarDias(dataAg, -inteiro(r, 1, 3));
        const volta = somarDias(dataAg, inteiro(r, 3, 12));
        const total = destino.modal === 'aereo' ? inteiro(r, 1100, 2900) : inteiro(r, 180, 520);
        const formato = r();
        const baseV = { origem: `${municipio} - MA`, destino: `${destino.cidade} - ${destino.uf}`, modal: destino.modal, status: 'confirmada', beneficiarioTipo: b, beneficiarioId: b === 'acompanhante' ? `${id}-a` : undefined, dataCriacao: somarDias(ida, -inteiro(r, 8, 20)) } as const;
        if (formato < 0.7) {
          viagens.push({ ...baseV, id: `${id}-v${bi}i`, tipo: 'ida', data: ida, valor: Math.round(total / 2) } as ViagemMock);
          viagens.push({ ...baseV, id: `${id}-v${bi}v`, tipo: 'volta', data: volta, valor: total - Math.round(total / 2) } as ViagemMock);
        } else if (formato < 0.85) {
          viagens.push({ ...baseV, id: `${id}-v${bi}i`, tipo: 'ida', data: ida, valor: Math.round(total * 0.55) } as ViagemMock);
        } else {
          viagens.push({ ...baseV, id: `${id}-v${bi}v`, tipo: 'volta', data: volta, valor: Math.round(total * 0.55) } as ViagemMock);
        }
        if (b === 'paciente' && destino.modal === 'aereo' && r() < 0.3) {
          viagens.push({ ...baseV, id: `${id}-t${bi}`, modal: 'transfer', tipo: 'transfer', data: ida, valor: inteiro(r, 60, 140) } as ViagemMock);
        }
        const aj: AjudaCustoMock = {
          id: `${id}-a${bi}`, beneficiarioTipo: b, beneficiarioId: baseV.beneficiarioId,
          dataInicio: ida, dataFim: volta, status: 'emitido', pernoiteRetorno: r() < 0.35, tipoCalculo: 'padrao',
        };
        ajudas.push(aj);
        if (b === 'paciente' && r() < 0.18) {
          const aditiva = r() < 0.6;
          ajudas.push({
            id: `${id}-a${bi}x`, beneficiarioTipo: b, dataInicio: ida,
            dataFim: somarDias(volta, aditiva ? inteiro(r, 1, 4) : -inteiro(r, 1, 3)),
            status: 'emitido', tipoCalculo: aditiva ? 'aditiva' : 'subtrativa', ajudaReferenciaId: aj.id,
          });
        }
      });
    }

    lista.push({
      id,
      numero: `TFD-${abertura.slice(0, 4)}/D${String(i + 1).padStart(4, '0')}`,
      status: encerrada ? 'em_encerramento' : escolher(r, STATUS_ABERTOS),
      tipoSolicitacao: vaiViajar ? 'normal' : 'ajuda_custo',
      dataCriacao: abertura,
      dataLaudo: somarDias(abertura, -inteiro(r, 5, 60)),
      laudoOrigemUnidade: escolher(r, UNIDADES_ORIGEM),
      paciente,
      acompanhantes: temAcomp ? [{ id: `${id}-a`, nome: `${escolher(r, NOMES)} ${escolher(r, SOBRENOMES)}`, cpf: '', dataNascimento: '', vinculo: 'Familiar' }] : [],
      anexos: [],
      pareceres: [{
        id: `${id}-par`, data: somarDias(abertura, inteiro(r, 2, 10)), decisao: r() < 0.88 ? 'deferido' : 'indeferido',
        tipo: 'tfd_completo', cidPrincipal: cid[0], cidPrincipalNome: cid[1], medico: escolher(r, ['Dr. Carlos Mendes', 'Dra. Lúcia Prado']),
      }],
      carimboRegulacao: escolher(r, ['CNRAC', 'CET', 'AGENDAMENTO', 'APROVADO_DIRETO']),
      agendamento: {
        id: `${id}-ag`, origem: 'criacao',
        tentativas: [{ id: `${id}-t`, unidade: destino.unidade, data: somarDias(abertura, inteiro(r, 3, 12)), desfecho: 'agendamento_confirmado', dataAgendamento: dataAg, tipoProcedimento: escolher(r, ['consulta', 'exame', 'cirurgia', 'tratamento_continuo']) }],
      },
      viagens,
      ajudasCusto: ajudas,
      adicionais: [],
      despesasFunerarias: motivo === 'obito' ? [{ id: `${id}-f`, descricao: 'Translado funerário', valor: inteiro(r, 2800, 7500), data: somarDias(abertura, 45) }] : [],
      encerramento: encerrada ? { data: menor(somarDias(abertura, inteiro(r, 30, 110)), hojeISO()), motivo: motivo! } : undefined,
      observacoes: [],
    } as unknown as SolicitacaoMock);
  }
  return lista;
}

/* ── Montagem ────────────────────────────────────────────────────────────── */

const QTD_DEMONSTRACAO = 180;

export function montarBase(solicitacoesProtocolo: SolicitacaoMock[]): BaseRelatorios {
  const demo = gerarDemonstracao(QTD_DEMONSTRACAO);
  const todas: Array<{ s: SolicitacaoMock; demo: boolean }> = [
    ...solicitacoesProtocolo.map((s) => ({ s, demo: false })),
    ...demo.map((s) => ({ s, demo: true })),
  ];

  const base: BaseRelatorios = {
    passagens: [], ajudas: [], solicitacoes: [], regulacao: [], agendamentos: [], tramitacao: [], obitos: [],
    totalDemonstracao: demo.length,
    totalProtocolo: solicitacoesProtocolo.length,
  };

  for (const { s, demo: ehDemo } of todas) {
    const dim = dimensoes(s, ehDemo);
    const r = gerador(hash(`${s.id}:sol`));
    const passagens = montarPassagens(s, dim);
    if (passagens[0]) dim.cidadeDestino = passagens[0].cidadeDestino;

    const valorObito = s.despesasFunerarias.reduce((acc, d) => acc + d.valor, 0);
    base.solicitacoes.push({
      ...dim,
      id: s.id,
      dataAbertura: s.dataCriacao.slice(0, 10),
      dataEncerramento: s.encerramento?.data?.slice(0, 10) ?? null,
      motivoEncerramento: s.encerramento ? motivoLabel(s.encerramento.motivo) : 'Em andamento',
      criadoPor: escolher(r, ATENDENTES),
      qtdPassagens: passagens.reduce((acc, p) => acc + Number(p.bilhetes ?? 0), 0),
      processos: 1,
    });

    base.passagens.push(...passagens);
    base.ajudas.push(...montarAjudas(s, dim));
    base.regulacao.push(...montarRegulacao(s, dim));
    base.agendamentos.push(...montarAgendamentos(s, dim));
    base.tramitacao.push(...montarTramitacao(s, dim));

    if (s.encerramento && ehObito(s.encerramento.motivo)) {
      base.obitos.push({
        ...dim,
        id: `${s.id}:obito`,
        dataObito: s.encerramento.data.slice(0, 10),
        dataAbertura: s.dataCriacao.slice(0, 10),
        valorObito: valorObito > 0 ? valorObito : null,
        obitos: 1,
      });
    }
  }
  return base;
}

/**
 * Pontos em que o protótipo diverge das regras do prompt. Exibidos na tela
 * para quem valida e registrados na documentação.
 */
export const DIVERGENCIAS: string[] = [
  'Ida e volta: no protótipo a passagem de ida e volta é gravada como dois registros com o valor dividido. O relatório junta os dois em um único bilhete com o valor total. No sistema real, confirmar se o bilhete já é um registro único.',
  'Data de emissão da passagem: o protótipo não separa a data de emissão pela agência da data de cadastro. A data de emissão é complemento de demonstração.',
  'Ajuda de custo: data de cadastro, data de pagamento e valor pago não existem no protótipo e são complemento de demonstração. Valor e diárias vêm do cálculo real do sistema.',
  'Tramitação: o protótipo guarda só a última tramitação. A passagem pelos setores anteriores é reconstruída para demonstração.',
  'Macrorregião: usa a "região" do paciente já usada nos filtros das filas. Confirmar se corresponde à macrorregião oficial do cadastro de Regionais.',
  'SIGTAP: o relatório usa sempre o valor vigente da tabela. Não está confirmado se existe snapshot da tabela no encerramento da solicitação.',
  'Valor SIGTAP de ida e volta: considerado um deslocamento por trecho (ida e volta = 2 trechos). Confirmar a regra de faturamento.',
  'Quem criou a solicitação e a revisão da enfermagem não existem no protótipo; o criador é complemento de demonstração e a revisão ficou fora.',
];
