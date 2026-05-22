// Mapeia combinações de beneficiário/modal/pernoite/CNRAC para os códigos
// SIGTAP do seed em supabase/migrations/00022_tabela_sigtap.sql.

export type Beneficiario = 'paciente' | 'acompanhante';
export type Modal = 'terrestre' | 'aereo' | 'fluvial';

interface SigtapCode {
  codigo: string;
  descricao: string;
}

// 6 códigos de ajuda de custo: paciente|acomp × com|sem pernoite × cnrac
const AJUDA_CUSTO_MAP: Record<string, SigtapCode> = {
  // paciente
  'paciente_com_false':       { codigo: '08.03.01.001-0', descricao: 'Ajuda de custo p/ alim./pernoite paciente' },
  'paciente_sem_false':       { codigo: '08.03.01.002-8', descricao: 'Ajuda de custo p/ alim. paciente s/ pernoite' },
  'paciente_com_true':        { codigo: '08.03.01.003-6', descricao: 'Ajuda de custo p/ alim./pernoite paciente (CNRAC)' },
  // acompanhante
  'acompanhante_com_false':   { codigo: '08.03.01.004-4', descricao: 'Ajuda de custo p/ alim./pernoite acompanhante' },
  'acompanhante_sem_false':   { codigo: '08.03.01.005-2', descricao: 'Ajuda de custo p/ alim. acompanhante s/ pernoite' },
  'acompanhante_com_true':    { codigo: '08.03.01.006-0', descricao: 'Ajuda de custo p/ alim./pernoite acompanhante (CNRAC)' },
};

export function resolveSigtapAjudaCusto(input: {
  beneficiario: Beneficiario;
  comPernoite: boolean;
  cnrac: boolean;
}): SigtapCode {
  const pernoiteKey = input.comPernoite ? 'com' : 'sem';
  // CNRAC só existe variante "com pernoite" no seed atual
  const cnracKey = input.cnrac && input.comPernoite ? 'true' : 'false';
  const key = `${input.beneficiario}_${pernoiteKey}_${cnracKey}`;
  return AJUDA_CUSTO_MAP[key] ?? AJUDA_CUSTO_MAP[`${input.beneficiario}_com_false`];
}

interface SigtapPassagem extends SigtapCode {
  unidadeDivisor: number; // ex: 50 (km), 200 (milhas), 27 (milhas náuticas)
  unidadeLabel: string;
}

// 8 códigos de deslocamento: paciente|acomp × terrestre|aereo|fluvial × cnrac(só aereo)
const PASSAGEM_MAP: Record<string, SigtapPassagem> = {
  'paciente_terrestre_false':     { codigo: '08.03.01.012-5', descricao: 'Deslocamento paciente terrestre', unidadeDivisor: 50, unidadeLabel: 'km' },
  'paciente_aereo_false':         { codigo: '08.03.01.008-7', descricao: 'Deslocamento paciente aéreo', unidadeDivisor: 200, unidadeLabel: 'mi' },
  'paciente_aereo_true':          { codigo: '08.03.01.014-1', descricao: 'Deslocamento paciente aéreo (CNRAC)', unidadeDivisor: 200, unidadeLabel: 'mi' },
  'paciente_fluvial_false':       { codigo: '08.03.01.011-7', descricao: 'Deslocamento paciente fluvial', unidadeDivisor: 27, unidadeLabel: 'mn' },
  'acompanhante_terrestre_false': { codigo: '08.03.01.010-9', descricao: 'Deslocamento acompanhante terrestre', unidadeDivisor: 50, unidadeLabel: 'km' },
  'acompanhante_aereo_false':     { codigo: '08.03.01.007-9', descricao: 'Deslocamento acompanhante aéreo', unidadeDivisor: 200, unidadeLabel: 'mi' },
  'acompanhante_aereo_true':      { codigo: '08.03.01.013-3', descricao: 'Deslocamento acompanhante aéreo (CNRAC)', unidadeDivisor: 200, unidadeLabel: 'mi' },
  'acompanhante_fluvial_false':   { codigo: '08.03.01.009-5', descricao: 'Deslocamento acompanhante fluvial', unidadeDivisor: 27, unidadeLabel: 'mn' },
};

export function resolveSigtapPassagem(input: {
  beneficiario: Beneficiario;
  modal: Modal;
  cnrac: boolean;
}): SigtapPassagem {
  const cnracKey = input.cnrac && input.modal === 'aereo' ? 'true' : 'false';
  const key = `${input.beneficiario}_${input.modal}_${cnracKey}`;
  return PASSAGEM_MAP[key] ?? PASSAGEM_MAP[`${input.beneficiario}_terrestre_false`];
}

/** Calcula a quantidade SIGTAP (arredondamento padrão) a partir da distância. */
export function calcularQuantidadePassagem(distancia: number | null, divisor: number): number | null {
  if (!distancia || distancia <= 0) return null;
  return Math.round(distancia / divisor);
}
