/* -------------------------------------------------------------------------- */
/*  Motor do construtor: aplica período, referência de data, filtros,         */
/*  agrupamento e totais sobre a base. Não conhece a interface.               */
/* -------------------------------------------------------------------------- */

import { ASSUNTOS_ORDEM, assuntoPorId, camposDoAssunto, campoPorId, filtrosDoAssunto } from './assuntos';
import type { BaseRelatorios } from './dataset';
import {
  dataBR, diaNoPeriodo, intervaloCruzaPeriodo, MESES, mesAno, resolverPeriodo, type PeriodoResolvido,
} from './periodo';
import type { Assunto, Campo, ConfigRelatorio, FiltroAplicado, Linha, ReferenciaData } from './tipos';

export interface TotalCalculado {
  id: string;
  label: string;
  ajuda: string;
  valor: number;
  formato: 'numero' | 'moeda';
}

export interface ResultadoRelatorio {
  assunto: Assunto;
  periodo: PeriodoResolvido;
  referencia: ReferenciaData;
  /** Colunas exibidas, na ordem escolhida. */
  colunas: Campo[];
  /** Linhas exibidas (detalhadas ou agrupadas). */
  linhas: Linha[];
  /** Quantidade de registros antes do agrupamento. */
  totalRegistros: number;
  totais: TotalCalculado[];
  agrupado: boolean;
}

/* ── Formatação compartilhada (tela e exportação) ────────────────────────── */

export const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtNumero = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function formatarValor(campo: Campo, valor: Linha[string]): string {
  if (valor === null || valor === undefined || valor === '') return '';
  if (campo.tipo === 'moeda') return fmtMoeda(Number(valor));
  if (campo.tipo === 'numero') return fmtNumero(Number(valor));
  if (campo.tipo === 'data') return dataBR(String(valor));
  return String(valor);
}

/* ── Filtros ─────────────────────────────────────────────────────────────── */

function passaNoFiltro(linha: Linha, filtro: FiltroAplicado, campo: Campo | undefined): boolean {
  if (!campo || filtro.valores.length === 0) return true;
  const v = linha[campo.id];
  if (campo.tipo === 'categoria') return filtro.valores.includes(String(v ?? ''));
  if (campo.tipo === 'texto') {
    const termo = filtro.valores[0]?.trim().toLowerCase();
    return !termo || String(v ?? '').toLowerCase().includes(termo);
  }
  if (campo.tipo === 'numero' || campo.tipo === 'moeda') {
    const [min, max] = filtro.valores;
    const n = Number(v);
    if (v === null || Number.isNaN(n)) return false;
    if (min !== undefined && min !== '' && n < Number(min)) return false;
    if (max !== undefined && max !== '' && n > Number(max)) return false;
    return true;
  }
  return true;
}

function aplicarFiltros(linhas: Linha[], a: Assunto, filtros: FiltroAplicado[]): Linha[] {
  const campos = filtrosDoAssunto(a);
  const ativos = filtros.filter((f) => f.valores.some((x) => x !== ''));
  if (ativos.length === 0) return linhas;
  return linhas.filter((l) => ativos.every((f) => passaNoFiltro(l, f, campos.find((c) => c.id === f.campoId))));
}

/** Opções de um filtro de categoria, com a quantidade de registros de cada
 *  uma. Só aparecem opções que existem no período escolhido e combinadas com
 *  os OUTROS filtros já aplicados, para o usuário nunca escolher uma opção
 *  que levaria a um resultado vazio sem perceber. */
