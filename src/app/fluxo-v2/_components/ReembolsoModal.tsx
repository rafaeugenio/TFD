'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  /** Título do modal — ex: "Reembolsar passagem" ou "Reembolsar ajuda de custo". */
  titulo: string;
  /** Linha de contexto exibida sob o título — ex: "São Luís/MA → Brasília/DF". */
  subtitulo?: string;
  /** Valor cheio do item — usado como teto da validação. */
  valorTotal: number;
  /** Valor de reembolso já registrado (modo edição). */
  valorAtual?: number;
  dataAtual?: string;
  onClose: () => void;
  /** Chamado quando o usuário confirma. */
  onConfirm: (valor: number, data: string) => void;
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ReembolsoModal({
  open,
  titulo,
  subtitulo,
  valorTotal,
  valorAtual,
  dataAtual,
  onClose,
  onConfirm,
}: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [valor, setValor] = useState<string>('');
  const [data, setData] = useState<string>(hoje);

  useEffect(() => {
    if (open) {
      setValor(valorAtual != null ? String(valorAtual) : '');
      setData(dataAtual ?? hoje);
    }
  }, [open, valorAtual, dataAtual, hoje]);

  if (!open) return null;

  const valorNum = parseFloat(valor.replace(',', '.'));
  const valorValido = !Number.isNaN(valorNum) && valorNum > 0 && valorNum <= valorTotal;
  const excedeu = !Number.isNaN(valorNum) && valorNum > valorTotal;
  const dataValida = Boolean(data);
  const podeConfirmar = valorValido && dataValida;
  const valorEfetivo = valorValido ? valorTotal - valorNum : valorTotal;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 12,
          width: 'min(480px, 92vw)',
          padding: 24,
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#FEF3C7', color: '#92400E',
            }}
          >
            <RotateCcw size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-semibold" style={{ color: '#1A1D2B' }}>{titulo}</h3>
            {subtitulo && (
              <p className="text-[12.5px] mt-0.5" style={{ color: '#6B7280' }}>{subtitulo}</p>
            )}
          </div>
        </div>

        {/* Valor original */}
        <div className="flex items-baseline justify-between mb-4 px-3 py-2 rounded-lg"
             style={{ background: '#F8FAFC', border: '1px solid var(--tfd-surface-border)' }}>
          <span className="text-[11px] uppercase tracking-wider" style={{ color: '#64748B' }}>
            Valor cheio
          </span>
          <span className="font-mono font-semibold text-[14px]" style={{ color: '#1A1D2B' }}>
            {fmtBRL(valorTotal)}
          </span>
        </div>

        {/* Data do reembolso */}
        <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
          Data do reembolso *
        </label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full px-3 py-2 text-[13px] mb-3"
          style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
        />

        {/* Valor do reembolso */}
        <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
          Valor reembolsado * <span className="font-normal" style={{ color: '#94A3B8' }}>(parcial ou cheio)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: '#94A3B8' }}>
            R$
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            max={valorTotal}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full pl-10 pr-3 py-2 text-[13px] font-mono"
            style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
          />
        </div>

        {excedeu && (
          <div
            className="flex items-start gap-2 px-3 py-2 mt-2"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}
          >
            <AlertTriangle size={14} style={{ color: '#991B1B', flexShrink: 0, marginTop: 2 }} />
            <span className="text-[11px] font-medium" style={{ color: '#991B1B' }}>
              O valor reembolsado não pode ser maior que o valor cheio.
            </span>
          </div>
        )}

        {/* Preview do efeito nos KPIs */}
        {valorValido && (
          <div
            className="flex items-baseline justify-between mt-3 px-3 py-2 rounded-lg"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <span className="text-[11px] uppercase tracking-wider" style={{ color: '#15803D' }}>
              Valor efetivo nos KPIs
            </span>
            <span className="font-mono font-semibold text-[14px]" style={{ color: '#15803D' }}>
              {fmtBRL(valorEfetivo)}
            </span>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="tfd-btn tfd-btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(valorNum, data)}
            disabled={!podeConfirmar}
            className="tfd-btn tfd-btn-primary"
          >
            <RotateCcw size={14} />
            Confirmar reembolso
          </button>
        </div>
      </div>
    </div>
  );
}
