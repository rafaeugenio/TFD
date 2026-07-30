'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import type { AjudaCustoOption } from './DespachoFinanceiroDrawer';

export interface ReciboSelecaoItem {
  id: string;
  justificativa: string;
}

interface Props {
  open: boolean;
  ajudasCusto: AjudaCustoOption[];
  /** Última seleção confirmada, para reabrir o drawer já preenchido. */
  selecaoInicial?: ReciboSelecaoItem[];
  onClose: () => void;
  /** Chamado ao confirmar, com as ajudas escolhidas e a justificativa de cada uma. */
  onGerar: (selecao: ReciboSelecaoItem[]) => void;
}

const JUSTIFICATIVA_MAX = 500;

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

/**
 * Ajuste do cliente (2026-07): o recibo de ajuda de custo (SEI) deixa de
 * referenciar um único ciclo escolhido em outro lugar e passa a permitir
 * selecionar uma ou mais ajudas de custo cadastradas na solicitação, cada
 * uma com a própria justificativa (obrigatória). A geração acontece direto
 * por este drawer: não há mais uma etapa separada de seleção prévia.
 */
export default function ReciboAjudaCustoDrawer({
  open,
  ajudasCusto,
  selecaoInicial,
  onClose,
  onGerar,
}: Props) {
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const marcados: Record<string, boolean> = {};
    const textos: Record<string, string> = {};
    for (const item of selecaoInicial ?? []) {
      marcados[item.id] = true;
      textos[item.id] = item.justificativa;
    }
    setSelecionados(marcados);
    setJustificativas(textos);
  }, [open, selecaoInicial]);

  const temAjudas = ajudasCusto.length > 0;
  const idsSelecionados = ajudasCusto.filter((a) => selecionados[a.id]).map((a) => a.id);
  const totalSelecionadas = idsSelecionados.length;
  const todasJustificadas = idsSelecionados.every(
    (id) => (justificativas[id] ?? '').trim().length > 0,
  );
  const podeGerar = totalSelecionadas > 0 && todasJustificadas;

  function alternar(id: string, marcado: boolean) {
    setSelecionados((prev) => ({ ...prev, [id]: marcado }));
  }

  function atualizarJustificativa(id: string, texto: string) {
    if (texto.length > JUSTIFICATIVA_MAX) return;
    setJustificativas((prev) => ({ ...prev, [id]: texto }));
  }

  function confirmar() {
    if (!podeGerar) return;
    onGerar(idsSelecionados.map((id) => ({ id, justificativa: justificativas[id]?.trim() ?? '' })));
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Gerar recibo de ajuda de custo"
      subtitle="Selecione as ajudas de custo que serão incluídas no documento do SEI."
      width="560px"
      footer={
        <>
          <span className="flex-1 text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
            As justificativas serão exibidas no recibo.
          </span>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={confirmar}
            disabled={!podeGerar}
            title={
              !podeGerar
                ? 'Selecione ao menos uma ajuda de custo e informe a justificativa de cada item'
                : undefined
            }
          >
            Gerar documento
          </button>
        </>
      }
    >
      {!temAjudas ? (
        <div
          className="flex items-center gap-2 px-3 py-2.5 text-[12px]"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C' }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          Nenhuma ajuda de custo cadastrada nesta solicitação. Cadastre um período antes de gerar o recibo.
        </div>
      ) : (
        <>
          <div
            className="flex items-start gap-2.5 mb-4 px-3 py-2.5"
            style={{
              background: 'var(--tfd-info-bg)',
              border: '1px solid var(--tfd-blue-200)',
              borderRadius: 8,
              color: 'var(--tfd-blue-800)',
            }}
          >
            <Info size={15} style={{ color: 'var(--tfd-info)', flexShrink: 0, marginTop: 1 }} />
            <p className="text-[12px] leading-relaxed">
              É necessário selecionar <strong>ao menos uma ajuda de custo</strong> cadastrada.
              Informe uma justificativa para cada item.
            </p>
          </div>

          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-semibold" style={{ color: '#6B7280' }}>
              Ajudas de custo <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <span className="text-[11px] font-medium" style={{ color: 'var(--tfd-text-muted)' }}>
              {totalSelecionadas} selecionada{totalSelecionadas === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {ajudasCusto.map((a) => {
              const marcado = !!selecionados[a.id];
              const texto = justificativas[a.id] ?? '';
              const semJustificativa = marcado && texto.trim().length === 0;
              return (
                <div
                  key={a.id}
                  className="px-3 py-2.5"
                  style={{
                    border: `1px solid ${marcado ? 'var(--tfd-blue-200)' : 'var(--tfd-surface-border)'}`,
                    borderRadius: 8,
                    background: marcado ? 'var(--tfd-blue-50)' : 'white',
                  }}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={(e) => alternar(a.id, e.target.checked)}
                      className="mt-[3px] shrink-0"
                      aria-label={`Incluir ${a.beneficiario ?? 'este período'} no recibo`}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold truncate" style={{ color: '#1A1D2B' }}>
                          {a.beneficiario ?? 'Beneficiário não identificado'}
                        </span>
                        <span className="text-[13px] font-semibold shrink-0" style={{ color: '#1A1D2B' }}>
                          {a.valorLabel}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 mt-1">
                        {a.tipo && (
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5"
                            style={{
                              borderRadius: 999,
                              background: a.tipo === 'PACIENTE' ? 'var(--tfd-blue-100)' : '#EDE9FE',
                              color: a.tipo === 'PACIENTE' ? 'var(--tfd-blue-700)' : '#6D28D9',
                            }}
                          >
                            {a.tipo}
                          </span>
                        )}
                        <span className="text-[11.5px]" style={{ color: '#6B7280' }}>
                          {a.periodoLabel}
                        </span>
                      </span>
                    </span>
                  </label>

                  {marcado && (
                    <div className="mt-2.5 pl-[26px]">
                      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: '#6B7280' }}>
                        Justificativa <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <textarea
                        value={texto}
                        onChange={(e) => atualizarJustificativa(a.id, e.target.value)}
                        rows={3}
                        placeholder="Explique o motivo desta ajuda de custo…"
                        className="w-full px-2.5 py-2 text-[12.5px] leading-relaxed"
                        style={{
                          ...inputStyle,
                          borderColor: semJustificativa ? '#FCA5A5' : (inputStyle.border as string),
                          resize: 'vertical',
                        }}
                      />
                      <p
                        className="text-[11px] mt-0.5 text-right"
                        style={{ color: semJustificativa ? '#B91C1C' : '#9CA3AF' }}
                      >
                        {texto.length}/{JUSTIFICATIVA_MAX}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Drawer>
  );
}
