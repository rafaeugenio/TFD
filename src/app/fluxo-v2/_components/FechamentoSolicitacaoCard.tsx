'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, FileSignature, Eye, Pencil, Loader2 } from 'lucide-react';
import { buscarPorSolicitacao as buscarDadosBancarios } from '@/services/dados-bancarios.service';
import { buscarPorSolicitacao as buscarDespacho } from '@/services/despachos-financeiros.service';
import DespachoFinanceiroDrawer from '@/shared/components/despacho/DespachoFinanceiroDrawer';
import { REPRESENTANTES_PADRAO } from '@/core/despacho/representantes';
import { montarCorpoDespacho } from '../_utils/corpoDespacho';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

interface Props {
  s: SolicitacaoMock;
  /** Quando true, todos os botões ficam disabled (modo leitura/lock). */
  locked?: boolean;
  /** Tooltip exibido quando o card está locked. */
  lockedTip?: string;
}

/**
 * Card no topo da aba Financeiro que consolida o "fechamento" da solicitação:
 * checklist do que está pronto + ação de despacho. Enquanto não há despacho,
 * mostra "Emitir despacho" (gated pelo checklist), que abre o drawer de
 * cadastro. Depois de emitido, mostra "Visualizar" (abre o documento pronto
 * para imprimir/PDF em nova aba) e "Editar" (reabre o mesmo drawer em edição).
 */
export default function FechamentoSolicitacaoCard({ s, locked, lockedTip }: Props) {
  const [temBancario, setTemBancario] = useState<boolean | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [despachoId, setDespachoId] = useState<string | null>(null);
  const [carregandoDespacho, setCarregandoDespacho] = useState(true);

  const isAjudaCusto = s.tipoSolicitacao === 'ajuda_custo';
  const viagensAtivas = s.viagens.filter((v) => v.ativa !== false);
  const ajudasAtivas = s.ajudasCusto.filter((a) => a.ativa !== false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [bancario, despacho] = await Promise.all([
        buscarDadosBancarios(s.id),
        buscarDespacho(s.id),
      ]);
      if (!cancel) {
        setTemBancario(!!bancario.data);
        setDespachoId((despacho.data?.id as string | undefined) ?? null);
        setCarregandoDespacho(false);
      }
    })();
    return () => { cancel = true; };
  }, [s.id]);

  // Checklist de requisitos para fechamento
  const checks: Array<{ label: string; ok: boolean }> = [];
  if (!isAjudaCusto) {
    checks.push({ label: 'Passagens emitidas', ok: viagensAtivas.length > 0 });
  }
  checks.push({ label: 'Ajuda de custo cadastrada', ok: ajudasAtivas.length > 0 });
  checks.push({ label: 'Dados bancários da solicitação', ok: temBancario === true });

  const tudoPronto = checks.every((c) => c.ok);
  const faltando = checks.filter((c) => !c.ok).map((c) => c.label);
  const tooltipFaltando = faltando.length > 0
    ? `Faltam: ${faltando.join(' · ')}`
    : 'Pronto para fechamento';

  const emitirDisabled = locked || !tudoPronto;
  const tipEmitir = locked ? lockedTip : (tudoPronto ? undefined : tooltipFaltando);

  function visualizarDespacho() {
    if (!despachoId) return;
    window.open(`/despacho/${despachoId}`, '_blank');
  }

  return (
    <div
      className="mb-4 px-4 py-3.5"
      style={{
        background: tudoPronto ? 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)' : '#F8FAFC',
        border: `1px solid ${tudoPronto ? '#BBF7D0' : 'var(--tfd-surface-border)'}`,
        borderRadius: 10,
      }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {tudoPronto ? (
              <CheckCircle2 size={15} style={{ color: '#16A34A' }} />
            ) : (
              <AlertCircle size={15} style={{ color: '#F59E0B' }} />
            )}
            <span className="text-[13px] font-semibold" style={{ color: tudoPronto ? '#166534' : '#92400E' }}>
              {tudoPronto ? 'Pronto para fechamento' : 'Pendências para fechamento'}
            </span>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
            {checks.map((c, i) => (
              <li key={i} className="inline-flex items-center gap-1" style={{ color: c.ok ? '#475569' : '#9CA3AF' }}>
                {c.ok ? (
                  <CheckCircle2 size={11} style={{ color: '#16A34A' }} />
                ) : (
                  <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 999, border: '1.5px solid #CBD5E1' }} />
                )}
                <span style={{ textDecoration: c.ok ? undefined : 'none' }}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {carregandoDespacho ? (
            <Loader2 size={16} className="animate-spin" style={{ color: '#94A3B8' }} />
          ) : despachoId ? (
            <>
              <button
                type="button"
                onClick={visualizarDespacho}
                disabled={locked}
                title="Abrir o despacho em nova aba, pronto para imprimir ou salvar como PDF"
                className="tfd-btn tfd-btn-primary tfd-btn--sm"
              >
                <Eye size={13} /> Visualizar
              </button>
              <button
                type="button"
                onClick={() => { if (!locked) setDrawerAberto(true); }}
                disabled={locked}
                title="Editar os dados do despacho"
                className="tfd-btn tfd-btn-secondary tfd-btn--sm"
              >
                <Pencil size={13} /> Editar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { if (!emitirDisabled) setDrawerAberto(true); }}
              disabled={emitirDisabled}
              title={tipEmitir ?? 'Cadastrar e emitir o despacho financeiro para anexar ao SEI'}
              className="tfd-btn tfd-btn-primary tfd-btn--sm"
            >
              <FileSignature size={13} /> Emitir despacho
            </button>
          )}
        </div>
      </div>

      <DespachoFinanceiroDrawer
        open={drawerAberto}
        despachoId={despachoId ?? undefined}
        criar={despachoId ? undefined : {
          solicitacaoId: s.id,
          numeroSEI: s.numeroSEI ?? '',
          texto: drawerAberto ? montarCorpoDespacho(s) : '',
          representantes: REPRESENTANTES_PADRAO,
        }}
        corpoPadrao={drawerAberto ? montarCorpoDespacho(s) : undefined}
        onClose={() => setDrawerAberto(false)}
        aposSalvar={(id) => {
          const eraCriacao = !despachoId;
          setDespachoId(id);
          // Na emissão, abre o documento direto; na edição, só atualiza o card.
          if (eraCriacao) window.open(`/despacho/${id}`, '_blank');
        }}
      />
    </div>
  );
}
