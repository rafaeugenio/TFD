'use client';

import { useCallback } from 'react';
import Autocomplete from '@/shared/components/autocomplete/Autocomplete';
import type { AutocompleteOption } from '@/shared/components/autocomplete/Autocomplete';
import { useUnidadesDestino } from '@/shared/hooks/useLookup';

interface UnidadeValue {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  codigo_cnes?: string;
}

interface UnidadeSaudeSelectProps {
  value?: UnidadeValue | null;
  onChange: (unidade: UnidadeValue | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function UnidadeSaudeSelect({
  value,
  onChange,
  label = 'Unidade de Sa\u00fade',
  required = false,
  disabled = false,
  size = 'md',
}: UnidadeSaudeSelectProps) {
  const { options, loading } = useUnidadesDestino();

  const formatLabel = useCallback(
    (u: { nome: string; cidade: string; uf: string; cnes?: string | null; codigo_cnes?: string }) => {
      const cnes = u.codigo_cnes ?? u.cnes;
      return `${u.nome} \u2014 ${u.cidade}/${u.uf}${cnes ? ` (CNES: ${cnes})` : ''}`;
    },
    [],
  );

  const handleSearch = useCallback(
    (query: string): Promise<AutocompleteOption[]> => {
      const q = query.toLowerCase();
      const filtered = options
        .filter((u) => {
          const raw = u as unknown as Record<string, unknown>;
          const cnes = (raw.codigo_cnes as string | undefined) ?? (raw.cnes as string | null);
          return (
            u.nome.toLowerCase().includes(q) ||
            (cnes && cnes.includes(q))
          );
        })
        .map((u) => {
          const raw = u as unknown as Record<string, unknown>;
          const cnes = (raw.codigo_cnes as string | undefined) ?? (raw.cnes as string | null);
          return {
            value: u.id,
            label: formatLabel({ ...u, cnes: cnes ?? undefined }),
            nome: u.nome,
            cidade: u.cidade,
            uf: u.uf,
            codigo_cnes: cnes ?? undefined,
          };
        });
      return Promise.resolve(filtered);
    },
    [options, formatLabel],
  );

  const handleSelect = useCallback(
    (item: AutocompleteOption) => {
      onChange({
        id: item.value,
        nome: item.nome as string,
        cidade: item.cidade as string,
        uf: item.uf as string,
        codigo_cnes: item.codigo_cnes as string | undefined,
      });
    },
    [onChange],
  );

  const handleChange = useCallback(
    (val: string) => {
      if (!val) {
        onChange(null);
      }
    },
    [onChange],
  );

  const renderOption = useCallback((item: AutocompleteOption) => {
    const cnes = item.codigo_cnes as string | undefined;
    return (
      <span>
        <strong>{item.nome as string}</strong>{' '}
        <span style={{ color: 'var(--tfd-text-muted)' }}>
          — {item.cidade as string}/{item.uf as string}
        </span>
        {cnes && (
          <>
            {' '}
            <span style={{ color: 'var(--tfd-text-secondary)', fontSize: '0.75rem' }}>
              (CNES: {cnes})
            </span>
          </>
        )}
      </span>
    );
  }, []);

  const displayValue = value ? formatLabel(value) : '';

  return (
    <Autocomplete
      label={label}
      placeholder={loading ? 'Carregando...' : 'Buscar unidade de sa\u00fade...'}
      value={displayValue}
      onChange={handleChange}
      onSearch={handleSearch}
      onSelect={handleSelect}
      renderOption={renderOption}
      disabled={disabled || loading}
      required={required}
      size={size}
    />
  );
}
