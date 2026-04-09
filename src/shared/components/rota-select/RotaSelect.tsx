'use client';

import { useState } from 'react';
import { Plus, Check, X, Loader2, ArrowRight } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import { useRotas } from '@/shared/hooks/useLookup';
import { criarRota } from '@/services/rotas-deslocamento.service';
import { useToast } from '@/shared/components/toast/Toast';
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
  const toast = useToast();
  const { rotas, loading, refresh } = useRotas();

  const [adding, setAdding] = useState(false);
  const [newOrigemUf, setNewOrigemUf] = useState('');
  const [newOrigem, setNewOrigem] = useState('');
  const [newDestinoUf, setNewDestinoUf] = useState('');
  const [newDestino, setNewDestino] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = rotas.find((r) => r.id === value) ?? null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value);
    if (!id) { onChange(null); return; }
    const rota = rotas.find((r) => r.id === id) ?? null;
    onChange(rota);
  }

  async function handleAdd() {
    if (!newOrigemUf || !newOrigem || !newDestinoUf || !newDestino) return;

    setSaving(true);
    try {
      const { data, error } = await criarRota({
        cidade_origem: newOrigem,
        uf_origem: newOrigemUf,
        cidade_destino: newDestino,
        uf_destino: newDestinoUf,
      });

      if (error || !data) {
        toast.error('Erro ao salvar', 'Não foi possível cadastrar a rota.');
        return;
      }

      onChange(data as unknown as RotaDeslocamento);
      refresh();
      handleCancel();
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setAdding(false);
    setNewOrigemUf('');
    setNewOrigem('');
    setNewDestinoUf('');
    setNewDestino('');
  }

  const canSave = !!(newOrigemUf && newOrigem && newDestinoUf && newDestino);

  return (
    <FormField label={label} required={required}>
      <div className="flex gap-1.5">
        <select
          className="tfd-input flex-1"
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

        {!disabled && (
          <button
            type="button"
            className="tfd-btn tfd-btn-secondary tfd-btn--icon-only shrink-0"
            title="Nova rota"
            onClick={() => setAdding(true)}
            style={{ minWidth: '36px', height: '36px' }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {selected && !adding && (
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

      {adding && (
        <div
          className="mt-2 p-3 rounded-lg space-y-3"
          style={{
            backgroundColor: 'var(--tfd-surface-secondary)',
            border: '1px solid var(--tfd-surface-border)',
          }}
        >
          <label className="tfd-label text-xs block" style={{ color: 'var(--tfd-text-secondary)' }}>
            Nova rota
          </label>

          <div>
            <span className="tfd-label text-xs block mb-1" style={{ color: 'var(--tfd-text-muted)' }}>Origem</span>
            <UfCidadeSelect
              uf={newOrigemUf}
              cidade={newOrigem}
              onUfChange={(v) => { setNewOrigemUf(v); setNewOrigem(''); }}
              onCidadeChange={setNewOrigem}
              size="sm"
              required
            />
          </div>

          <div>
            <span className="tfd-label text-xs block mb-1" style={{ color: 'var(--tfd-text-muted)' }}>Destino</span>
            <UfCidadeSelect
              uf={newDestinoUf}
              cidade={newDestino}
              onUfChange={(v) => { setNewDestinoUf(v); setNewDestino(''); }}
              onCidadeChange={setNewDestino}
              size="sm"
              required
            />
          </div>

          <div className="flex gap-1.5 justify-end">
            <button
              type="button"
              className="tfd-btn tfd-btn-secondary tfd-btn--sm shrink-0"
              onClick={handleCancel}
              disabled={saving}
            >
              <X size={14} />
              Cancelar
            </button>
            <button
              type="button"
              className="tfd-btn tfd-btn-primary tfd-btn--sm shrink-0"
              onClick={handleAdd}
              disabled={saving || !canSave}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar rota
            </button>
          </div>
        </div>
      )}
    </FormField>
  );
}
