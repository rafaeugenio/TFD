'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { useToast } from '@/shared/components/toast/Toast';
import { fmtDataBR } from '@/shared/utils/fmtData';
import { calcularValorAjuda, type AjudaCustoMock } from '@/core/mocks/fluxo-v2-v3-seed';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  solicitacaoNumero: string;
  pacienteId: string;
  ajuda: AjudaCustoMock | null;
  /** Abre o drawer de novo período já preenchido para o complemento (volta postergada). */
  onAbrirComplemento: (prefill: { dataInicio: string; dataFim: string; observacao: string }) => void;
}

/**
 * PBI — Saldo de ajuda de custo entre ciclos (07/08/2026, sinal corrigido em
 * 11/08/2026). Recalcula um período já lançado a partir da data real de
 * volta:
 * - Volta antecipada (pagou mais do que devia): mantém o período atualizado
 *   e a diferença vira saldo NEGATIVO do paciente (ele recebeu a mais),
 *   descontada do próximo pagamento, nunca devolvida em dinheiro.
 * - Volta postergada (pagou menos do que devia): mantém o período como
 *   estava e abre um novo lançamento complementar pelos dias que faltam.
 * - Sem diferença: só atualiza as datas.
 */
export default function RecalcularVoltaAjudaModal({
  open,
  onClose,
  solicitacaoId,
  solicitacaoNumero,
  pacienteId,
  ajuda,
  onAbrirComplemento,
}: Props) {
  const { editarAjudaCusto, aplicarDebitoSaldo } = useFluxoV2State();
  const toast = useToast();
  const [novaDataVolta, setNovaDataVolta] = useState('');

  useEffect(() => {
    if (open) setNovaDataVolta(ajuda?.dataFim ?? '');
  }, [open, ajuda]);

  if (!open || !ajuda) return null;

  const valorAnterior = calcularValorAjuda(ajuda.dataInicio, ajuda.dataFim, ajuda.pernoiteRetorno);
  const preview = novaDataVolta
    ? calcularValorAjuda(ajuda.dataInicio, novaDataVolta, ajuda.pernoiteRetorno)
    : null;
  const delta = preview ? valorAnterior.valor - preview.valor : 0;
  const antecipada = preview !== null && delta > 0.005;
  const postergada = preview !== null && delta < -0.005;
  const semDiferenca = preview !== null && !antecipada && !postergada;
  const valido = !!novaDataVolta && novaDataVolta >= ajuda.dataInicio;

  function handleConfirmar() {
    if (!ajuda || !preview || !valido) return;

    if (antecipada) {
      editarAjudaCusto(solicitacaoId, ajuda.id, { dataFim: novaDataVolta });
      aplicarDebitoSaldo({
        pacienteId,
        valor: delta,
        motivo: `Volta antecipada em ${fmtDataBR(novaDataVolta)}: pago ${fmtBRL(valorAnterior.valor)} para ${valorAnterior.dias} dias, devido ${fmtBRL(preview.valor)} para ${preview.dias} dias. Diferença vira saldo negativo, descontada do próximo pagamento.`,
        solicitacaoDestinoNumero: solicitacaoNumero,
      });
      toast.success('Período atualizado e diferença descontada', `${fmtBRL(delta)} viram saldo negativo do paciente`);
      onClose();
      return;
    }

    if (postergada) {
      const complementoInicio = ajuda.dataFim;
      onClose();
      onAbrirComplemento({
        dataInicio: complementoInicio,
        dataFim: novaDataVolta,
        observacao: 'Complemento por remarcação da volta.',
      });
      return;
    }

    // Sem diferença — só atualiza as datas.
    editarAjudaCusto(solicitacaoId, ajuda.id, { dataFim: novaDataVolta });
    toast.success('Período atualizado', `${fmtDataBR(ajuda.dataInicio)} → ${fmtDataBR(novaDataVolta)}`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 12, width: 'min(480px, 92vw)', padding: 24 }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 36, height: 36, borderRadius: 8, background: '#ECFEFF', color: '#0E7490' }}
          >
            <RefreshCw size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-semibold" style={{ color: '#1A1D2B' }}>Recalcular pela volta real</h3>
            <p className="text-[12.5px] mt-0.5" style={{ color: '#6B7280' }}>
              Período pago: {fmtDataBR(ajuda.dataInicio)} → {fmtDataBR(ajuda.dataFim)} ({valorAnterior.dias} dia(s), {fmtBRL(valorAnterior.valor)})
            </p>
          </div>
        </div>

        <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
          Data real da volta *
        </label>
        <input
          type="date"
          value={novaDataVolta}
          min={ajuda.dataInicio}
          onChange={(e) => setNovaDataVolta(e.target.value)}
          className="w-full px-3 py-2 text-[13px] mb-3"
          style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
        />

        {preview && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 mb-2"
            style={{
              background: antecipada ? '#FEF2F2' : postergada ? '#FFFBEB' : '#F8FAFC',
              border: `1px solid ${antecipada ? '#FECACA' : postergada ? '#FDE68A' : 'var(--tfd-surface-border)'}`,
              borderRadius: 8,
            }}
          >
            {antecipada && <TrendingDown size={15} style={{ color: '#B91C1C', flexShrink: 0, marginTop: 1 }} />}
            {postergada && <TrendingUp size={15} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />}
            <div className="text-[12px]" style={{ color: antecipada ? '#B91C1C' : postergada ? '#92400E' : '#475569' }}>
              <p className="font-semibold mb-0.5">
                Novo período: {preview.dias} dia(s), {fmtBRL(preview.valor)}
              </p>
              {antecipada && (
                <p>
                  Volta antecipada. A diferença de <strong>{fmtBRL(delta)}</strong> vira saldo negativo do
                  paciente, descontada do próximo pagamento, sem devolução.
                </p>
              )}
              {postergada && (
                <p>
                  Volta postergada. Faltam <strong>{fmtBRL(-delta)}</strong>. Ao confirmar, abrimos um
                  lançamento complementar para os dias que faltam.
                </p>
              )}
              {semDiferenca && <p>Sem diferença de valor. Apenas as datas serão atualizadas.</p>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="tfd-btn tfd-btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!valido}
            className="tfd-btn tfd-btn-primary"
          >
            <RefreshCw size={14} />
            Confirmar recálculo
          </button>
        </div>
      </div>
    </div>
  );
}
