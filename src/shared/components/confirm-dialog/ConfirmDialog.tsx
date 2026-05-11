'use client';

import { useEffect } from 'react';
import { AlertTriangle, ArrowRight, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

/* -------------------------------------------------- */
/*  Tipos                                              */
/* -------------------------------------------------- */

export type ConfirmTone = 'create' | 'edit' | 'delete';

export interface DiffField {
  /** Rótulo apresentável do campo. */
  label: string;
  /** Valor anterior (em texto). `undefined` ou string vazia vira "—". */
  before?: string | number | null;
  /** Valor novo (em texto). */
  after?: string | number | null;
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Tom visual do modal (decide ícone, cor do botão primário e texto default). */
  tone: ConfirmTone;
  /** Cabeçalho do modal. */
  title: string;
  /** Subtítulo opcional (geralmente o nome/identidade do registro). */
  subject?: string;
  /** Descrição livre acima dos diffs. */
  description?: React.ReactNode;
  /** Lista de campos para mostrar o diff (modo edit). */
  diff?: DiffField[];
  /** Texto do botão de confirmação. Padrões variam por tone. */
  confirmLabel?: string;
  /** Texto do botão de cancelar. */
  cancelLabel?: string;
  /** Está executando a ação remota? Desabilita botões e mostra spinner. */
  busy?: boolean;
}

const TONE_VISUAL: Record<ConfirmTone, {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  iconBg: string;
  iconFg: string;
  btnClass: string;
  defaultConfirm: string;
  defaultTitle: string;
}> = {
  create: {
    icon: Plus,
    iconBg: 'var(--tfd-primary-50, #EBF0FF)',
    iconFg: 'var(--tfd-primary-600, #146BFA)',
    btnClass: 'tfd-btn tfd-btn-primary',
    defaultConfirm: 'Confirmar cadastro',
    defaultTitle: 'Confirmar cadastro',
  },
  edit: {
    icon: Pencil,
    iconBg: 'var(--tfd-primary-50, #EBF0FF)',
    iconFg: 'var(--tfd-primary-600, #146BFA)',
    btnClass: 'tfd-btn tfd-btn-primary',
    defaultConfirm: 'Confirmar alterações',
    defaultTitle: 'Confirmar alterações',
  },
  delete: {
    icon: Trash2,
    iconBg: '#fef2f2',
    iconFg: '#dc2626',
    btnClass: 'tfd-btn tfd-btn-danger',
    defaultConfirm: 'Excluir',
    defaultTitle: 'Confirmar exclusão',
  },
};

/* -------------------------------------------------- */
/*  Componente                                         */
/* -------------------------------------------------- */

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  tone,
  title,
  subject,
  description,
  diff,
  confirmLabel,
  cancelLabel = 'Cancelar',
  busy,
}: ConfirmDialogProps) {
  /* Fechar com Esc */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, busy]);

  if (!open) return null;

  const v = TONE_VISUAL[tone];
  const Icon = v.icon;
  const changedDiff = diff?.filter((d) => normalizeValue(d.before) !== normalizeValue(d.after)) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={() => !busy && onClose()}
    >
      <div
        className="tfd-card w-full max-w-md"
        style={{ backgroundColor: 'var(--tfd-surface-card, white)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: tone === 'delete' ? v.iconBg : v.iconBg }}
          >
            {tone === 'delete' ? (
              <AlertTriangle size={18} style={{ color: v.iconFg }} />
            ) : (
              <Icon size={18} style={{ color: v.iconFg }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
              {title}
            </h3>
            {subject && (
              <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                {subject}
              </p>
            )}
            {description && (
              <p className="text-sm mt-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Diff (modo edit) */}
        {tone === 'edit' && changedDiff.length > 0 && (
          <div
            className="rounded-lg p-3 mb-4"
            style={{ backgroundColor: 'var(--tfd-surface-50, #F8FAFC)', border: '1px solid var(--tfd-surface-border, #E2E8F0)' }}
          >
            <ul className="flex flex-col gap-1.5">
              {changedDiff.map((d, idx) => (
                <li key={idx} className="text-[13px] leading-snug">
                  <span className="font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>
                    {d.label}:
                  </span>{' '}
                  <span style={{ color: '#94A3B8', textDecoration: 'line-through' }}>
                    {formatValue(d.before)}
                  </span>{' '}
                  <ArrowRight size={11} className="inline-block align-middle mx-1" style={{ color: '#94A3B8' }} />{' '}
                  <span style={{ color: 'var(--tfd-text-primary)', fontWeight: 500 }}>
                    {formatValue(d.after)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resumo (modo create) — diff funciona como "campos preenchidos" */}
        {tone === 'create' && diff && diff.length > 0 && (
          <div
            className="rounded-lg p-3 mb-4"
            style={{ backgroundColor: 'var(--tfd-surface-50, #F8FAFC)', border: '1px solid var(--tfd-surface-border, #E2E8F0)' }}
          >
            <ul className="flex flex-col gap-1.5">
              {diff
                .filter((d) => normalizeValue(d.after) !== '')
                .map((d, idx) => (
                  <li key={idx} className="text-[13px] leading-snug">
                    <span className="font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {d.label}:
                    </span>{' '}
                    <span style={{ color: 'var(--tfd-text-primary)', fontWeight: 500 }}>
                      {formatValue(d.after)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Edit sem mudanças */}
        {tone === 'edit' && diff && changedDiff.length === 0 && (
          <p className="text-sm mb-4 italic" style={{ color: 'var(--tfd-text-muted)' }}>
            Nenhum campo foi alterado.
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            className="tfd-btn tfd-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            className={v.btnClass}
            onClick={onConfirm}
            disabled={busy || (tone === 'edit' && diff !== undefined && changedDiff.length === 0)}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Processando...
              </>
            ) : (
              <>
                {tone === 'delete' && <Trash2 size={14} />}
                {confirmLabel ?? v.defaultConfirm}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function normalizeValue(v: string | number | null | undefined): string {
  if (v == null) return '';
  return String(v).trim();
}

function formatValue(v: string | number | null | undefined): string {
  const norm = normalizeValue(v);
  return norm === '' ? '—' : norm;
}

/**
 * Constrói uma lista de diffs comparando dois objetos a partir de uma config de campos.
 * Útil para gerar o array `diff` da prop do ConfirmDialog.
 *
 * @example
 *   const diff = buildDiff(antes, depois, [
 *     { key: 'nome', label: 'Nome' },
 *     { key: 'cpf', label: 'CPF', format: maskCPF },
 *   ]);
 */
export function buildDiff<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: T,
  fields: { key: keyof T; label: string; format?: (v: unknown) => string }[],
): DiffField[] {
  return fields.map(({ key, label, format }) => ({
    label,
    before: before == null ? '' : format ? format(before[key]) : toString(before[key]),
    after: format ? format(after[key]) : toString(after[key]),
  }));
}

function toString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}
