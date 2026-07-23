'use client';

import { useEffect, useState } from 'react';
import { Wallet, AlertTriangle } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import type { AjudaCustoOption } from './DespachoFinanceiroDrawer';

interface Props {
  open: boolean;
  ajudasCusto: AjudaCustoOption[];
  /** Ajuda de custo já escolhida anteriormente (edição de uma seleção existente). */
  ajudaCustoIdInicial?: string;
  onClose: () => void;
  /** Chamado ao confirmar, com o id da ajuda de custo escolhida. */
  onConfirmar: (id: string) => void;
}

const inputStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

/**
 * Ajuste do cliente (2026-07): o recibo de ajuda de custo (SEI) não tem mais
 * um seletor global no card de fechamento. Este drawer reproduz o mesmo
 * seletor de ciclo já usado no `DespachoFinanceiroDrawer`, só que isolado
 * (sem os demais campos do despacho), para o botão "Editar" do cartão do
 * recibo. A PBI do documento SEI segue intocada; só a forma de escolher a
 * ajuda de custo referenciada mudou.
 */
export default function ReciboAjudaCustoDrawer({
  open,
  ajudasCusto,
  ajudaCustoIdInicial,
  onClose,
  onConfirmar,
}: Props) {
  const [selecionada, setSelecionada] = useState('');

  useEffect(() => {
    if (open) setSelecionada(ajudaCustoIdInicial ?? '');
  }, [open, ajudaCustoIdInicial]);

  const temAjudas = ajudasCusto.length > 0;

  function confirmar() {
    if (!selecionada) return;
    onConfirmar(selecionada);
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Ajuda de custo do recibo"
      subtitle="Escolha o ciclo de ajuda de custo que este recibo (SEI) referencia."
      width="440px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={confirmar}
            disabled={!selecionada}
            title={!selecionada ? 'Selecione a ajuda de custo referenciada por este recibo' : undefined}
          >
            Confirmar
          </button>
        </>
      }
    >
      <FormSection
        title="Ajuda de custo"
        icon={<Wallet size={12} />}
        hint="No SEI, cada ajuda de custo abre um processo próprio. Escolha qual período este recibo comprova."
      >
        {temAjudas ? (
          <select
            value={selecionada}
            onChange={(e) => setSelecionada(e.target.value)}
            className="w-full px-3 py-2 text-[13px]"
            style={{
              ...inputStyle,
              borderColor: !selecionada ? '#FCA5A5' : (inputStyle.border as string),
            }}
          >
            <option value="" disabled>
              Selecione a ajuda de custo…
            </option>
            {ajudasCusto.map((a) => (
              <option key={a.id} value={a.id}>
                {a.numeroSEI ? `SEI ${a.numeroSEI}` : 'Sem processo SEI'} — {a.periodoLabel} — {a.valorLabel}
              </option>
            ))}
          </select>
        ) : (
          <div
            className="flex items-center gap-2 px-3 py-2.5 text-[12px]"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#B91C1C' }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            Nenhuma ajuda de custo cadastrada nesta solicitação. Cadastre um período antes de gerar o recibo.
          </div>
        )}
        {temAjudas && !selecionada && (
          <p className="text-[11px] mt-1" style={{ color: '#B91C1C' }}>
            Obrigatório — selecione a ajuda de custo referenciada por este recibo.
          </p>
        )}
      </FormSection>
    </Drawer>
  );
}
