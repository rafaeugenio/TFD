import 'server-only';

/**
 * Período interpretado. A IA só diz QUAL período o usuário pediu (um atalho,
 * um mês, um ano ou datas explícitas); as datas são calculadas aqui, com o
 * dia de hoje em Brasília, para não depender de conta feita por modelo.
 */

export const PRESETS = [
  'hoje', 'esta_semana', 'semana_passada', 'ultimos_7_dias', 'ultimos_30_dias', 'este_mes', 'mes_passado',
  'ultimos_3_meses', 'ultimos_6_meses', 'ultimos_12_meses', 'este_trimestre', 'trimestre_passado',
  'este_ano', 'ano_passado', 'todo_periodo',
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
      // Sem período na pergunta: considera todo o histórico (e a resposta mostra isso).
      return resolverPeriodo({ tipo: 'preset', preset: 'todo_periodo' }, agora);
    case 'preset': {
      const mes = (delta: number) => mesDeslocado(h.ano, h.mes, delta);
      const trimIni = Math.floor((h.mes - 1) / 3) * 3 + 1;
      switch (p.preset) {
        case 'hoje': r = { inicio: hoje, fim: hoje, descricao: 'Hoje' }; break;
        case 'esta_semana': case 'semana_passada': {
          // Semana de segunda a domingo.
          const dow = (new Date(Date.UTC(h.ano, h.mes - 1, h.dia)).getUTCDay() + 6) % 7;
          const seg = somarDias(h.ano, h.mes, h.dia, -dow - (p.preset === 'semana_passada' ? 7 : 0));
          const [sa, sm, sd] = seg.split('-').map(Number);
          r = p.preset === 'esta_semana'
            ? { inicio: seg, fim: hoje, descricao: 'Esta semana' }
            : { inicio: seg, fim: somarDias(sa, sm, sd, 6), descricao: 'Semana passada' };
          break;
        }
        case 'todo_periodo':
          // Todo o histórico: não entra no limite de meses (o volume é limitado na consulta).
          return { ok: true, periodo: { inicio: `${ANO_MINIMO}-01-01`, fim: hoje, descricao: 'Todo o período' } };
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

/**
 * Leitura do período por regras simples, usada só quando o Gemini não
 * responde (limite da faixa gratuita ou indisponibilidade). Cobre os
 * períodos mais comuns; o resto vira "não informado" e a tela pergunta.
 */
export function periodoPorTexto(texto: string, agora = new Date()): PeriodoPedido {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const h = hojeBrasilia(agora);
  const n = t.match(/ultim[oa]s\s+(\d{1,2})\s+mes/);
  if (n) {
    const q = Number(n[1]);
    if (q === 3 || q === 6 || q === 12) return { tipo: 'preset', preset: `ultimos_${q}_meses` as Preset };
  }
  if (/semana passada|semana anterior/.test(t)) return { tipo: 'preset', preset: 'semana_passada' };
  if (/(essa|esta|nessa|nesta) semana|semana atual/.test(t)) return { tipo: 'preset', preset: 'esta_semana' };
  if (/ultimos\s+7\s+dias|ultima semana/.test(t)) return { tipo: 'preset', preset: 'ultimos_7_dias' };
  if (/no total|desde (o inicio|sempre|que comecou)|todo o (periodo|historico)|de todos os tempos|ja (foi|feit|emitid|registrad)|historico completo/.test(t)) return { tipo: 'preset', preset: 'todo_periodo' };
  if (/ultimos\s+30\s+dias/.test(t)) return { tipo: 'preset', preset: 'ultimos_30_dias' };
  if (/\bhoje\b/.test(t)) return { tipo: 'preset', preset: 'hoje' };
  if (/mes passado|ultimo mes|mes anterior/.test(t)) return { tipo: 'preset', preset: 'mes_passado' };
  if (/(este|neste|esse|nesse) mes|mes atual|\b(do|no|deste|desse) mes\b/.test(t)) return { tipo: 'preset', preset: 'este_mes' };
  if (/trimestre passado|ultimo trimestre/.test(t)) return { tipo: 'preset', preset: 'trimestre_passado' };
  if (/(este|neste) trimestre/.test(t)) return { tipo: 'preset', preset: 'este_trimestre' };
  if (/ano passado|ultimo ano/.test(t)) return { tipo: 'preset', preset: 'ano_passado' };
  if (/(este|neste|esse|nesse) ano|ano atual|\b(do|no|deste|desse) ano\b|anual/.test(t)) return { tipo: 'preset', preset: 'este_ano' };
  const nomes = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const mi = nomes.findIndex((m) => new RegExp(`\\b${m}\\b`).test(t));
  const ano = t.match(/\b(20\d{2})\b/);
  if (mi >= 0) {
    const mes = mi + 1;
    return { tipo: 'mes', mes, ano: ano ? Number(ano[1]) : mes <= h.mes ? h.ano : h.ano - 1 };
  }
  if (ano) return { tipo: 'ano', ano: Number(ano[1]) };
  return { tipo: 'nao_informado' };
}
