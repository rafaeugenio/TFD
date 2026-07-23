'use client';

import { useEffect, useState } from 'react';
import { FileSignature, Eye, Pencil, Loader2, Receipt } from 'lucide-react';
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
 * Sub-bloco da seção "Ajuda de custo" que reúne os dois documentos do
 * fechamento (despacho financeiro e recibo de pagamento a beneficiário,
 * PBI 13279). Enquanto não há despacho, mostra "Emitir despacho", que abre
 * o drawer de cadastro. Depois de emitido, mostra "Visualizar" (abre o
 * documento pronto para imprimir/PDF em nova aba) e "Editar" (reabre o
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

  // PBI 13279 (ajuste do cliente): o despacho exige apenas uma ajuda de
  // custo cadastrada e selecionada no seletor de ciclo. Não depende mais de
  // passagens emitidas nem de dados bancários.
  const semAjudaCadastrada = ajudasAtivas.length === 0;
  const emitirDisabled = locked || semAjudaCadastrada || !ajudaSelecionadaId;
  const tipEmitir = locked
    ? lockedTip
    : semAjudaCadastrada
      ? 'Cadastre um período de ajuda de custo antes de emitir o despacho.'
      : !ajudaSelecionadaId
        ? 'Selecione, acima, a ajuda de custo que este despacho referencia.'
        : 'Cadastrar e emitir o despacho financeiro para anexar ao SEI';

  // PBI 13279: o recibo (RPB) exige ajuda de custo cadastrada e selecionada,
  // além dos dados bancários do sacador (CA05). O despacho não exige dados
  // bancários.
  const semDadosBancarios = temBancario !== true;
  const reciboDisabled = locked || semAjudaCadastrada || semDadosBancarios || !ajudaSelecionadaId;
  const tipRecibo = locked
    ? lockedTip
    : semAjudaCadastrada
      ? 'Cadastre um período de ajuda de custo antes de gerar o recibo.'
      : semDadosBancarios
        ? 'Cadastre os dados bancários do sacador antes de gerar o recibo.'
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
    <div className="mt-5 pt-4" style={{ borderTop: '1px dashed var(--tfd-surface-border)' }}>
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <h4 className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>
          Documentos da ajuda de custo
        </h4>
        <span className="text-[11px]" style={{ color: '#94A3B8' }}>
          Dois documentos distintos, gerados a partir do mesmo ciclo.
        </span>
      </div>

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
          Nenhuma ajuda de custo cadastrada nesta solicitação. Cadastre um período acima
          antes de gerar o despacho ou o recibo.
        </p>
      )}

      {/*
        Dois sub-cartões lado a lado, um por documento, cada um com ícone,
        título e descrição próprios: o cliente pediu distinção visual clara
        entre o despacho (decisão do processo) e o recibo (comprovante de
        pagamento ao beneficiário). A PBI 13279 continua intocada; só a
        organização visual do bloco mudou.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div
          className="flex flex-col gap-2 p-3"
          style={{ background: 'var(--tfd-blue-50)', border: '1px solid var(--tfd-blue-100)', borderRadius: 10 }}
        >
          <div className="flex items-center gap-2">
            <span className="tfd-kpi-icon tfd-kpi-icon--blue" style={{ width: 28, height: 28, borderRadius: 8 }}>
              <FileSignature size={14} />
            </span>
            <span className="text-[12.5px] font-semibold" style={{ color: '#0F172A' }}>
              Despacho financeiro
            </span>
          </div>
          <p className="text-[11px] leading-snug" style={{ color: '#475569' }}>
            Documento decisório do processo, com o texto e os representantes
            que autorizam a ajuda de custo.
          </p>
          <div className="flex items-center gap-2 mt-1">
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
                title={tipEmitir}
                className="tfd-btn tfd-btn-primary tfd-btn--sm"
              >
                <FileSignature size={13} /> Emitir despacho
              </button>
            )}
          </div>
        </div>

        <div
          className="flex flex-col gap-2 p-3"
          style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10 }}
        >
          <div className="flex items-center gap-2">
            <span className="tfd-kpi-icon tfd-kpi-icon--green" style={{ width: 28, height: 28, borderRadius: 8 }}>
              <Receipt size={14} />
            </span>
            <span className="text-[12.5px] font-semibold" style={{ color: '#0F172A' }}>
              Recibo de ajuda de custo (SEI)
            </span>
          </div>
          <p className="text-[11px] leading-snug" style={{ color: '#475569' }}>
            Comprovante de pagamento ao beneficiário, gerado com os dados
            bancários do sacador, para anexar ao SEI.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={gerarRecibo}
              disabled={reciboDisabled}
              title={tipRecibo}
              className="tfd-btn tfd-btn-secondary tfd-btn--sm"
            >
              <Receipt size={13} /> Gerar recibo
            </button>
          </div>
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
