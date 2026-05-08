'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmar: (observacao?: string) => void;
  snapshotPaciente?: SnapshotPacienteData;
}

/**
 * T2.Z — Drawer de encaminhamento Regulação → Financeiro.
 *
 * Substitui o `confirm()` nativo por um drawer com snapshot do paciente e
 * campo opcional de observação para o setor Financeiro. Essa observação
 * vira a `ultimaTramitacao.observacao` da solicitação e aparece no
 * popover de destaque da linha na tabela do Financeiro.
 */
export default function EncaminharParaFinanceiroDrawer({
  open,
  onClose,
  onConfirmar,
  snapshotPaciente,
}: Props) {
  const [observacao, setObservacao] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setObservacao('');
      setTimeout(() => ref.current?.focus(), 100);
    }
  }, [open]);

  function handleConfirmar() {
    const txt = observacao.trim();
    onConfirmar(txt.length ? txt : undefined);
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Encaminhar para Financeiro"
      subtitle="Esta solicitação será movida para a fila do setor Financeiro. Você pode adicionar uma observação opcional para o setor."
      width="480px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleConfirmar}
          >
            Confirmar encaminhamento <ArrowRight size={14} />
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Observação para o Financeiro <span style={{ color: '#9CA3AF', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
      </label>
      <textarea
        ref={ref}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        rows={5}
        placeholder="Ex.: paciente prefere transporte terrestre. Atenção a embarque após 22h."
        className="w-full px-3 py-2 text-[13px]"
        style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
      />
      <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
        A observação ficará destacada na fila do Financeiro nas próximas 24 horas.
      </p>
    </Drawer>
  );
}
