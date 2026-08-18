'use client';

import { useEffect, useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import { useToast } from '@/shared/components/toast/Toast';
import type { ParecerMock } from '@/core/mocks/fluxo-v2-v3-seed';

interface Props {
  open: boolean;
  onClose: () => void;
  solicitacaoId: string;
  parecer: ParecerMock | null;
}

/**
 * Drawer da enfermeira da Regulação para apontar o que está errado num
 * parecer já emitido. Ao salvar, o parecer passa ao status "ajuste" — a
 * observação fica visível de forma destacada no próprio parecer para o
 * médico ler e resolver ao editar (ver `NewParecerDrawer`).
 */
export default function PedirAjusteParecerDrawer({ open, onClose, solicitacaoId, parecer }: Props) {
  const { editarParecer } = useFluxoV2State();
  const toast = useToast();
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (open) setTexto('');
  }, [open]);

  function handleSalvar() {
    if (!parecer || !texto.trim()) return;
    editarParecer(solicitacaoId, parecer.id, { observacaoAjuste: texto.trim() });
    toast.success('Ajuste solicitado', `O médico verá a observação no parecer de ${parecer.medico}.`);
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Pedir ajuste no parecer"
      subtitle="Aponte o que precisa ser corrigido. O médico vê esta observação destacada ao abrir o parecer."
      width="480px"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            onClick={handleSalvar}
            disabled={!texto.trim()}
          >
            <MessageSquareWarning size={14} /> Registrar ajuste
          </button>
        </>
      }
    >
      {parecer && (
        <p className="text-[12.5px] mb-4" style={{ color: '#64748B' }}>
          Parecer de <strong style={{ color: '#1A1D2B' }}>{parecer.medico}</strong> em{' '}
          {new Date(parecer.data).toLocaleDateString('pt-BR')}.
        </p>
      )}
      <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
        O que precisa ser corrigido?
      </label>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        autoFocus
        placeholder="Ex.: CID principal não confere com o laudo anexado."
        className="w-full px-3 py-2 text-[13px]"
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 8,
        }}
      />
      <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
        Essa troca com o médico não entra na linha do tempo da solicitação.
      </p>
    </Drawer>
  );
}
