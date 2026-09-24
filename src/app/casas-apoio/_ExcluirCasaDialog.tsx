'use client';

import { AlertTriangle } from 'lucide-react';
import ConfirmDialog from '@/shared/components/confirm-dialog/ConfirmDialog';
import { excluirCasaApoio, vinculosDaCasa } from '@/app/fluxo-v2/_state/servicoSocialStore';
import type { CasaApoioMock } from '@/core/mocks/servico-social-seed';

/**
 * Exclusão de casa de apoio com o mesmo diálogo das outras telas de cadastro.
 * Se a casa estiver vinculada a uma unidade de saúde ou citada em
 * instrumentos sociais, o diálogo avisa quais são os vínculos, mas a
 * exclusão continua permitida.
 */
export default function ExcluirCasaDialog({
  casa, onClose, onExcluida,
}: { casa: CasaApoioMock | null; onClose: () => void; onExcluida?: (nome: string) => void }) {
  const vinculos = casa ? vinculosDaCasa(casa.id) : { instrumentos: 0 };
  const temVinculo = !!vinculos.unidade || vinculos.instrumentos > 0;

  return (
    <ConfirmDialog
      open={!!casa}
      tone="delete"
      title="Excluir casa de apoio?"
      subject={casa?.nome}
      description={
        temVinculo ? (
          <span className="flex flex-col gap-2">
            <span
              className="flex gap-2 px-3 py-2.5 text-[13px]"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, color: '#92400E' }}
              role="note"
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>
                Esta casa está vinculada a registros do sistema:
                <span className="block mt-1 pl-1">
                  {vinculos.unidade && <span className="block">• Unidade de saúde: {vinculos.unidade}</span>}
                  {vinculos.instrumentos > 0 && (
                    <span className="block">• {vinculos.instrumentos} {vinculos.instrumentos === 1 ? 'instrumento social' : 'instrumentos sociais'} (encaminhamento para casa de apoio)</span>
                  )}
                </span>
                <span className="block mt-1">
                  A exclusão é permitida. Os instrumentos já emitidos continuam existindo e passam a indicar que a casa foi excluída do cadastro.
                </span>
              </span>
            </span>
            <span>Esta ação não pode ser desfeita.</span>
          </span>
        ) : (
          'Esta ação não pode ser desfeita.'
        )
      }
      onClose={onClose}
      onConfirm={() => {
        if (!casa) return;
        excluirCasaApoio(casa.id);
        onExcluida?.(casa.nome);
        onClose();
      }}
    />
  );
}
