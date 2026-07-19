/* -------------------------------------------------------------------------- */
/*  PBI 13219 — Filtros em cascata Região > Regional > Município              */
/*                                                                            */
/*  Espelha o mapeamento município → regional de saúde já usado no dashboard  */
/*  (`src/app/dashboard/page.tsx`). Mantido aqui como fonte compartilhada     */
/*  pelas listagens do Fluxo v2 (Solicitações, Regulação, Financeiro) porque  */
/*  o adapter do Supabase ainda não preenche `paciente.regional` — depende de */
/*  um enricher via `municipio_residencia_id` que não está rodando.          */
/* -------------------------------------------------------------------------- */

const REGIONAL_POR_MUNICIPIO: Record<string, string> = {
  'sao luis':              'Regional de São Luís',
  'imperatriz':            'Regional de Imperatriz',
  'caxias':                'Regional de Caxias',
  'pinheiro':               'Regional de Pinheiro',
  'presidente dutra':      'Regional de Presidente Dutra',
  'bacabal':               'Regional de Bacabal',
  'acailandia':            'Regional de Açailândia',
  'balsas':                'Regional de Balsas',
  'barra do corda':        'Regional de Barra do Corda',
  'chapadinha':            'Regional de Chapadinha',
  'codo':                  'Regional de Codó',
  'coroata':               'Regional de Coroatá',
  'itapecuru-mirim':       'Regional de Itapecuru-Mirim',
  'pedreiras':             'Regional de Pedreiras',
  'rosario':               'Regional de Rosário',
  'santa ines':            'Regional de Santa Inês',
  'sao joao dos patos':    'Regional de São João dos Patos',
  'timon':                 'Regional de Timon',
  'viana':                 'Regional de Viana',
  'ze doca':               'Regional de Zé Doca',
};

/** Nome do município sem o sufixo de UF (ex.: "São Luís - MA" → "São Luís"). */
export function nomeCidade(municipio: string | undefined): string {
  if (!municipio) return '';
  return municipio.split(' - ')[0].trim();
}

/**
 * Regional de saúde do município — usa o valor já preenchido no cadastro
 * (`paciente.regional`) quando existir; senão deriva pelo nome do município
 * (cobertura das regionais mais comuns no seed atual). Casos não mapeados
 * caem em "Regional indefinida" para não quebrar o agrupamento do filtro.
 */
export function regionalDoMunicipio(regional: string | undefined, municipio: string | undefined): string {
  if (regional?.trim()) return regional.trim();
  const cidade = nomeCidade(municipio);
  if (!cidade) return 'Regional indefinida';
  const key = cidade
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return REGIONAL_POR_MUNICIPIO[key] ?? 'Regional indefinida';
}

/** Seleção corrente do filtro em cascata Região > Regional > Município.
 *  String vazia em qualquer nível representa "todas". */
export interface RegiaoFiltroValue {
  regiao: string;
  regional: string;
  municipio: string;
}

export const REGIAO_FILTRO_VAZIO: RegiaoFiltroValue = { regiao: '', regional: '', municipio: '' };

/** Testa se um paciente (via zonaRegional/regional/municipio) casa com o
 *  filtro em cascata selecionado. Usado pelas listagens de Solicitações,
 *  Regulação e Financeiro. */
export function casaComFiltroRegiao(
  paciente: { zonaRegional?: string; regional?: string; municipio?: string },
  filtro: RegiaoFiltroValue,
): boolean {
  if (filtro.regiao && (paciente.zonaRegional || '—') !== filtro.regiao) return false;
  if (filtro.regional && regionalDoMunicipio(paciente.regional, paciente.municipio) !== filtro.regional) return false;
  if (filtro.municipio && (nomeCidade(paciente.municipio) || '—') !== filtro.municipio) return false;
  return true;
}
