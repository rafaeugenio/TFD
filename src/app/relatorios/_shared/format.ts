/* Helpers de formatação compartilhados pelos relatórios. */

export const MES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const MES_LABEL_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export function fmtBRL(v: number | null | undefined): string {
  const n = typeof v === 'number' ? v : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtInt(v: number | null | undefined): string {
  const n = typeof v === 'number' ? v : 0;
  return n.toLocaleString('pt-BR');
}

export function fmtDataBR(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const [y, m, d] = iso.slice(0, 10).split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}

export function anosDisponiveis(): number[] {
  const atual = new Date().getFullYear();
  return [atual + 1, atual, atual - 1, atual - 2, atual - 3];
}

/**
 * Converte valor numérico em extenso PT-BR (R$).
 * Cobre os casos comuns até centenas de milhão — suficiente para o TFD.
 */
export function valorPorExtenso(v: number): string {
  if (!isFinite(v) || v <= 0) return 'Zero reais';
  const reais = Math.floor(v);
  const centavos = Math.round((v - reais) * 100);
  const parteReais = numeroPorExtenso(reais);
  const parteCentavos = centavos > 0 ? ` e ${numeroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}` : '';
  const moeda = reais === 1 ? 'real' : 'reais';
  return `${capitalize(parteReais)} ${moeda}${parteCentavos}`;
}

const UNI = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const ESPECIAIS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function numeroPorExtenso(n: number): string {
  if (n === 0) return 'zero';
  if (n === 100) return 'cem';
  if (n < 10) return UNI[n];
  if (n < 20) return ESPECIAIS[n - 10];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? DEZ[d] : `${DEZ[d]} e ${UNI[u]}`;
  }
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const r = n % 100;
    return r === 0 ? CEN[c] : `${CEN[c]} e ${numeroPorExtenso(r)}`;
  }
  if (n < 1_000_000) {
    const milhares = Math.floor(n / 1000);
    const resto = n % 1000;
    const parteMilhar = milhares === 1 ? 'mil' : `${numeroPorExtenso(milhares)} mil`;
    if (resto === 0) return parteMilhar;
    const sep = resto < 100 || resto % 100 === 0 ? ' e ' : ', ';
    return `${parteMilhar}${sep}${numeroPorExtenso(resto)}`;
  }
  const milhoes = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  const parteMilhao = milhoes === 1 ? 'um milhão' : `${numeroPorExtenso(milhoes)} milhões`;
  if (resto === 0) return parteMilhao;
  return `${parteMilhao}, ${numeroPorExtenso(resto)}`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
