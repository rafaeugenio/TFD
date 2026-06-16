'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, FileSignature } from 'lucide-react';
import { buscarPorSolicitacao as buscarDadosBancarios } from '@/services/dados-bancarios.service';
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
 * checklist do que está pronto + botão de Emitir Despacho. O botão fica sempre
 * visível, mas desabilita-se com tooltip listando o que falta até todos os
 * itens estarem ok. Ao clicar, abre o drawer de cadastro do despacho.
 */
export default function FechamentoSolicitacaoCard({ s, locked, lockedTip }: Props) {
  const [temBancario, setTemBancario] = useState<boolean | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);

  const isAjudaCusto = s.tipoSolicitacao === 'ajuda_custo';
  const viagensAtivas = s.viagens.filter((v) => v.ativa !== false);
  const ajudasAtivas = s.ajudasCusto.filter((a) => a.ativa !== false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await buscarDadosBancarios(s.id);
      if (!cancel) setTemBancario(!!data);
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

  function abrirDespacho() {
    if (!tudoPronto || locked) return;
    setDrawerAberto(true);
  }

  const disabled = locked || !tudoPronto;
  const tipFinal = locked ? lockedTip : (tudoPronto ? undefined : tooltipFaltando);

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
          <button
            type="button"
            onClick={abrirDespacho}
            disabled={disabled}
            title={tipFinal ?? 'Cadastrar e emitir o despacho financeiro para anexar ao SEI'}
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
          >
            <FileSignature size={13} /> Emitir despacho
          </button>
        </div>
      </div>

      <DespachoFinanceiroDrawer
        open={drawerAberto}
        criar={{
          solicitacaoId: s.id,
          numeroSEI: s.numeroSEI ?? '',
          texto: drawerAberto ? montarCorpoDespacho(s) : '',
          representantes: REPRESENTANTES_PADRAO,
        }}
        onClose={() => setDrawerAberto(false)}
        aposSalvar={(id) => window.open(`/despacho/${id}`, '_blank')}
      />
    </div>
  );
}
