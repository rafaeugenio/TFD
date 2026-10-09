'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';
import { criarItemAuxiliar } from '@/services/tabelas-auxiliares.service';
import { invalidateCache } from '@/shared/hooks/useLookup';
import { createClient } from '@/lib/supabase/client';

interface LookupOption {
  value: string;
  label: string;
}

interface LookupSelectProps {
  /** Categoria na tabela auxiliar (ex: 'especialidade', 'tipo_unidade') */
  categoria: string;
  /** Label do FormField */
  label: string;
  /** Valor selecionado */
  value: string;
  /** Callback ao mudar o valor */
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Qual campo usar como value do select: 'nome' salva o nome, 'codigo' salva o código, 'id' salva o UUID */
  valueField?: 'codigo' | 'nome' | 'id';
  /** Ordenar por: 'nome' ou 'ordem' */
  orderBy?: 'nome' | 'ordem';
  /** Códigos que não aparecem como opção (o item continua no banco para
   *  registros antigos). Ex.: 'OBITO' em motivo de encerramento. */
  excluirCodigos?: string[];
}

export default function LookupSelect({
  categoria,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Selecione...',
  valueField = 'codigo',
  orderBy = 'nome',
  excluirCodigos,
}: LookupSelectProps) {
  // Chave estável: o array chega novo a cada render do pai.
  const excluirChave = (excluirCodigos ?? []).map((c) => c.toUpperCase()).join('|');
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOptions = useCallback(() => {
    setLoading(true);
    const excluir = new Set(excluirChave ? excluirChave.split('|') : []);
    const selectFields = valueField === 'id' ? 'id, codigo, nome' : 'codigo, nome';

    createClient()
      .from('tabelas_auxiliares')
      .select(selectFields)
      .eq('categoria', categoria)
      .eq('ativo', true)
      .order(orderBy)
      .then(({ data, error }) => {
        if (error || !data) {
          setOptions([]);
        } else {
          const rows = (data as unknown as Record<string, string>[])
            .filter((r) => !excluir.has(String(r.codigo ?? '').toUpperCase()));
          setOptions(
            rows.map((r) => ({
              value: valueField === 'id' ? r.id : valueField === 'codigo' ? r.codigo : r.nome,
              label: r.nome,
            })),
          );
        }
        setLoading(false);
      });
  }, [categoria, valueField, orderBy, excluirChave]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;

    setSaving(true);
    try {
      const codigoAuto = name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const { error } = await criarItemAuxiliar({
        categoria,
        codigo: codigoAuto,
        nome: name,
      });

      if (error) {
        return;
      }

      invalidateCache(categoria);
      setAdding(false);
      setNewName('');

      // Recarrega opções e seleciona o novo item
      const supabase = createClient();
      const selectFields = valueField === 'id' ? 'id, codigo, nome' : 'codigo, nome';
      const excluir = new Set(excluirChave ? excluirChave.split('|') : []);
      const { data } = await supabase
        .from('tabelas_auxiliares')
        .select(selectFields)
        .eq('categoria', categoria)
        .eq('ativo', true)
        .order(orderBy);

      if (data) {
        const rows = (data as unknown as Record<string, string>[])
          .filter((r) => !excluir.has(String(r.codigo ?? '').toUpperCase()));
        const mapped = rows.map((r) => ({
          value: valueField === 'id' ? r.id : valueField === 'codigo' ? r.codigo : r.nome,
          label: r.nome,
        }));
        setOptions(mapped);

        // Seleciona automaticamente o item recém-criado
        const created = mapped.find((o) => o.label === name);
        if (created) onChange(created.value);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setAdding(false);
    setNewName('');
  }

  return (
    <FormField label={label} required={required}>
      <div className="flex gap-1.5">
        <select
          className="tfd-input flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
        >
          <option value="">{loading ? 'Carregando...' : placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {!disabled && (
          <button
            type="button"
            className="tfd-btn tfd-btn-secondary tfd-btn--icon-only shrink-0"
            title={`Adicionar ${label.toLowerCase()}`}
            onClick={() => setAdding(true)}
            style={{ minWidth: '36px', height: '36px' }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {adding && (
        <div
          className="mt-2 p-3 rounded-lg flex gap-2 items-end"
          style={{
            backgroundColor: 'var(--tfd-surface-secondary)',
            border: '1px solid var(--tfd-surface-border)',
          }}
        >
          <div className="flex-1">
            <label className="tfd-label text-xs mb-1 block" style={{ color: 'var(--tfd-text-secondary)' }}>
              Novo item
            </label>
            <input
              type="text"
              className="tfd-input tfd-input--sm"
              placeholder={`Nome do(a) ${label.toLowerCase()}...`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') handleCancel();
              }}
              autoFocus
              disabled={saving}
            />
          </div>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--icon-only tfd-btn--sm shrink-0"
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
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
      )}
    </FormField>
  );
}
