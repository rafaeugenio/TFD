import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Filtros } from './catalogo';
import { ErroServico } from './http';

/**
 * Confere os valores citados em texto livre (município, especialidade, CID,
 * destino) contra o que existe no banco. Só vira filtro o que existir; o que
 * não for achado volta como aviso, para a resposta não fingir que filtrou.
 */

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Siglas e apelidos usados no dia a dia da SES-MA. */
const APELIDOS: Record<string, string> = {
  slz: 'sao luis', 'sao luiz': 'sao luis', 'ilha': 'sao luis', itz: 'imperatriz', 'sjr': 'sao jose de ribamar', ribamar: 'sao jose de ribamar',
  'paco': 'paco do lumiar', 'santa ines': 'santa ines',
};

export interface TrechosTexto { municipio?: string; especialidade?: string; cid?: string; destino?: string }
export interface Resolucao { filtros: Partial<Filtros>; avisos: string[]; reconhecidos: string[] }

async function lista<T>(p: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new ErroServico('banco', 'indisponivel');
  return (data ?? []) as T[];
}

export async function resolverTrechos(sb: SupabaseClient, trechos: TrechosTexto, textoPergunta: string): Promise<Resolucao> {
  const out: Resolucao = { filtros: {}, avisos: [], reconhecidos: [] };
  const t = ` ${norm(textoPergunta)} `;

  // Município: do Gemini ou, sem ele, procurado no texto (nomes do banco + apelidos).
  const municipios = await lista<{ id: string; nome: string; uf: string }>(sb.from('municipios').select('id, nome, uf').limit(2000));
  const alvoMun = trechos.municipio ? norm(trechos.municipio) : undefined;
  const procurado = alvoMun ? (APELIDOS[alvoMun] ?? alvoMun) : undefined;
  let achados = procurado ? municipios.filter((m) => norm(m.nome) === procurado) : [];
  if (procurado && !achados.length) achados = municipios.filter((m) => norm(m.nome).includes(procurado) || procurado.includes(norm(m.nome)));
  if (!procurado) {
    const apelido = Object.keys(APELIDOS).find((a) => t.includes(` ${a} `));
    const nomeTexto = apelido ? APELIDOS[apelido] : undefined;
    achados = municipios.filter((m) => (nomeTexto ? norm(m.nome) === nomeTexto : t.includes(` ${norm(m.nome)} `)));
    // Nome de município que também é cidade de destino: só conta como município com "em", "de" ou "do" antes.
    if (!nomeTexto) achados = achados.filter((m) => new RegExp(`\\b(em|de|do|da|no|na) ${norm(m.nome)}\\b`).test(t));
  }
  if (achados.length) {
    out.filtros.municipio = { ids: achados.map((m) => m.id), nome: achados[0].nome };
    out.reconhecidos.push(`Município: ${achados[0].nome}`);
  } else if (trechos.municipio) {
    out.avisos.push(`Não encontrei o município "${trechos.municipio}" no cadastro; a resposta considera todos os municípios.`);
  }

  // Especialidade: comparada com as que existem nas solicitações.
  const especialidades = [...new Set((await lista<{ especialidade: string | null }>(sb.from('solicitacoes').select('especialidade').not('especialidade', 'is', null).limit(5000)))
    .map((e) => e.especialidade?.trim()).filter((e): e is string => !!e))];
  const alvoEsp = trechos.especialidade ? norm(trechos.especialidade) : undefined;
  const esp = especialidades.find((e) => (alvoEsp ? norm(e) === alvoEsp || norm(e).startsWith(alvoEsp) : t.includes(` ${norm(e)} `)));
  if (esp) { out.filtros.especialidade = esp; out.reconhecidos.push(`Especialidade: ${esp}`); }
  else if (trechos.especialidade) out.avisos.push(`Não encontrei a especialidade "${trechos.especialidade}" nas solicitações.`);

  // CID: código explícito (ex.: C50, C50.9).
  const codigo = (trechos.cid ?? '').toUpperCase().match(/\b([A-TV-Z]\d{2}(?:\.\d)?)\b/)?.[1] ?? textoPergunta.toUpperCase().match(/\b([A-TV-Z]\d{2}(?:\.\d)?)\b/)?.[1];
  if (codigo) { out.filtros.cid = codigo; out.reconhecidos.push(`CID: ${codigo}`); }

  // Destino: cidade de destino citada (só do Gemini, para não confundir com origem).
  if (trechos.destino) {
    const cidades = [...new Set((await lista<{ destino_cidade: string }>(sb.from('viagens').select('destino_cidade').limit(5000))).map((v) => v.destino_cidade))];
    const alvo = APELIDOS[norm(trechos.destino)] ?? norm(trechos.destino);
    const cidade = cidades.find((c) => norm(c) === alvo) ?? cidades.find((c) => norm(c).includes(alvo));
    if (cidade) { out.filtros.destino = cidade; out.reconhecidos.push(`Destino: ${cidade}`); }
    else out.avisos.push(`Não há viagens para "${trechos.destino}"; a resposta considera todos os destinos.`);
  }
  return out;
}
