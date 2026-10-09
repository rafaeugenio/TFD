import type { AjudaCustoMock, SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

/**
 * Trava de ajuda de custo duplicada: a mesma pessoa não pode ter duas ajudas
 * ativas (não canceladas) com a mesma data de início e a mesma data de fim,
 * em nenhuma solicitação.
 *
 * Identidade do beneficiário:
 * - paciente: id do paciente ou CPF;
 * - acompanhante: id da sessão (quando a ajuda ainda guarda `beneficiarioId`),
 *   CPF ou nome normalizado. O banco não grava o id do acompanhante na ajuda,
 *   então a ajuda lida do banco sem `beneficiarioId` só é atribuída a um
 *   acompanhante quando não há ambiguidade (a solicitação tem um único
 *   acompanhante, ou há ajudas sem identificação para todos eles no período).
 */

export interface AjudaDuplicada {
  /** Valor do beneficiário no drawer ("p" ou "a:<id>"). */
  valor: string;
  nome: string;
  solicitacaoNumero: string;
  dataInicio: string;
  dataFim: string;
}

function soDigitos(v?: string): string {
  return (v ?? '').replace(/\D/g, '');
}

export function normalizarNome(v?: string): string {
  return (v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

type Chaves = Set<string>;

function chavesPaciente(s: SolicitacaoMock): Chaves {
  const c = new Set<string>();
  if (s.paciente.id) c.add(`pid:${s.paciente.id}`);
  const cpf = soDigitos(s.paciente.cpf);
  if (cpf) c.add(`cpf:${cpf}`);
  return c;
}

function chavesAcompanhante(a: { id: string; cpf?: string; nome?: string }): Chaves {
  const c = new Set<string>();
  if (a.id) c.add(`aid:${a.id}`);
  const cpf = soDigitos(a.cpf);
  if (cpf) c.add(`cpf:${cpf}`);
  const nome = normalizarNome(a.nome);
  if (nome) c.add(`nome:${nome}`);
  return c;
}

function intersecta(a: Chaves, b: Chaves): boolean {
  for (const k of a) if (b.has(k)) return true;
  return false;
}

/** Chaves de quem recebe cada ajuda ativa da solicitação no período dado. */
function beneficiariosNoPeriodo(
  s: SolicitacaoMock,
  dataInicio: string,
  dataFim: string,
  ignorarAjudaId?: string,
): Chaves[] {
  const doPeriodo = s.ajudasCusto.filter(
    (a: AjudaCustoMock) =>
      a.ativa !== false &&
      a.id !== ignorarAjudaId &&
      a.dataInicio === dataInicio &&
      a.dataFim === dataFim,
  );
  const resultado: Chaves[] = [];
  const semIdentificacao: AjudaCustoMock[] = [];

  for (const a of doPeriodo) {
    if (a.beneficiarioTipo === 'paciente') {
      resultado.push(chavesPaciente(s));
      continue;
    }
    const acomp = a.beneficiarioId ? s.acompanhantes.find((x) => x.id === a.beneficiarioId) : undefined;
    if (acomp) resultado.push(chavesAcompanhante(acomp));
    else if (a.beneficiarioId) resultado.push(new Set([`aid:${a.beneficiarioId}`]));
    else semIdentificacao.push(a);
  }

  // Ajuda de acompanhante lida do banco, sem o id: só vale quando dá para
  // saber de quem é sem chutar.
  if (semIdentificacao.length > 0 && s.acompanhantes.length > 0) {
    if (s.acompanhantes.length === 1 || semIdentificacao.length >= s.acompanhantes.length) {
      s.acompanhantes.forEach((acomp) => resultado.push(chavesAcompanhante(acomp)));
    }
  }
  return resultado;
}

/**
 * Para cada beneficiário marcado no drawer, procura uma ajuda ativa com as
 * mesmas datas, em todas as solicitações carregadas. Devolve só os duplicados.
 */
export function encontrarAjudasDuplicadas(params: {
  solicitacoes: SolicitacaoMock[];
  atual: SolicitacaoMock | undefined;
  beneficiarios: string[];
  dataInicio: string;
  dataFim: string;
  /** Em edição, a própria ajuda não conta. */
  ignorarAjudaId?: string;
}): AjudaDuplicada[] {
  const { solicitacoes, atual, beneficiarios, dataInicio, dataFim, ignorarAjudaId } = params;
  if (!atual || !dataInicio || !dataFim || beneficiarios.length === 0) return [];

  const marcados = beneficiarios
    .map((valor) => {
      if (valor === 'p') return { valor, nome: atual.paciente.nome, chaves: chavesPaciente(atual) };
      const id = valor.startsWith('a:') ? valor.slice(2) : valor;
      const acomp = atual.acompanhantes.find((x) => x.id === id);
      return acomp ? { valor, nome: acomp.nome, chaves: chavesAcompanhante(acomp) } : null;
    })
    .filter((m): m is { valor: string; nome: string; chaves: Chaves } => m !== null);

  const encontrados: AjudaDuplicada[] = [];
  for (const m of marcados) {
    for (const s of solicitacoes) {
      const existentes = beneficiariosNoPeriodo(s, dataInicio, dataFim, ignorarAjudaId);
      if (existentes.some((c) => intersecta(c, m.chaves))) {
        encontrados.push({ valor: m.valor, nome: m.nome, solicitacaoNumero: s.numero, dataInicio, dataFim });
        break;
      }
    }
  }
  return encontrados;
}
