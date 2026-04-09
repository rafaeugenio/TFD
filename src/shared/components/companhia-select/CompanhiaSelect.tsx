'use client';

import { useState } from 'react';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';
import { criarCompanhia } from '@/services/tabelas-auxiliares.service';
import { useCompanhias } from '@/shared/hooks/useLookup';
import { useToast } from '@/shared/components/toast/Toast';
import type { ModalTransporte } from '@/lib/supabase/database.types';

interface CompanhiaSelectProps {
  value: string;
  onChange: (nome: string, tipoModal?: ModalTransporte) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function CompanhiaSelect({
  value,
  onChange,
  label = 'Companhia',
  required = false,
  disabled = false,
}: CompanhiaSelectProps) {
  const toast = useToast();
  const { options, loading, refresh } = useCompanhias();
  const [adding, setAdding] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newModal, setNewModal] = useState<ModalTransporte>('AEREO');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const nome = newNome.trim();
    if (!nome) return;

    setSaving(true);
    try {
      const { data, error } = await criarCompanhia({
        nome,
        tipo_modal: newModal,
        cnpj: null,
        contato: null,
        ativo: true,
      });

      if (error || !data) {
        toast.error('Erro ao salvar', 'Não foi possível cadastrar a companhia.');
        return;
      }

      await refresh();
      onChange(data.nome, newModal);
      setAdding(false);
      setNewNome('');
      setNewModal('AEREO');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setAdding(false);
    setNewNome('');
    setNewModal('AEREO');
  }

  return (
    <FormField label={label} required={required}>
      <div className="flex gap-1.5">
        <select
          className="tfd-input flex-1"
          value={value}
          onChange={(e) => {
              const nome = e.target.value;
              const opt = options.find((o) => o.nome === nome);
              onChange(nome, opt?.tipo_modal);
            }}
          disabled={disabled || loading}
        >
          <option value="">{loading ? 'Carregando...' : 'Selecione...'}</option>
          {options.map((o) => (
            <option key={o.id} value={o.nome}>
              {o.nome} ({o.tipo_modal})
            </option>
          ))}
        </select>

        {!disabled && (
          <button
            type="button"
            className="tfd-btn tfd-btn-secondary tfd-btn--icon-only shrink-0"
            title="Nova companhia"
            onClick={() => setAdding(true)}
            style={{ minWidth: '36px', height: '36px' }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {adding && (
        <div
          className="mt-2 p-3 rounded-lg space-y-2"
          style={{
            backgroundColor: 'var(--tfd-surface-secondary)',
            border: '1px solid var(--tfd-surface-border)',
          }}
        >
          <label className="tfd-label text-xs block" style={{ color: 'var(--tfd-text-secondary)' }}>
            Nova companhia
          </label>
          <input
            type="text"
            className="tfd-input tfd-input--sm"
            placeholder="Nome da companhia..."
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') handleCancel();
            }}
            autoFocus
            disabled={saving}
          />
          <div className="flex gap-1.5 items-center">
            <select
              className="tfd-input tfd-input--sm flex-1"
              value={newModal}
              onChange={(e) => setNewModal(e.target.value as ModalTransporte)}
              disabled={saving}
            >
              <option value="AEREO">Aéreo</option>
              <option value="TERRESTRE">Terrestre</option>
              <option value="FLUVIAL">Fluvial</option>
            </select>
            <button
              type="button"
              className="tfd-btn tfd-btn-primary tfd-btn--icon-only tfd-btn--sm shrink-0"
              onClick={handleAdd}
              disabled={saving || !newNome.trim()}
              title="Salvar"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              className="tfd-btn tfd-btn-secondary tfd-btn--icon-only tfd-btn--sm shrink-0"
              onClick={handleCancel}
              disabled={saving}
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </FormField>
  );
}
