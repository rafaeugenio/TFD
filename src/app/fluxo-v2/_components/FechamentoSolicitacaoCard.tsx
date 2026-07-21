'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, FileSignature, Eye, Pencil, Loader2, Receipt } from 'lucide-react';
import { buscarPorSolicitacao as buscarDadosBancarios } from '@/services/dados-bancarios.service';
import { buscarPorSolicitacao as buscarDespacho } from '@/services/despachos-financeiros.service';
import DespachoFinanceiroDrawer from '@/shared/components/despacho/DespachoFinanceiroDrawer';
import { REPRESENTANTES_PADRAO } from '@/core/despacho/representantes';
import { montarCorpoDespacho } from '../_utils/corpoDespacho';
import { calcularValorAjuda, type SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { fmtDataBR } from '@/shared/utils/fmtData';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  s: SolicitacaoMock;
  /** Quando true, todos os botões ficam disabled (modo leitura/lock). */
  locked?: boolean;
  /** Tooltip exibido quando o card está locked. */
  lockedTip?: string;
}

/**
 * Card no topo da aba Financeiro que consolida o "fechamento" da solicitação:
 * checklist do que está pronto + os dois documentos do setor Ajuda de Custo
 * (despacho financeiro e recibo de pagamento a beneficiário, PBI 13279).
 * Enquanto não há despacho, mostra "Emitir despacho" (gated pelo checklist),
 * que abre o drawer de cadastro. Depois de emitido, mostra "Visualizar" (abre
 * o documento pronto para imprimir/PDF em nova aba) e "Editar" (reabre o
 * mesmo drawer em edição). O recibo não é persistido: cada clique gera o
 * documento na hora, com os dados atuais da ajuda de custo escolhida.
 */
export default function FechamentoSolicitacaoCard({ s, locked, lockedTip }: Props) {
  const [temBancario, setTemBancario] = useState<boolean | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [despachoId, setDespachoId] = useState<string | null>(null);
  const [carregandoDespacho, setCarregandoDespacho] = useState(true);
  // PBI 13279: select único que referencia o ciclo de ajuda de custo usado
  // tanto para prefilar o despacho quanto para gerar o recibo (SEI).
  const [ajudaSelecionadaId, setAjudaSelecionadaId] = useState('');

  const viagensAtivas = s.viagens.filter((v) => v.ativa !== false);
  const ajudasAtivas = s.ajudasCusto.filter((a) => a.ativa !== false);

  // PBI 13195 — opções do select de ajuda de custo referenciada pelo despacho.
  const ajudasCustoOptions = ajudasAtivas.map((a) => ({
    id: a.id,
    numeroSEI: a.numeroSEI,
    periodoLabel: `${fmtDataBR(a.dataInicio)} → ${fmtDataBR(a.dataFim)}`,
    valorLabel: fmtBRL(calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor),
  }));

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
  checks.push({ label: 'Passagens emitidas', ok: viagensAtivas.length > 0 });
  checks.push({ label: 'Ajuda de custo cadastrada', ok: ajudasAtivas.length > 0 });
  checks.push({ label: 'Dados bancários da solicitação', ok: temBancario === true });

  const tudoPronto = checks.every((c) => c.ok);
  const faltando = checks.filter((c) => !c.ok).map((c) => c.label);
  const tooltipFaltando = faltando.length > 0
    ? `Faltam: ${faltando.join(' · ')}`
    : 'Pronto para fechamento';

  const emitirDisabled = locked || !tudoPronto || !ajudaSelecionadaId;
  const tipEmitir = locked
    ? lockedTip
    : !tudoPronto
      ? tooltipFaltando
      : !ajudaSelecionadaId
        ? 'Selecione, acima, a ajuda de custo que este despacho referencia.'
        : undefined;

  // PBI 13279: o recibo (RPB) só exige ajuda de custo cadastrada, dados
  // bancários preenchidos (CA05) e a seleção do ciclo; não depende de
  // passagens emitidas, diferente do checklist de fechamento do despacho.
  const semAjudaCadastrada = ajudasAtivas.length === 0;
  const semDadosBancarios = temBancario !== true;
  const reciboDisabled = locked || semAjudaCadastrada || semDadosBancarios || !ajudaSelecionadaId;
  const tipRecibo = locked
    ? lockedTip
    : semAjudaCadastrada
      ? 'Cadastre um período de ajuda de custo antes de gerar o recibo.'
      : semDadosBancarios
        ? 'Cadastre os dados bancários da solicitação antes de gerar o recibo.'
        : !ajudaSelecionadaId
          ? 'Selecione, acima, a ajuda de custo que este recibo referencia.'
          : 'Gerar o recibo de pagamento a beneficiário (RPB) para anexar ao SEI';

  function visualizarDespacho() {
    if (!despachoId) return;
    window.open(`/despacho/${despachoId}`, '_blank');
  }

  function gerarRecibo() {
    if (reciboDisabled) return;
    window.open(`/recibo-ajuda-custo/${ajudaSelecionadaId}`, '_blank');
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

      {/* PBI 13279: select único que define qual ajuda de custo os dois
          documentos (despacho e recibo) referenciam. Obrigatório para gerar qualquer um. */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px dashed rgba(148,163,184,0.4)' }}>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: '#475569' }}>
          Ajuda de custo referenciada pelos documentos
        </label>
        {ajudasCustoOptions.length > 0 ? (
          <select
            value={ajudaSelecionadaId}
            onChange={(e) => setAjudaSelecionadaId(e.target.value)}
            disabled={locked}
            className="w-full max-w-md px-3 py-2 text-[12.5px]"
            style={{
              background: 'white',
              border: `1px solid ${!ajudaSelecionadaId ? '#FCA5A5' : 'var(--tfd-surface-border)'}`,
              borderRadius: 8,
            }}
          >
            <option value="" disabled>
              Selecione o ciclo de ajuda de custo…
            </option>
            {ajudasCustoOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.numeroSEI ? `SEI ${a.numeroSEI}` : 'Sem processo SEI'} · {a.periodoLabel} · {a.valorLabel}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[11.5px]" style={{ color: '#B45309' }}>
            Nenhuma ajuda de custo cadastrada nesta solicitação. Cadastre um período na seção
            &quot;Ajuda de custo&quot; abaixo antes de gerar o despacho ou o recibo.
          </p>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={gerarRecibo}
            disabled={reciboDisabled}
            title={tipRecibo}
            className="tfd-btn tfd-btn-secondary tfd-btn--sm"
          >
            <Receipt size={13} /> Gerar recibo de ajuda de custo (SEI)
          </button>
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
        ajudasCusto={ajudasCustoOptions}
        nomePaciente={(s.paciente?.nome ?? '').toUpperCase()}
        ajudaCustoIdInicial={ajudaSelecionadaId || undefined}
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
