'use client';

import { Check } from 'lucide-react';

/** Tokens oficiais do TFD (os mesmos `--tfd-*` do sistema em dev). */
export const C = {
  ink: 'var(--tfd-text-primary)',
  texto: 'var(--tfd-text-secondary)',
  apoio: 'var(--tfd-text-muted)',
  claro: 'var(--tfd-400)',
  borda: 'var(--tfd-surface-border)',
  campo: 'var(--tfd-300)',
  azul: 'var(--tfd-blue-500)',
  azulTexto: 'var(--tfd-blue-700)',
  azulSuave: 'var(--tfd-blue-50)',
  azulBorda: 'var(--tfd-blue-200)',
  fundo: 'var(--tfd-50)',
  sombra: 'var(--tfd-shadow-sm)',
};

/** Rótulo de campo no padrão dos filtros do sistema: caixa alta, 11px. */
export const rotuloCampo: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--tfd-text-muted)', marginBottom: 6, lineHeight: 1.2,
};

export const campoStyle: React.CSSProperties = {
  minHeight: 36, padding: '0 10px', border: `1px solid ${C.campo}`, borderRadius: 'var(--tfd-radius-md)',
  background: 'white', fontSize: 14, color: C.ink, width: '100%',
};

/** Pílula selecionável. Usada em períodos e opções de filtro. */
export function Pilula({
  ativo, onClick, children, role = 'checkbox', title,
}: { ativo: boolean; onClick: () => void; children: React.ReactNode; role?: 'checkbox' | 'radio'; title?: string }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={ativo}
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        minHeight: 36, padding: '0 12px', borderRadius: 'var(--tfd-radius-md)', fontSize: 14, fontWeight: 500,
        border: `1px solid ${ativo ? C.azul : C.campo}`,
        background: ativo ? C.azulSuave : 'white', color: ativo ? C.azulTexto : C.texto,
        outlineColor: C.azul,
      }}
    >
      {ativo && <Check size={14} strokeWidth={2.5} />}
      {children}
    </button>
  );
}
