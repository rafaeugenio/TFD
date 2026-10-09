'use client';

import { useState } from 'react';
import { Cross, Undo2 } from 'lucide-react';
import ConfirmDialog from '@/shared/components/confirm-dialog/ConfirmDialog';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { useToast } from '@/shared/components/toast/Toast';
import { useObitoDe, sinalizarObito, removerObito } from '../_state/obitoStore';
import { dataObitoBR } from './ObitoSelo';

/** Hoje no fuso do navegador, em AAAA-MM-DD (limite da data de falecimento). */
function hojeLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const campoStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 8,
};

/**
 * Ação "Sinalizar óbito" do cabeçalho do detalhe da solicitação. Marca o
 * óbito sem encerrar: a solicitação segue no fluxo. Depois de sinalizado, o
 * botão vira o registro ("Óbito sinalizado em dd/mm/aaaa") com a opção de
 * desfazer, mediante confirmação.
 */
export default function SinalizarObitoAcao({ solicitacaoId, rotulo }: { solicitacaoId: string; rotulo: string }) {
  const { can, user } = usePermissions();
  const toast = useToast();
  const obito = useObitoDe(solicitacaoId);
  const pode = can('acao.sinalizar_obito');

  const [abrir, setAbrir] = useState(false);
  const [desfazer, setDesfazer] = useState(false);
  const [data, setData] = useState('');
  const [observacao, setObservacao] = useState('');

  const hoje = hojeLocal();
  const dataFutura = Boolean(data) && data > hoje;
  const dataValida = Boolean(data) && !dataFutura;

  if (obito) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium"
          style={{ color: '#334155', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8 }}
        >
          <Cross size={14} strokeWidth={2.2} />
          Óbito sinalizado em {dataObitoBR(obito.dataFalecimento)}
        </span>
        {pode && (
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost tfd-btn--sm"
            onClick={() => setDesfazer(true)}
            title="Desfazer a sinalização de óbito"
          >
            <Undo2 size={13} /> Desfazer
          </button>
        )}
        <ConfirmDialog
          open={desfazer}
          tone="delete"
          title="Desfazer sinalização de óbito?"
          subject={rotulo}
          description={`O registro de óbito em ${dataObitoBR(obito.dataFalecimento)} será removido e o selo some de todas as telas. Use só quando a sinalização foi feita por engano.`}
          confirmLabel="Desfazer sinalização"
          onClose={() => setDesfazer(false)}
          onConfirm={() => {
            removerObito(solicitacaoId);
            setDesfazer(false);
            toast.success('Sinalização de óbito desfeita', rotulo);
          }}
        />
      </span>
    );
  }

  if (!pode) return null;

  function fechar() {
    setAbrir(false);
    setData('');
    setObservacao('');
  }

  function confirmar() {
    if (!dataValida) return;
    sinalizarObito({
      solicitacaoId,
      dataFalecimento: data,
      observacao: observacao.trim() || undefined,
      registradoPor: user?.nome_completo ?? 'Usuário',
    });
    toast.success('Óbito sinalizado', `${rotulo}. A solicitação segue no fluxo.`);
    fechar();
  }

  return (
    <>
      <button
        type="button"
        className="tfd-btn tfd-btn-secondary"
        onClick={() => setAbrir(true)}
        title="Sinalizar o óbito do paciente sem encerrar a solicitação"
      >
        <Cross size={14} /> Sinalizar óbito
      </button>
      <ConfirmDialog
        open={abrir}
        tone="warning"
        icon={Cross}
        title="Sinalizar óbito"
        subject={rotulo}
        description="A solicitação continua no fluxo e passa a exibir o selo de óbito em todas as telas."
        confirmLabel="Sinalizar óbito"
        confirmDisabled={!dataValida}
        onClose={fechar}
        onConfirm={confirmar}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="obito-data" className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
              Data do falecimento <span style={{ color: '#B91C1C' }}>*</span>
            </label>
            <input
              id="obito-data"
              type="date"
              data-autofocus
              required
              max={hoje}
              value={data}
              onChange={(e) => setData(e.target.value)}
              aria-invalid={dataFutura}
              aria-describedby={dataFutura ? 'obito-data-erro' : undefined}
              className="w-full px-3 py-2 text-[13px]"
              style={campoStyle}
            />
            {dataFutura && (
              <p id="obito-data-erro" className="text-[12px] mt-1" style={{ color: '#B91C1C' }}>
                A data do falecimento não pode ser futura.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="obito-obs" className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
              Observação
            </label>
            <textarea
              id="obito-obs"
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Opcional. Ex.: informado pela família por telefone."
              className="w-full px-3 py-2 text-[13px]"
              style={campoStyle}
            />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
