'use client';

import { useCallback, useRef } from 'react';
import Autocomplete from '@/shared/components/autocomplete/Autocomplete';
import type { AutocompleteOption } from '@/shared/components/autocomplete/Autocomplete';
import { createClient } from '@/lib/supabase/client';

interface CidAutocompleteProps {
  value?: { codigo: string; descricao: string } | null;
  onChange: (cid: { codigo: string; descricao: string } | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

interface CidOption extends AutocompleteOption {
  codigo: string;
  descricao: string;
}

export default function CidAutocomplete({
  value,
  onChange,
  label = 'CID-10',
  required = false,
  disabled = false,
  size = 'md',
}: CidAutocompleteProps) {
  const supabase = useRef(createClient());

  const handleSearch = useCallback(async (query: string): Promise<CidOption[]> => {
    if (!query || query.length < 2) return [];

    // TODO: Substituir por useCid10 hook quando Agente 1 implementar
    const { data, error } = await supabase.current
      .from('cid10' as any)
      .select('codigo, descricao')
      .or(`codigo.ilike.%${query}%,descricao.ilike.%${query}%`)
      .limit(20);

    if (error || !data) return [];

    const rows = data as unknown as { codigo: string; descricao: string }[];
    return rows.map((item) => ({
      value: item.codigo,
      label: `${item.codigo} \u2014 ${item.descricao}`,
      codigo: item.codigo,
      descricao: item.descricao,
    }));
  }, []);

  const handleSelect = useCallback(
    (option: AutocompleteOption | null) => {
      if (!option) {
        onChange(null);
        return;
      }
      const cid = option as CidOption;
      onChange({ codigo: cid.codigo, descricao: cid.descricao });
    },
    [onChange],
  );

  const renderOption = useCallback((option: AutocompleteOption) => {
    const cid = option as CidOption;
    return (
      <span>
        <strong>{cid.codigo}</strong> {'\u2014'} {cid.descricao}
      </span>
    );
  }, []);

  const displayValue = value ? `${value.codigo} \u2014 ${value.descricao}` : '';

  return (
    <Autocomplete
      label={label}
      required={required}
      disabled={disabled}
      size={size}
      value={displayValue}
      onSearch={handleSearch}
      onSelect={handleSelect}
      renderOption={renderOption}
      placeholder="Buscar por codigo ou descricao..."
    />
  );
}
