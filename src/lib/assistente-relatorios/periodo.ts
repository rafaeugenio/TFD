import 'server-only';

/**
 * Período interpretado. A IA só diz QUAL período o usuário pediu (um atalho,
 * um mês, um ano ou datas explícitas); as datas são calculadas aqui, com o
 * dia de hoje em Brasília, para não depender de conta feita por modelo.
 */

export const PRESETS = [
  'hoje', 'ultimos_7_dias', 'ultimos_30_dias', 'este_mes', 'mes_passado',
  'ultimos_3_meses', 'ultimos_6_meses', 'ultimos_12_meses', 'este_trimestre', 'trimestre_passado',
  'este_ano', 'ano_passado',
] as const;
export type Preset = (typeof PRESETS)[number];

export type PeriodoPedido =
  | { tipo: 'preset'; preset: Preset }
  | { tipo: 'mes'; mes: number; ano: number }
  | { tipo: 'ano'; ano: number }
  | { tipo: 'intervalo'; inicio: string; fim: string }
  | { tipo: 'nao_informado' };

export interface PeriodoResolvido {
  inicio: string; // AAAA-MM-DD, inclusivo
  fim: string;    // AAAA-MM-DD, inclusivo
  descricao: string;
}

/** Maior janela aceita numa pergunta (limite de volume e de tempo). */
export const MAX_MESES = 24;
const ANO_MINIMO = 2020;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (a: number, m: number, d: number) => `${a}-${pad(m)}-${pad(d)}`;
const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

/** Hoje no fuso de Brasília, como {ano, mes (1-12), dia}. */
export function hojeBrasilia(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora).split('-');
  return { ano: Number(partes[0]), mes: Number(partes[1]), dia: Number(partes[2]) };
}

function somarDias(a: number, m: number, d: number, dias: number) {
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Primeiro dia do mês deslocado em `delta` meses a partir de (a, m). */
function mesDeslocado(a: number, m: number, delta: number) {
  const dt = new Date(Date.UTC(a, m - 1 + delta, 1));
  return { ano: dt.getUTCFullYear(), mes: dt.getUTCMonth() + 1 };
}

const dataValida = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= ultimoDia(a, m);
};

const dataBR = (s: string) => s.split('-').reverse().join('/');

export function resolverPeriodo(p: PeriodoPedido, agora = new Date()): { ok: true; periodo: PeriodoResolvido } | { ok: false; motivo: string } {
  const h = hojeBrasilia(agora);
  const hoje = iso(h.ano, h.mes, h.dia);
  let r: PeriodoResolvido;

  switch (p.tipo) {
    case 'nao_informado':
      return { ok: false, motivo: 'periodo_ausente' };
    case 'preset': {
      const mes = (delta: number) => mesDeslocado(h.ano, h.mes, delta);
      const trimIni = Math.floor((h.mes - 1) / 3) * 3 + 1;
      switch (p.preset) {
        case 'hoje': r = { inicio: hoje, fim: hoje, descricao: 'Hoje' }; break;
        case 'ultimos_7_dias': r = { inicio: somarDias(h.ano, h.mes, h.dia, -6), fim: hoje, descricao: 'Últimos 7 dias' }; break;
        case 'ultimos_30_dias': r = { inicio: somarDias(h.ano, h.mes, h.dia, -29), fim: hoje, descricao: 'Últimos 30 dias' }; break;
        case 'este_mes': r = { inicio: iso(h.ano, h.mes, 1), fim: hoje, descricao: `Este mês (${MESES[h.mes - 1]}/${h.ano})` }; break;
        case 'mes_passado': { const m = mes(-1); r = { inicio: iso(m.ano, m.mes, 1), fim: iso(m.ano, m.mes, ultimoDia(m.ano, m.mes)), descricao: `Mês passado (${MESES[m.mes - 1]}/${m.ano})` }; break; }
        case 'ultimos_3_meses':
        case 'ultimos_6_meses':
        case 'ultimos_12_meses': {
          // Meses fechados anteriores ao atual, como no exemplo do contrato
          // (em outubro, "últimos 3 meses" = julho a setembro).
          const n = p.preset === 'ultimos_3_meses' ? 3 : p.preset === 'ultimos_6_meses' ? 6 : 12;
          const ini = mes(-n); const fim = mes(-1);
          r = { inicio: iso(ini.ano, ini.mes, 1), fim: iso(fim.ano, fim.mes, ultimoDia(fim.ano, fim.mes)), descricao: `Últimos ${n} meses fechados` };
          break;
        }
        case 'este_trimestre': r = { inicio: iso(h.ano, trimIni, 1), fim: hoje, descricao: `Este trimestre (${Math.ceil(h.mes / 3)}º de ${h.ano})` }; break;
        case 'trimestre_passado': {
          const ini = mesDeslocado(h.ano, trimIni, -3); const fim = mesDeslocado(h.ano, trimIni, -1);
          r = { inicio: iso(ini.ano, ini.mes, 1), fim: iso(fim.ano, fim.mes, ultimoDia(fim.ano, fim.mes)), descricao: `Trimestre passado (${Math.ceil(ini.mes / 3)}º de ${ini.ano})` };
          break;
        }
        case 'este_ano': r = { inicio: iso(h.ano, 1, 1), fim: hoje, descricao: `Este ano (${h.ano})` }; break;
        case 'ano_passado': r = { inicio: iso(h.ano - 1, 1, 1), fim: iso(h.ano - 1, 12, 31), descricao: `Ano passado (${h.ano - 1})` }; break;
      }
      break;
    }
    case 'mes':
      if (!Number.isInteger(p.mes) || p.mes < 1 || p.mes > 12 || !Number.isInteger(p.ano)) return { ok: false, motivo: 'periodo_invalido' };
      r = { inicio: iso(p.ano, p.mes, 1), fim: iso(p.ano, p.mes, ultimoDia(p.ano, p.mes)), descricao: `${MESES[p.mes - 1][0].toUpperCase()}${MESES[p.mes - 1].slice(1)}/${p.ano}` };
      break;
    case 'ano':
      if (!Number.isInteger(p.ano)) return { ok: false, motivo: 'periodo_invalido' };
      r = { inicio: iso(p.ano, 1, 1), fim: iso(p.ano, 12, 31), descricao: `Ano de ${p.ano}` };
      break;
    case 'intervalo':
      if (!dataValida(p.inicio) || !dataValida(p.fim) || p.inicio > p.fim) return { ok: false, motivo: 'periodo_invalido' };
      r = { inicio: p.inicio, fim: p.fim, descricao: `De ${dataBR(p.inicio)} a ${dataBR(p.fim)}` };
      break;
  }

  // Não olha para o futuro além de hoje e não aceita janela grande demais.
  if (r.inicio > hoje) return { ok: false, motivo: 'periodo_futuro' };
  if (r.fim > hoje) r = { ...r, fim: hoje };
  if (Number(r.inicio.slice(0, 4)) < ANO_MINIMO) return { ok: false, motivo: 'periodo_invalido' };
  const [ai, mi] = r.inicio.split('-').map(Number);
  const [af, mf] = r.fim.split('-').map(Number);
  if ((af - ai) * 12 + (mf - mi) + 1 > MAX_MESES) return { ok: false, motivo: 'periodo_longo' };
  return { ok: true, periodo: r };
}
