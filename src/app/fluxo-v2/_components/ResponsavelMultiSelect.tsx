'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { listarUsuariosAtivos, type UsuarioAtivoResumo } from '@/services/usuarios.service';
import type { ResponsavelSolicitacao } from '@/core/mocks/fluxo-v2-v3-seed';

interface Props {
  value: ResponsavelSolicitacao[];
  onChange: (responsaveis: ResponsavelSolicitacao[]) => void;
  disabled?: boolean;
}

/**
 * Seletor de múltiplas pessoas responsáveis pela solicitação no setor de
 * destino. Mesma base de usuários do antigo `ResponsavelSelect` — ver a
 * investigação registrada ali sobre por que a lista traz todos os usuários
 * ativos, sem filtrar por setor. Aqui a seleção vira uma lista de chips
 * removíveis acima de um dropdown com checkbox por pessoa, em vez de um
 * único valor.
 */
export default function ResponsavelMultiSelect({ value, onChange, disabled }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioAtivoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    listarUsuariosAtivos().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setUsuarios([]);
      } else {
        setUsuarios(data);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, [open]);

  function toggle(u: UsuarioAtivoResumo) {
    const jaSelecionado = value.some((r) => r.id === u.id);
    if (jaSelecionado) {
      onChange(value.filter((r) => r.id !== u.id));
    } else {
      onChange([...value, { id: u.id, nome: u.nome_completo }]);
    }
  }

  function remover(id: string) {
    onChange(value.filter((r) => r.id !== id));
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || loading}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[13px] text-left"
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 8,
          color: value.length ? '#1A1D2B' : '#94A3B8',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
        }}
      >
        <span>
          {loading
            ? 'Carregando usuários...'
            : value.length === 0
              ? 'Selecione a(s) pessoa(s) responsável(is)...'
              : `${value.length} ${value.length === 1 ? 'pessoa selecionada' : 'pessoas selecionadas'}`}
        </span>
        <ChevronDown size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
      </button>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium"
              style={{
                background: '#EBF0FF',
                color: '#1D3FD6',
                borderRadius: 999,
              }}
            >
              {r.nome}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remover(r.id)}
                  aria-label={`Remover ${r.nome}`}
                  style={{ color: '#1D3FD6', display: 'inline-flex' }}
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {open && !disabled && !loading && (
        <div
          className="absolute z-20 mt-1 w-full overflow-auto"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            maxHeight: 220,
            boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
          }}
        >
          {usuarios.length === 0 ? (
            <p className="px-3 py-2.5 text-[12.5px]" style={{ color: '#9CA3AF' }}>
              Nenhum usuário ativo encontrado.
            </p>
          ) : (
            usuarios.map((u) => {
              const marcado = value.some((r) => r.id === u.id);
              return (
                <label
                  key={u.id}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer transition-colors"
                  style={{ color: '#1A1D2B' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => toggle(u)}
                    style={{ accentColor: 'var(--tfd-blue)' }}
                  />
                  {u.nome_completo}
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
