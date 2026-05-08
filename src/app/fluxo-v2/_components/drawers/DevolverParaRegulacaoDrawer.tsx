'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import SnapshotPaciente, { type SnapshotPacienteData } from '../SnapshotPaciente';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmar: (motivo: string) => void;
  snapshotPaciente?: SnapshotPacienteData;
}

/**
 * Drawer para devolver uma solicitação do Financeiro pra Regulação. Exige
 * motivo (obrigatório) — esse texto vira um banner persistente na aba
 * Regulação até a equipe reencaminhar.
 */
export default function DevolverParaRegulacaoDrawer({
  open,
  onClose,
  onConfirmar,
  snapshotPaciente,
}: Props) {
  const [motivo, setMotivo] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMotivo('');
      setTimeout(() => ref.current?.focus(), 100);
    }
  }, [open]);

  const podeConfirmar = motivo.trim().length >= 10;

  function handleConfirmar() {
    if (!podeConfirmar) return;
    onConfirmar(motivo.trim());
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Devolver para Regulação"
      subtitle="Explique o motivo. A Regulação verá esse texto e providenciará o ajuste."
      width="520px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleConfirmar}
            disabled={!podeConfirmar}
            style={!podeConfirmar ? undefined : { background: '#B45309', borderColor: '#B45309' }}
          >
            Confirmar devolução
          </button>
        </>
      }
    >
      {snapshotPaciente && <SnapshotPaciente data={snapshotPaciente} />}

      <div
        className="flex items-start gap-2.5 mb-4 px-3 py-2.5"
        style={{
          background: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: 8,
          color: '#78350F',
        }}
      >
        <AlertTriangle size={15} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
        <p className="text-[12px] leading-relaxed">
          Ao confirmar, a solicitação volta para o status <strong>Aguardando regulação</strong>.
          A aba Regulação mostrará um banner com o motivo até a equipe responder.
        </p>
      </div>

      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        Motivo da devolução
      </label>
      <textarea
        ref={ref}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={6}
        placeholder="Ex.: Faltou anexar comprovante de residência atualizado, sem ele o financeiro não consegue emitir a passagem."
        className="w-full px-3 py-2 text-[13px]"
        style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
      />
      <p className="text-[11px] mt-1" style={{ color: motivo.trim().length < 10 ? '#B91C1C' : '#9CA3AF' }}>
        Mínimo 10 caracteres. {motivo.trim().length}/10
      </p>
    </Drawer>
  );
}
