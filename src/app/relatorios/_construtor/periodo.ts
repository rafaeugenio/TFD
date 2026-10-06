/* -------------------------------------------------------------------------- */
/*  Período do relatório                                                      */
/*                                                                            */
/*  Quadrimestres do ano civil: 1º = janeiro a abril, 2º = maio a agosto,      */
/*  3º = setembro a dezembro.                                                 */
/* -------------------------------------------------------------------------- */

import type { Periodo, PeriodoTipo } from './tipos';

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const ATALHOS_PERIODO: { tipo: PeriodoTipo; label: string }[] = [
  { tipo: 'hoje', label: 'Hoje' },
  { tipo: 'ultimos_7_dias', label: 'Últimos 7 dias' },
  { tipo: 'ultimos_30_dias', label: 'Últimos 30 dias' },
  { tipo: 'este_mes', label: 'Este mês' },
  { tipo: 'mes_passado', label: 'Mês passado' },
  { tipo: 'este_quadrimestre', label: 'Este quadrimestre' },
  { tipo: 'quadrimestre_passado', label: 'Quadrimestre passado' },
  { tipo: 'este_ano', label: 'Este ano' },
];

export const FORMAS_PERIODO: { tipo: PeriodoTipo; label: string }[] = [
  { tipo: 'mes', label: 'Um mês' },
  { tipo: 'quadrimestre', label: 'Um quadrimestre' },
  { tipo: 'ano', label: 'Um ano inteiro' },
  { tipo: 'personalizado', label: 'Datas que eu escolher' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (a: number, m: number, d: number) => `${a}-${pad(m)}-${pad(d)}`;
const ultimoDia = (a: number, m: number) => new Date(a, m, 0).getDate();

export function quadrimestreDoMes(mes: number): 1 | 2 | 3 {
  return mes <= 4 ? 1 : mes <= 8 ? 2 : 3;
}

export function dataBR(isoData: string | null | undefined): string {
  if (!isoData) return '';
  const [a, m, d] = isoData.slice(0, 10).split('-');
  if (!a || !m || !d) return isoData;
  return `${d}/${m}/${a}`;
}

export interface PeriodoResolvido {
  inicio: string;
  fim: string;
  /** Rótulo curto ("Agosto de 2026", "2º quadrimestre de 2026"). */
  rotulo: string;
}

/** Transforma a escolha do usuário em datas concretas. Atalhos relativos
 *  ("Mês passado") são resolvidos na hora em que o relatório é aberto, então
 *  um relatório salvo com "Mês passado" continua útil no mês seguinte. */
export function resolverPeriodo(p: Periodo, hoje = new Date()): PeriodoResolvido {
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const deMes = (a: number, m: number): PeriodoResolvido => ({
    inicio: iso(a, m, 1),
    fim: iso(a, m, ultimoDia(a, m)),
    rotulo: `${MESES[m - 1]} de ${a}`,
  });
  const deQuad = (a: number, q: 1 | 2 | 3): PeriodoResolvido => {
    const mi = (q - 1) * 4 + 1;
    const mf = mi + 3;
    return {
      inicio: iso(a, mi, 1),
      fim: iso(a, mf, ultimoDia(a, mf)),
      rotulo: `${q}º quadrimestre de ${a} (${MESES[mi - 1].toLowerCase()} a ${MESES[mf - 1].toLowerCase()})`,
    };
  };
  const deAno = (a: number): PeriodoResolvido => ({
    inicio: iso(a, 1, 1),
    fim: iso(a, 12, 31),
    rotulo: `Ano de ${a}`,
  });

  const dia = (d: Date) => iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const recuar = (dias: number) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dias);

  switch (p.tipo) {
    case 'hoje':
      return { inicio: dia(hoje), fim: dia(hoje), rotulo: `Hoje, ${dataBR(dia(hoje))}` };
    case 'ultimos_7_dias':
      return { inicio: dia(recuar(6)), fim: dia(hoje), rotulo: `${dataBR(dia(recuar(6)))} a ${dataBR(dia(hoje))}` };
    case 'ultimos_30_dias':
      return { inicio: dia(recuar(29)), fim: dia(hoje), rotulo: `${dataBR(dia(recuar(29)))} a ${dataBR(dia(hoje))}` };
    case 'este_mes':
      return deMes(anoAtual, mesAtual);
    case 'mes_passado':
      return mesAtual === 1 ? deMes(anoAtual - 1, 12) : deMes(anoAtual, mesAtual - 1);
    case 'este_quadrimestre':
      return deQuad(anoAtual, quadrimestreDoMes(mesAtual));
    case 'quadrimestre_passado': {
      const q = quadrimestreDoMes(mesAtual);
      return q === 1 ? deQuad(anoAtual - 1, 3) : deQuad(anoAtual, (q - 1) as 1 | 2);
    }
    case 'este_ano':
      return deAno(anoAtual);
    case 'mes':
      return deMes(p.ano ?? anoAtual, p.mes ?? mesAtual);
    case 'quadrimestre':
      return deQuad(p.ano ?? anoAtual, p.quadrimestre ?? quadrimestreDoMes(mesAtual));
    case 'ano':
      return deAno(p.ano ?? anoAtual);
    case 'personalizado': {
      const inicio = p.inicio || iso(anoAtual, mesAtual, 1);
      const fim = p.fim || iso(anoAtual, mesAtual, ultimoDia(anoAtual, mesAtual));
      return { inicio, fim, rotulo: `${dataBR(inicio)} a ${dataBR(fim)}` };
    }
    default:
      return deMes(anoAtual, mesAtual);
  }
}

/** Uma data (dia) cai dentro do período. */
export function diaNoPeriodo(data: string | null | undefined, per: PeriodoResolvido): boolean {
  if (!data) return false;
  const d = data.slice(0, 10);
  return d >= per.inicio && d <= per.fim;
}

/** Um intervalo cruza o período. Fim ausente = ainda em aberto (até hoje). */
export function intervaloCruzaPeriodo(
  inicio: string | null | undefined,
  fim: string | null | undefined,
  per: PeriodoResolvido,
): boolean {
  if (!inicio) return false;
  const i = inicio.slice(0, 10);
  const f = (fim ?? '9999-12-31').slice(0, 10);
  return i <= per.fim && f >= per.inicio;
}

/** "AAAA-MM" de uma data, usado no resumo por mês. */
export function mesAno(data: string | null | undefined): string {
  if (!data) return '';
  const [a, m] = data.slice(0, 10).split('-');
  return a && m ? `${MESES[Number(m) - 1]} de ${a}` : '';
}

/** Nome curto do período como foi escolhido. Atalhos continuam relativos
 *  ("Mês passado" muda a cada mês), por isso aparecem pelo nome do atalho. */
export function nomePeriodo(p: Periodo): string {
  const atalho = ATALHOS_PERIODO.find((x) => x.tipo === p.tipo);
  return atalho ? atalho.label : resolverPeriodo(p).rotulo.replace(/ \(.*\)$/, '');
}