export function opcoesDoFiltro(
  base: BaseRelatorios,
  cfg: ConfigRelatorio,
  campoId: string,
): Array<{ valor: string; quantidade: number }> {
  const a = assuntoPorId(cfg.assunto);
  const per = resolverPeriodo(cfg.periodo);
  const ref = a.datas.find((d) => d.id === cfg.referenciaData) ?? a.datas[0];
  const outros = cfg.filtros.filter((f) => f.campoId !== campoId);

  let origem: Linha[];
  if (a.id === 'financeiro') origem = base.solicitacoes;
  else if (a.id === 'pacientes') origem = base.solicitacoes.filter((l) => noPeriodo(l, ref, per));
  else {
    const todas = base[a.id as keyof Omit<BaseRelatorios, 'totalDemonstracao' | 'totalProtocolo'>] as Linha[];
    origem = todas.filter((l) => noPeriodo(l, ref, per));
  }
  const filtradas = aplicarFiltros(origem, a, outros);

  const contagem = new Map<string, number>();
  for (const l of filtradas) {
    const v = l[campoId];
    if (v === null || v === undefined || v === '') continue;
    contagem.set(String(v), (contagem.get(String(v)) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([valor, quantidade]) => ({ valor, quantidade }))
    .sort((x, y) => x.valor.localeCompare(y.valor, 'pt-BR'));
}

/* ── Período por assunto ─────────────────────────────────────────────────── */

function noPeriodo(l: Linha, ref: ReferenciaData, per: PeriodoResolvido): boolean {
  if (ref.modo === 'intervalo') {
    return intervaloCruzaPeriodo(l[ref.campoInicio] as string, ref.campoFim ? (l[ref.campoFim] as string) : null, per);
  }
  return diaNoPeriodo(l[ref.campoInicio] as string, per);
}

/** Pacientes: um paciente por linha, contado uma vez no período. */
function montarPacientes(base: BaseRelatorios, cfg: ConfigRelatorio, a: Assunto, ref: ReferenciaData, per: PeriodoResolvido): Linha[] {
  const noPer = aplicarFiltros(base.solicitacoes.filter((l) => noPeriodo(l, ref, per)), a, cfg.filtros.filter((f) => f.campoId !== 'qtdSolicitacoes' && f.campoId !== 'primeiraVez'));
  const primeiraAbertura = new Map<string, string>();
  for (const l of base.solicitacoes) {
    const cpf = String(l.pacienteCpf);
    const d = String(l.dataAbertura);
    if (!primeiraAbertura.has(cpf) || d < primeiraAbertura.get(cpf)!) primeiraAbertura.set(cpf, d);
  }
  const porPaciente = new Map<string, Linha[]>();
  for (const l of noPer) {
    const cpf = String(l.pacienteCpf);
    porPaciente.set(cpf, [...(porPaciente.get(cpf) ?? []), l]);
  }
  const linhas = [...porPaciente.entries()].map(([cpf, lista]) => {
    const ordenadas = [...lista].sort((x, y) => String(x.dataAbertura).localeCompare(String(y.dataAbertura)));
    const recente = ordenadas[ordenadas.length - 1];
    // Recorrente = já tinha OUTRA solicitação antes da mais antiga que entrou
    // no período. Uma solicitação aberta em março que continua em maio é a
    // mesma, então o paciente segue como primeira vez.
    // PENDÊNCIA DE REGRA: confirmar com a gestão se "primeira vez" é por
    // paciente no histórico todo (como aqui) ou por ano.
    const maisAntigaNoPeriodo = String(ordenadas[0].dataAbertura);
    return {
      ...recente,
      id: cpf,
      qtdSolicitacoes: lista.length,
      primeiraVez: (primeiraAbertura.get(cpf) ?? '') < maisAntigaNoPeriodo ? 'Recorrente' : 'Primeira vez',
    } as Linha;
  });
  return aplicarFiltros(linhas, a, cfg.filtros.filter((f) => f.campoId === 'qtdSolicitacoes' || f.campoId === 'primeiraVez'));
}

/** Indicadores financeiros: uma linha por mês, cada indicador pela sua data. */
function montarFinanceiro(base: BaseRelatorios, cfg: ConfigRelatorio, a: Assunto, per: PeriodoResolvido): Linha[] {
  const filtrar = (linhas: Linha[]) => aplicarFiltros(linhas, a, cfg.filtros);
  const solic = filtrar(base.solicitacoes);
  const pass = filtrar(base.passagens);
  const ajud = filtrar(base.ajudas);
  const obit = filtrar(base.obitos);
  const metaMensal = cfg.metaAnualSigtap ? Math.round((cfg.metaAnualSigtap / 12) * 100) / 100 : null;

  const meses: { inicio: string; fim: string; label: string }[] = [];
  const cursor = new Date(`${per.inicio}T12:00:00`);
  cursor.setDate(1);
  while (cursor.toISOString().slice(0, 10) <= per.fim) {
    const a2 = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const ultimo = new Date(a2, m, 0).getDate();
    meses.push({
      inicio: `${a2}-${String(m).padStart(2, '0')}-01`,
      fim: `${a2}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`,
      label: `${MESES[m - 1]} de ${a2}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const somar = (linhas: Linha[], campo: string) =>
    Math.round(linhas.reduce((acc, l) => acc + (Number(l[campo]) || 0), 0) * 100) / 100;

  return meses.map((mes) => {
    const p = { inicio: mes.inicio < per.inicio ? per.inicio : mes.inicio, fim: mes.fim > per.fim ? per.fim : mes.fim, rotulo: mes.label };
    const emitidas = pass.filter((l) => diaNoPeriodo(l.dataEmissao as string, p));
    const lancadas = ajud.filter((l) => diaNoPeriodo(l.dataCadastro as string, p));
    const pagas = ajud.filter((l) => diaNoPeriodo(l.dataPagamento as string, p));
    const obitosMes = obit.filter((l) => diaNoPeriodo(l.dataObito as string, p));
    const procDeslocamento = somar(emitidas, 'qtdProcedimentos');
    const diarias = somar(lancadas, 'diarias');
    const realizados = procDeslocamento + diarias;
    return {
      id: mes.inicio,
      mes: mes.label,
      mesInicio: mes.inicio,
      processos: solic.filter((l) => diaNoPeriodo(l.dataAbertura as string, p)).length,
      obitos: obitosMes.length,
      valorObitos: somar(obitosMes, 'valorObito'),
      bilhetes: somar(emitidas, 'bilhetes'),
      valorRealPassagens: somar(emitidas, 'valorReal'),
      valorSigtapDeslocamento: somar(emitidas, 'valorSigtap'),
      procDeslocamento,
      ajudasLancadas: lancadas.length,
      diarias,
      valorAjudaLancada: somar(lancadas, 'valorCalculado'),
      valorAjudaPaga: somar(pagas, 'valorPago'),
      procRealizados: realizados,
      metaMensal,
      percentualMeta: metaMensal ? Math.round((realizados / metaMensal) * 1000) / 10 : null,
    };
  });
}

/* ── Agrupamento ─────────────────────────────────────────────────────────── */

function agrupar(linhas: Linha[], campo: Campo, colunas: Campo[]): { colunas: Campo[]; linhas: Linha[] } {
  const chaveDe = (l: Linha) => {
    const v = l[campo.id];
    if (v === null || v === '') return 'Não informado';
    return campo.tipo === 'data' ? mesAno(String(v)) : String(v);
  };
  const somaveis = colunas.filter((c) => c.somavel);
  const mapa = new Map<string, Linha[]>();
  for (const l of linhas) mapa.set(chaveDe(l), [...(mapa.get(chaveDe(l)) ?? []), l]);

  const grupoCampo: Campo = { id: '__grupo', label: campo.tipo === 'data' ? `${campo.label} (mês)` : campo.label, tipo: 'texto' };
  const qtdCampo: Campo = { id: '__qtd', label: 'Quantidade de registros', tipo: 'numero', somavel: true };
  const pacCampo: Campo = { id: '__pacientes', label: 'Pacientes únicos', tipo: 'numero' };

  const saida = [...mapa.entries()].map(([k, lista]) => {
    const l: Linha = { id: k, __grupo: k, __qtd: lista.length, __pacientes: new Set(lista.map((x) => x.pacienteCpf)).size };
    for (const s of somaveis) l[s.id] = Math.round(lista.reduce((acc, x) => acc + (Number(x[s.id]) || 0), 0) * 100) / 100;
    return l;
  });
  saida.sort((x, y) => Number(y.__qtd) - Number(x.__qtd));
  return { colunas: [grupoCampo, qtdCampo, pacCampo, ...somaveis], linhas: saida };
}

/* ── Busca ───────────────────────────────────────────────────────────────── */

const normalizar = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Busca livre: mantém a linha se o termo aparece em qualquer coluna escolhida,
 *  do jeito que o usuário lê (datas em dd/mm/aaaa, valores formatados), sem
 *  diferenciar acento nem maiúscula. Roda antes do agrupamento e dos totais,
 *  para os números sempre baterem com o que está na tabela. */
function aplicarBusca(linhas: Linha[], campos: Campo[], termo: string): Linha[] {
  const t = normalizar(termo.trim());
  if (!t) return linhas;
  return linhas.filter((l) => campos.some((c) => normalizar(formatarValor(c, l[c.id])).includes(t)));
}

/* ── Execução ────────────────────────────────────────────────────────────── */

export function executarRelatorio(cfg: ConfigRelatorio, base: BaseRelatorios, busca = ''): ResultadoRelatorio {
  const a = assuntoPorId(cfg.assunto);
  const periodo = resolverPeriodo(cfg.periodo);
  const referencia = a.datas.find((d) => d.id === cfg.referenciaData) ?? a.datas[0];
  const todos = camposDoAssunto(a);
  const colunas = cfg.colunas.map((id) => todos.find((c) => c.id === id)).filter(Boolean) as Campo[];

  let linhas: Linha[];
  if (a.id === 'pacientes') {
    linhas = montarPacientes(base, cfg, a, referencia, periodo);
  } else if (a.id === 'financeiro') {
    linhas = montarFinanceiro(base, cfg, a, periodo);
  } else {
    const origem = base[a.id as keyof Omit<BaseRelatorios, 'totalDemonstracao' | 'totalProtocolo'>] as Linha[];
    linhas = aplicarFiltros(origem.filter((l) => noPeriodo(l, referencia, periodo)), a, cfg.filtros);
  }

  const campoGrupo = cfg.agruparPor && a.id !== 'financeiro' ? campoPorId(a, cfg.agruparPor) : undefined;
  if (busca.trim()) linhas = aplicarBusca(linhas, campoGrupo ? [...colunas, campoGrupo] : colunas, busca);

  if (cfg.ordenarPor) {
    const campo = campoPorId(a, cfg.ordenarPor.campoId);
    const dir = cfg.ordenarPor.direcao === 'asc' ? 1 : -1;
    if (campo) {
      linhas = [...linhas].sort((x, y) => {
        const vx = x[campo.id];
        const vy = y[campo.id];
        if (vx === null || vx === '') return 1;
        if (vy === null || vy === '') return -1;
        if (typeof vx === 'number' && typeof vy === 'number') return (vx - vy) * dir;
        return String(vx).localeCompare(String(vy), 'pt-BR') * dir;
      });
    }
  }

  const totais = a.totais
    .filter((t) => !t.exigeCampo || cfg.colunas.includes(t.exigeCampo))
    .map((t) => ({ id: t.id, label: t.label, ajuda: t.ajuda, formato: t.formato, valor: t.calcular(linhas) }));

  if (campoGrupo) {
    const g = agrupar(linhas, campoGrupo, colunas);
    return { assunto: a, periodo, referencia, colunas: g.colunas, linhas: g.linhas, totalRegistros: linhas.length, totais, agrupado: true };
  }

  return { assunto: a, periodo, referencia, colunas, linhas, totalRegistros: linhas.length, totais, agrupado: false };
}

/** Seções na ordem fixa dos assuntos, com o mesmo período em todas. */
export function ordenarSecoes(secoes: ConfigRelatorio[], ordem: readonly string[]): ConfigRelatorio[] {
  return [...secoes].sort((x, y) => ordem.indexOf(x.assunto) - ordem.indexOf(y.assunto));
}

/** Configuração inicial de um assunto recém-escolhido. */
export function configInicial(assuntoId: Assunto['id']): ConfigRelatorio {
  const a = assuntoPorId(assuntoId);
  return {
    assunto: a.id,
    periodo: { tipo: a.id === 'financeiro' || a.id === 'pacientes' ? 'este_quadrimestre' : 'mes_passado' },
    referenciaData: a.datas[0].id,
    colunas: [...a.colunasPadrao],
    filtros: [],
    agruparPor: '',
    metaAnualSigtap: a.id === 'financeiro' ? 12000 : undefined,
  };
}

/** Alterna um assunto em uma lista de seções, mantendo a ordem fixa e o
 *  mesmo período em todas. Nunca deixa a lista sem assunto. */
export function alternarAssunto(secoes: ConfigRelatorio[], id: Assunto['id']): ConfigRelatorio[] {
  if (secoes.some((s) => s.assunto === id)) return secoes.length > 1 ? secoes.filter((s) => s.assunto !== id) : secoes;
  const periodo = secoes[0]?.periodo ?? configInicial(id).periodo;
  return ordenarSecoes([...secoes, { ...configInicial(id), periodo }], ASSUNTOS_ORDEM);
}

/** Relatório novo: começa com todos os assuntos marcados e o mesmo período;
 *  o usuário desmarca no painel Personalizar o que não precisa. */
export function secoesNovoRelatorio(): ConfigRelatorio[] {
  const periodo = configInicial(ASSUNTOS_ORDEM[0]).periodo;
  return ASSUNTOS_ORDEM.map((id) => ({ ...configInicial(id), periodo }));
}
