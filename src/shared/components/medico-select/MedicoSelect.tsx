'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Loader2, X, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import FormField from '@/shared/components/drawer/FormField';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

export interface MedicoValue {
  id: string;
  nome_completo: string;
  crm: string;
  crm_uf: string;
  especialidade?: string;
}

interface MedicoSelectProps {
  value?: MedicoValue | null;
  onChange: (medico: MedicoValue | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
] as const;

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function MedicoSelect({
  value,
  onChange,
  label = 'Médico',
  required = false,
  disabled = false,
  size = 'md',
}: MedicoSelectProps) {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---------- search state ---------- */
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MedicoValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- inline modal state ---------- */
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome_completo: '', crm: '', crm_uf: '', especialidade: '' });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  /* ---------- close dropdown on outside click ---------- */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ---------- search ---------- */
  const search = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // TODO: Substituir por useMedicos hook quando Agente 1 implementar
    const { data, error } = await supabase
      .from('medicos' as any)
      .select('id, nome_completo, crm, crm_uf, especialidade')
      .or(`nome_completo.ilike.%${term}%,crm.ilike.%${term}%`)
      .eq('ativo', true)
      .limit(20);

    if (!error && data) {
      setResults(data as unknown as MedicoValue[]);
    }
    setLoading(false);
  }, [supabase]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(medico: MedicoValue) {
    onChange(medico);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }

  /* ---------- inline modal ---------- */
  function openModal() {
    setForm({ nome_completo: query, crm: '', crm_uf: '', especialidade: '' });
    setModalError('');
    setShowModal(true);
    setOpen(false);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setModalError('');
  }

  async function handleSave() {
    if (!form.nome_completo.trim()) { setModalError('Nome completo e obrigatorio.'); return; }
    if (!form.crm.trim()) { setModalError('CRM e obrigatorio.'); return; }
    if (!form.crm_uf) { setModalError('UF do CRM e obrigatoria.'); return; }

    setSaving(true);
    setModalError('');

    try {
      const { data, error } = await supabase
        .from('medicos' as any)
        .insert({
          nome_completo: form.nome_completo.trim(),
          crm: form.crm.trim(),
          crm_uf: form.crm_uf,
          especialidade: form.especialidade.trim() || null,
          ativo: true,
        })
        .select('id, nome_completo, crm, crm_uf, especialidade')
        .single();

      if (error) {
        setModalError(error.message ?? 'Erro ao cadastrar medico.');
        setSaving(false);
        return;
      }

      if (data) {
        onChange(data as unknown as MedicoValue);
        setQuery('');
        setShowModal(false);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setModalError(e.message ?? 'Erro inesperado.');
    } finally {
      setSaving(false);
    }
  }

  /* ---------- render ---------- */
  const inputHeight = size === 'sm' ? '32px' : undefined;

  return (
    <>
      <FormField label={label} required={required}>
        <div ref={containerRef} style={{ position: 'relative' }}>
          {/* Selected value display */}
          {value ? (
            <div
              className="tfd-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                cursor: disabled ? 'default' : 'pointer',
                height: inputHeight,
              }}
            >
              <span
                style={{
                  color: 'var(--tfd-text-primary)',
                  fontSize: size === 'sm' ? '13px' : '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <strong>{value.nome_completo}</strong>
                <span style={{ color: 'var(--tfd-text-muted)', marginLeft: '6px' }}>
                  — CRM {value.crm}/{value.crm_uf}
                </span>
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    color: 'var(--tfd-text-muted)',
                  }}
                  aria-label="Limpar selecao"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            /* Search input */
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--tfd-text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={inputRef}
                type="text"
                className="tfd-input"
                placeholder="Buscar por nome ou CRM..."
                value={query}
                onChange={handleInputChange}
                onFocus={() => { if (query.trim()) setOpen(true); }}
                disabled={disabled}
                style={{
                  paddingLeft: '32px',
                  paddingRight: '28px',
                  height: inputHeight,
                  fontSize: size === 'sm' ? '13px' : undefined,
                }}
              />
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--tfd-text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}

          {/* Dropdown */}
          {open && !value && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: 'var(--tfd-surface-card)',
                border: '1px solid var(--tfd-surface-border)',
                borderRadius: 'var(--tfd-radius-md)',
                boxShadow: 'var(--tfd-shadow-lg)',
                zIndex: 50,
                maxHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Results list */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {loading && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px',
                      gap: '6px',
                      color: 'var(--tfd-text-muted)',
                      fontSize: '13px',
                    }}
                  >
                    <Loader2 size={14} className="animate-spin" />
                    Buscando...
                  </div>
                )}

                {!loading && query.trim() && results.length === 0 && (
                  <div
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      color: 'var(--tfd-text-muted)',
                      fontSize: '13px',
                    }}
                  >
                    Nenhum medico encontrado
                  </div>
                )}

                {!loading && results.map((medico) => (
                  <button
                    key={medico.id}
                    type="button"
                    onClick={() => handleSelect(medico)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--tfd-text-primary)',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--tfd-blue-50)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <strong>{medico.nome_completo}</strong>
                    <span style={{ color: 'var(--tfd-text-muted)', marginLeft: '6px' }}>
                      — CRM {medico.crm}/{medico.crm_uf}
                    </span>
                  </button>
                ))}
              </div>

              {/* Divider + "Cadastrar novo" */}
              <div
                style={{
                  borderTop: '1px solid var(--tfd-surface-border)',
                }}
              >
                <button
                  type="button"
                  onClick={openModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--tfd-primary-500)',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--tfd-blue-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Plus size={14} />
                  Cadastrar novo medico
                </button>
              </div>
            </div>
          )}
        </div>
      </FormField>

      {/* -------------------------------------------------- */}
      {/*  Inline registration modal                          */}
      {/* -------------------------------------------------- */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="tfd-card p-6 max-w-md w-full mx-4"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                style={{ backgroundColor: 'var(--tfd-blue-50)', color: 'var(--tfd-primary-500)' }}
              >
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                  Cadastrar novo medico
                </h3>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  Preencha os dados do medico solicitante
                </p>
              </div>
            </div>

            {/* Modal body */}
            <div className="space-y-4">
              {/* Nome completo */}
              <div>
                <label className="tfd-label">
                  Nome completo
                  <span style={{ color: 'var(--tfd-status-danger)' }}> *</span>
                </label>
                <input
                  type="text"
                  className="tfd-input"
                  placeholder="Nome completo do medico"
                  value={form.nome_completo}
                  onChange={(e) => setForm((f) => ({ ...f, nome_completo: e.target.value }))}
                />
              </div>

              {/* CRM + UF */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px' }}>
                <div>
                  <label className="tfd-label">
                    CRM
                    <span style={{ color: 'var(--tfd-status-danger)' }}> *</span>
                  </label>
                  <input
                    type="text"
                    className="tfd-input"
                    placeholder="000000"
                    value={form.crm}
                    onChange={(e) => setForm((f) => ({ ...f, crm: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="tfd-label">
                    UF
                    <span style={{ color: 'var(--tfd-status-danger)' }}> *</span>
                  </label>
                  <select
                    className="tfd-input"
                    value={form.crm_uf}
                    onChange={(e) => setForm((f) => ({ ...f, crm_uf: e.target.value }))}
                  >
                    <option value="">UF</option>
                    {UF_OPTIONS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Especialidade */}
              <div>
                <label className="tfd-label">Especialidade</label>
                <input
                  type="text"
                  className="tfd-input"
                  placeholder="Ex: Cardiologia, Ortopedia..."
                  value={form.especialidade}
                  onChange={(e) => setForm((f) => ({ ...f, especialidade: e.target.value }))}
                />
              </div>

              {/* Error */}
              {modalError && (
                <p className="text-xs font-medium" style={{ color: 'var(--tfd-status-error)' }}>
                  {modalError}
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                className="tfd-btn tfd-btn-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="tfd-btn tfd-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
