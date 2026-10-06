'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowRight, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

/* -------------------------------------------------- */
/*  Tipos                                              */
/* -------------------------------------------------- */

export type ConfirmTone = 'create' | 'edit' | 'delete' | 'warning';

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
  /** Conteúdo extra (campos, avisos) renderizado entre a descrição e o rodapé. */
  children?: React.ReactNode;
  /** Desabilita só o botão de confirmar (ex.: campo obrigatório vazio). */
  confirmDisabled?: boolean;
  /** Ícone do cabeçalho no lugar do ícone padrão do tom. */
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  /** Ícone do botão de confirmar no lugar do padrão do tom. */
  confirmIcon?: React.ReactNode;
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
  warning: {
    icon: AlertTriangle,
    iconBg: 'var(--tfd-status-caution-bg)',
    iconFg: 'var(--tfd-status-caution-accent)',
    btnClass: 'tfd-btn tfd-btn-primary',
    defaultConfirm: 'Confirmar',
    defaultTitle: 'Confirmar ação',
  },
};

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  children,
  confirmDisabled,
  icon,
  confirmIcon,
}: ConfirmDialogProps) {
  const tituloId = useId();
  const descricaoId = useId();
  const caixaRef = useRef<HTMLDivElement>(null);

  /* Fechar com Esc */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, busy]);

  /* Portal só monta no client */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  /* Foco: entra no primeiro campo marcado com data-autofocus (ou no botão
     Cancelar) ao abrir e volta para quem abriu o diálogo ao fechar. */
  useEffect(() => {
    if (!open || !mounted) return;
    const anterior = document.activeElement as HTMLElement | null;
    const caixa = caixaRef.current;
    const alvo = caixa?.querySelector<HTMLElement>('[data-autofocus]') ?? caixa?.querySelector<HTMLElement>('[data-cancelar]');
    alvo?.focus();
    return () => { anterior?.focus?.(); };
  }, [open, mounted]);

  /* Tab e Shift+Tab circulam só dentro do diálogo. */
  const prenderFoco = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !caixaRef.current) return;
    const itens = [...caixaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
    if (itens.length === 0) return;
    const primeiro = itens[0];
    const ultimo = itens[itens.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  };

  if (!open || !mounted) return null;

  const v = TONE_VISUAL[tone];
  const Icon = icon ?? v.icon;
  const changedDiff = diff?.filter((d) => normalizeValue(d.before) !== normalizeValue(d.after)) ?? [];

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
      onClick={() => !busy && onClose()}
    >
      <div
        ref={caixaRef}
        role={tone === 'delete' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={description ? descricaoId : undefined}
        className="tfd-card w-full max-w-md"
        style={{ backgroundColor: 'var(--tfd-surface-card, white)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={prenderFoco}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: tone === 'delete' ? v.iconBg : v.iconBg }}
          >
            {tone === 'delete' && !icon ? (
              <AlertTriangle size={18} style={{ color: v.iconFg }} />
            ) : (
              <Icon size={18} style={{ color: v.iconFg }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 id={tituloId} className="text-base font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
              {title}
            </h3>
            {subject && (
              <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                {subject}
              </p>
            )}
            {description && (
              <p id={descricaoId} className="text-sm mt-1" style={{ color: 'var(--tfd-text-secondary)' }}>
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

        {children && <div className="mb-4">{children}</div>}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            data-cancelar
            className="tfd-btn tfd-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={v.btnClass}
            onClick={onConfirm}
            disabled={busy || confirmDisabled || (tone === 'edit' && diff !== undefined && changedDiff.length === 0)}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Processando...
              </>
            ) : (
              <>
                {confirmIcon ?? (tone === 'delete' && <Trash2 size={14} />)}
                {confirmLabel ?? v.defaultConfirm}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
