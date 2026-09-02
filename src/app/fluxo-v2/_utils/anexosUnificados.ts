import {
  type SolicitacaoMock,
  CATEGORIA_ADICIONAL_LABEL,
} from '@/core/mocks/fluxo-v2-v3-seed';

/**
 * Origem de um anexo dentro do ciclo de vida da solicitação.
 * Determina o badge "Origem" mostrado na aba Anexos.
 */
export type OrigemAnexo =
  | 'abertura'
  | 'edicao'
  | 'adicional'
  | 'passagem'
  | 'parecer'
  | 'despacho'
  | 'agendamento'
  | 'tentativa'
  | 'ajuda_custo'
  | 'carimbo'
  /** Enviado pelo botão dedicado da aba Anexos. */
  | 'avulso';

export const ORIGEM_ANEXO_LABEL: Record<OrigemAnexo, string> = {
  abertura: 'Abertura',
  edicao: 'Edição',
  adicional: 'Adicional',
  passagem: 'Passagem',
  parecer: 'Parecer médico',
  despacho: 'Despacho financeiro',
  agendamento: 'Agendamento',
  tentativa: 'Tentativa de contato',
  ajuda_custo: 'Ajuda de custo',
  carimbo: 'Carimbo de regulação',
  avulso: 'Envio avulso',
};

/**
 * Item normalizado para listagem unificada na aba Anexos.
 * Tudo que tem origem dentro da solicitação cabe aqui — independente
 * de ter sido anexado manualmente ou gerado automaticamente pelo sistema.
 */
export interface AnexoUnificado {
  id: string;
  nome: string;
  /** Categoria do documento (label, já resolvido). Quando gerado pelo sistema,
   *  vem como rótulo fixo (ex.: "Parecer médico"). */
  tipoDocumento: string;
  origem: OrigemAnexo;
  /** ISO datetime — usado para ordenação. */
  data: string;
  /** True quando é um documento gerado pelo próprio sistema (parecer, despacho). */
  geradoPeloSistema: boolean;
  /** Mock URL ou identificador para download/abrir. */
  href?: string;
  tamanhoKB?: number;
  /** Link interno (rota) para abrir o documento no app (ex.: despacho). */
  rotaInterna?: string;
  /** True para os anexos que vivem em `s.anexos` (abertura/edição/avulso) —
   *  únicos que podem ser excluídos pela aba Anexos. Comprovantes de
   *  adicional/passagem e documentos gerados pelo sistema (parecer,
   *  despacho) pertencem a outro registro do fluxo e não têm exclusão
   *  própria aqui. */
  removivel: boolean;
}

/**
 * Resolve o label do `tipoDocumento` (código vindo da lookup `tipo_documento`)
 * usando o catálogo carregado. Se o catálogo não estiver pronto, devolve um
 * placeholder humano em vez do código cru.
 */
function resolverTipoDocumentoLabel(
  codigo: string | undefined,
  catalogo: Map<string, string>,
): string {
  if (!codigo) return 'Sem tipo';
  return catalogo.get(codigo) ?? codigo;
}

/**
 * Agrega TODOS os anexos da solicitação numa única lista ordenável.
 *
 * Fontes hoje:
 * - `s.anexos` (abertura/edição)
 * - `s.adicionais[].documentoUrl` (comprovantes de adicional)
 * - `s.viagens[].bilheteUrl` (bilhetes de passagem)
 * - `s.pareceres[]` (gerados pelo sistema — viram entrada virtual)
 *
 * O despacho financeiro vive no Supabase fora deste estado e é injetado pelo
 * caller via `despachos` quando disponível.
 */
export function agregarAnexos(
  s: SolicitacaoMock,
  opts: {
    /** Catálogo `código → nome` da lookup `tipo_documento`. */
    tiposDocumentoCatalogo?: Map<string, string>;
    /** Despachos financeiros desta solicitação (vindos do Supabase). */
    despachos?: Array<{ id: string; numero?: string | null; createdAt: string }>;
  } = {},
): AnexoUnificado[] {
  const catalogo = opts.tiposDocumentoCatalogo ?? new Map<string, string>();
  const itens: AnexoUnificado[] = [];

  // 1) Anexos da abertura/edição/qualquer drawer do fluxo
  //    Origem fica gravada no próprio AnexoMock (`a.origem`); legacy fica como
  //    'abertura'. Data idem — se vazia, herda da data da solicitação.
  for (const a of s.anexos ?? []) {
    itens.push({
      id: a.id,
      nome: a.nome,
      tipoDocumento: resolverTipoDocumentoLabel(a.tipoDocumento, catalogo),
      origem: (a.origem ?? 'abertura') as OrigemAnexo,
      data: a.data ?? s.dataCriacao,
      geradoPeloSistema: false,
      href: `mock://${a.nome}`,
      tamanhoKB: a.tamanhoKB,
      removivel: true,
    });
  }

  // 2) Comprovantes de adicionais
  for (const ad of s.adicionais ?? []) {
    if (!ad.documentoUrl) continue;
    const nomeArquivo = ad.documentoUrl.replace(/^mock:\/\//, '');
    const labelCategoria = CATEGORIA_ADICIONAL_LABEL[ad.categoria] ?? ad.categoria;
    itens.push({
      id: `anx-adicional-${ad.id}`,
      nome: nomeArquivo,
      tipoDocumento: `Comprovante — ${labelCategoria}`,
      origem: 'adicional',
      data: ad.data,
      geradoPeloSistema: false,
      href: ad.documentoUrl,
      removivel: false,
    });
  }

  // 3) Bilhetes de passagem
  for (const v of s.viagens ?? []) {
    if (!v.bilheteUrl) continue;
    const nomeArquivo = v.bilheteUrl.replace(/^mock:\/\//, '');
    itens.push({
      id: `anx-viagem-${v.id}`,
      nome: nomeArquivo,
      tipoDocumento: 'Bilhete de passagem',
      origem: 'passagem',
      data: v.data,
      geradoPeloSistema: false,
      href: v.bilheteUrl,
      removivel: false,
    });
  }

  // 4) Pareceres médicos — gerados pelo sistema
  for (const p of s.pareceres ?? []) {
    const dataFmt = p.data.slice(0, 10).replace(/-/g, '');
    itens.push({
      id: `anx-parecer-${p.id}`,
      nome: `Parecer_${dataFmt}_${p.medico.split(' ').slice(-1)[0]}.pdf`,
      tipoDocumento: 'Parecer médico',
      origem: 'parecer',
      data: p.data,
      geradoPeloSistema: true,
      removivel: false,
    });
  }

  // 5) Despachos financeiros (injetados pelo caller)
  for (const d of opts.despachos ?? []) {
    itens.push({
      id: `anx-despacho-${d.id}`,
      nome: `Despacho_${d.numero ?? d.id.slice(0, 6)}.pdf`,
      tipoDocumento: 'Despacho financeiro',
      origem: 'despacho',
      data: d.createdAt,
      geradoPeloSistema: true,
      removivel: false,
      rotaInterna: `/despacho/${d.id}`,
    });
  }

  return itens;
}

/** Ordena uma lista de anexos pela data; `desc=true` (default) coloca o mais recente em cima. */
export function ordenarAnexos(itens: AnexoUnificado[], desc = true): AnexoUnificado[] {
  return [...itens].sort((a, b) => {
    const cmp = new Date(a.data).getTime() - new Date(b.data).getTime();
    return desc ? -cmp : cmp;
  });
}
