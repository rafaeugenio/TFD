'use client';

/**
 * Select de tabela auxiliar com botão "+ Cadastrar" inline.
 *
 * - Carrega valores via `listarPorCategoria(categoria)` ao montar
 * - Renderiza um select padronizado
 * - "+ Cadastrar" abre um mini-form (nome) que persiste via `criarItemAuxiliar`
 *   e injeta o novo item já selecionado
 *
 * Uso típico (em qualquer drawer/form):
 *   <AuxSelectInline
 *     categoria="canal_comunicacao"
 *     label="Meio de contato"
 *     value={meioContato}
 *     onChange={setMeioContato}
 *     placeholder="Selecione..."
 *   />
 */

import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import {
  listarPorCategoria,
  criarItemAuxiliar,
} from '@/services/tabelas-auxiliares.service';

interface Item {
  codigo: string;
  nome: string;
}

interface Props {
  categoria: string;
  label?: string;
  value: string;
  onChange: (codigo: string) => void;
  placeholder?: string;
  /** Quando true, oculta o botão "+ Cadastrar". */
  disableAdd?: boolean;
  className?: string;
}

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

export default function AuxSelectInline({
  categoria,
  label,
  value,
  onChange,
  placeholder = 'Selecione...',
  disableAdd = false,
  className = '',
}: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await listarPorCategoria(categoria);
    if (error) {
      console.warn(`[AuxSelectInline:${categoria}]`, error.message);
    } else {
      const seen = new Set<string>();
      const dedup = ((data ?? []) as unknown as Item[]).filter((i) => {
        const k = i.nome.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setItems(dedup);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [categoria]);

  async function salvar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setSaving(true);
    const codigo = nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const { data: criado, error } = await criarItemAuxiliar({
      categoria,
      codigo: codigo || nome.toUpperCase().replace(/\s+/g, '_'),
      nome,
    });
    setSaving(false);
    if (error) {
      console.warn(`[AuxSelectInline:${categoria}] criar:`, error.message);
      return;
    }
    if (criado) {
      const novo = criado as unknown as Item;
      setItems((prev) => [...prev, novo]);
      onChange(novo.codigo);
    }
    setNovoNome('');
    setFormOpen(false);
  }

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
            {label}
          </label>
          {!disableAdd && !formOpen && (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="text-[11px] inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--tfd-blue)' }}
            >
              <Plus size={11} /> Cadastrar
            </button>
          )}
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full px-3 py-2 text-[13px]"
        style={inputStyle}
      >
        <option value="">
          {loading
            ? 'Carregando...'
            : items.length === 0
              ? 'Nenhum item cadastrado'
              : placeholder}
        </option>
        {items.map((i) => (
          <option key={i.codigo} value={i.codigo}>
            {i.nome}
          </option>
        ))}
      </select>

      {formOpen && (
        <div
          className="mt-2 p-3 flex flex-col gap-2"
          style={{ background: '#F8FAFC', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
        >
          <p className="text-[12px] font-semibold" style={{ color: '#1A1D2B' }}>
            Cadastrar novo item
          </p>
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome"
            className="px-3 py-2 text-[13px] min-w-0"
            style={inputStyle}
            autoFocus
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setFormOpen(false); setNovoNome(''); }}
              className="tfd-btn tfd-btn-ghost tfd-btn--sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={saving || !novoNome.trim()}
              className="tfd-btn tfd-btn-primary tfd-btn--sm"
            >
              {saving
                ? <><Loader2 size={12} className="animate-spin" /> Salvando...</>
                : <><Plus size={12} /> Adicionar</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
