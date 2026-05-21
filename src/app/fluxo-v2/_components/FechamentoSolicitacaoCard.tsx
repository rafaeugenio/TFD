'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, FileText, FileSignature, Loader2 } from 'lucide-react';
import { buscarPorSolicitacao as buscarDadosBancarios } from '@/services/dados-bancarios.service';
import { buscarPorSolicitacao as buscarDespacho, criarDespacho } from '@/services/despachos-financeiros.service';
import { useToast } from '@/shared/components/toast/Toast';
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
 * checklist do que está pronto + botões de Gerar Relatório TFD e Emitir
 * Despacho. Os botões ficam sempre visíveis, mas desabilitam-se com tooltip
 * listando o que falta até todos os itens estarem ok.
 */
export default function FechamentoSolicitacaoCard({ s, locked, lockedTip }: Props) {
  const toast = useToast();
  const [temBancario, setTemBancario] = useState<boolean | null>(null);
  const [loadingDespacho, setLoadingDespacho] = useState(false);

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

  async function emitirDespacho() {
    if (!tudoPronto || locked) return;
    setLoadingDespacho(true);
    try {
      const { data: existente } = await buscarDespacho(s.id);
      let despachoId = (existente?.id as string | undefined) ?? undefined;
      if (!despachoId) {
        const { data: criado, error } = await criarDespacho({
          solicitacao_id: s.id,
          numero_sei: s.numeroSEI || null,
        });
        if (error || !criado) {
          toast.error('Erro ao gerar despacho', error?.message ?? 'Tente novamente.');
          return;
        }
        despachoId = (criado as { id: string }).id;
      }
      window.open(`/despacho/${despachoId}`, '_blank');
    } finally {
      setLoadingDespacho(false);
    }
  }

  function gerarRelatorio() {
    if (!tudoPronto || locked) return;
    // Abre o relatório TFD por solicitação em nova aba (implementado na US-REL-04)
    window.open(`/fluxo-v2/solicitacoes/${s.id}/relatorio-tfd`, '_blank');
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
            onClick={gerarRelatorio}
            disabled={disabled}
            title={tipFinal ?? 'Gerar Relatório TFD consolidado da solicitação'}
            className="tfd-btn tfd-btn-secondary tfd-btn--sm"
          >
            <FileText size={13} /> Relatório TFD
          </button>
          <button
            type="button"
            onClick={emitirDespacho}
            disabled={disabled || loadingDespacho}
            title={tipFinal ?? 'Gerar / abrir despacho financeiro para anexar ao SEI'}
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
          >
            {loadingDespacho ? <Loader2 size={13} className="animate-spin" /> : <FileSignature size={13} />}
            Emitir despacho
          </button>
        </div>
      </div>
    </div>
  );
}
