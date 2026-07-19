'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import {
  nomeCidade,
  regionalDoMunicipio,
  REGIAO_FILTRO_VAZIO,
  type RegiaoFiltroValue,
} from '../_utils/derivarRegional';

export { REGIAO_FILTRO_VAZIO, type RegiaoFiltroValue } from '../_utils/derivarRegional';

interface Props {
  /** Base completa (não filtrada) usada para derivar as opções — assim as
   *  opções do cascade nunca "somem" quando outro filtro (busca/status) já
   *  reduziu o resultado visível. */
  solicitacoes: SolicitacaoMock[];
  value: RegiaoFiltroValue;
  onChange: (value: RegiaoFiltroValue) => void;
}

const selectStyle: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
  fontSize: 13,
  color: '#1A1D2B',
  minWidth: 168,
};

/**
 * PBI 13219 — filtro em cascata Região (zona regional do paciente) > Regional
 * de saúde > Município, reutilizado pelas listagens de Solicitações,
 * Regulação e Financeiro. Selecionar uma Região restringe as Regionais
 * disponíveis; selecionar uma Regional restringe os Municípios.
 */
export default function RegiaoRegionalMunicipioFilter({ solicitacoes, value, onChange }: Props) {
  const { regioes, regionaisPorRegiao, municipiosPorRegional } = useMemo(() => {
    const regioesSet = new Set<string>();
    const regionaisMap = new Map<string, Set<string>>();
    const municipiosMap = new Map<string, Set<string>>();

    for (const s of solicitacoes) {
      const regiao = s.paciente.zonaRegional || '—';
      const regional = regionalDoMunicipio(s.paciente.regional, s.paciente.municipio);
      const municipio = nomeCidade(s.paciente.municipio) || '—';

      regioesSet.add(regiao);
      if (!regionaisMap.has(regiao)) regionaisMap.set(regiao, new Set());
      regionaisMap.get(regiao)!.add(regional);
      if (!municipiosMap.has(regional)) municipiosMap.set(regional, new Set());
      municipiosMap.get(regional)!.add(municipio);
    }

    return { regioes: regioesSet, regionaisPorRegiao: regionaisMap, municipiosPorRegional: municipiosMap };
  }, [solicitacoes]);

  const ordenar = (set: Iterable<string>) => Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const regioesDisponiveis = useMemo(() => ordenar(regioes), [regioes]);

  const regionaisDisponiveis = useMemo(() => {
    if (!value.regiao) return ordenar(new Set(Array.from(regionaisPorRegiao.values()).flatMap((s) => Array.from(s))));
    return ordenar(regionaisPorRegiao.get(value.regiao) ?? new Set());
  }, [regionaisPorRegiao, value.regiao]);

  const municipiosDisponiveis = useMemo(() => {
    const regionaisRelevantes = value.regional
      ? [value.regional]
      : value.regiao
        ? Array.from(regionaisPorRegiao.get(value.regiao) ?? [])
        : Array.from(municipiosPorRegional.keys());
    const set = new Set<string>();
    for (const regional of regionaisRelevantes) {
      for (const m of municipiosPorRegional.get(regional) ?? []) set.add(m);
    }
    return ordenar(set);
  }, [municipiosPorRegional, regionaisPorRegiao, value.regiao, value.regional]);

  const temFiltroAtivo = !!(value.regiao || value.regional || value.municipio);

  return (
    <>
      <select
        value={value.regiao}
        onChange={(e) => onChange({ regiao: e.target.value, regional: '', municipio: '' })}
        style={selectStyle}
        aria-label="Filtrar por região"
      >
        <option value="">Todas as regiões</option>
        {regioesDisponiveis.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <select
        value={value.regional}
        onChange={(e) => onChange({ ...value, regional: e.target.value, municipio: '' })}
        style={selectStyle}
        disabled={regionaisDisponiveis.length === 0}
        aria-label="Filtrar por regional de saúde"
      >
        <option value="">Todas as regionais</option>
        {regionaisDisponiveis.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <select
        value={value.municipio}
        onChange={(e) => onChange({ ...value, municipio: e.target.value })}
        style={selectStyle}
        disabled={municipiosDisponiveis.length === 0}
        aria-label="Filtrar por município"
      >
        <option value="">Todos os municípios</option>
        {municipiosDisponiveis.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {temFiltroAtivo && (
        <button
          type="button"
          onClick={() => onChange(REGIAO_FILTRO_VAZIO)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
          style={{ height: 36, padding: '0 10px', color: '#64748B' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#1A1D2B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
        >
          <X size={13} />
          Limpar filtros
        </button>
      )}
    </>
  );
}
