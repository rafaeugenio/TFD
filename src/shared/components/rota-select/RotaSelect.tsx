'use client';

import { ArrowRight } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';
import { useRotas } from '@/shared/hooks/useLookup';
import type { RotaDeslocamento } from '@/core/models/rota-deslocamento.model';

interface RotaSelectProps {
  value: number | null;
  onChange: (rota: RotaDeslocamento | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function RotaSelect({
  value,
  onChange,
  label = 'Rota de deslocamento',
  required = false,
  disabled = false,
}: RotaSelectProps) {
  const { rotas, loading } = useRotas();

  const selected = rotas.find((r) => r.id === value) ?? null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value);
    if (!id) { onChange(null); return; }
    const rota = rotas.find((r) => r.id === id) ?? null;
    onChange(rota);
  }

  return (
    <FormField label={label} required={required}>
      <select
        className="tfd-input"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled || loading}
      >
        <option value="">{loading ? 'Carregando rotas...' : 'Selecione a rota...'}</option>
        {rotas.map((r) => (
          <option key={r.id} value={r.id}>
            {r.cidade_origem}/{r.uf_origem} → {r.cidade_destino}/{r.uf_destino}
          </option>
        ))}
      </select>

      {selected && (
        <div
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--tfd-primary-50)',
            border: '1px solid var(--tfd-primary-200)',
            color: 'var(--tfd-primary-700)',
          }}
        >
          <span>{selected.cidade_origem} - {selected.uf_origem}</span>
          <ArrowRight size={14} style={{ color: 'var(--tfd-primary-400)', flexShrink: 0 }} />
          <span>{selected.cidade_destino} - {selected.uf_destino}</span>
        </div>
      )}
    </FormField>
  );
}
