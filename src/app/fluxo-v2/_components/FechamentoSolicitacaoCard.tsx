'use client';

import { useEffect, useState } from 'react';
import { FileSignature, Eye, Pencil, Loader2, Receipt } from 'lucide-react';
import { buscarPorSolicitacao as buscarDadosBancarios } from '@/services/dados-bancarios.service';
import { buscarPorSolicitacao as buscarDespacho } from '@/services/despachos-financeiros.service';
import DespachoFinanceiroDrawer from '@/shared/components/despacho/DespachoFinanceiroDrawer';
import ReciboAjudaCustoDrawer from '@/shared/components/despacho/ReciboAjudaCustoDrawer';
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
 *
 * Ajuste do cliente (2026-07): não há mais um seletor de ciclo global no
 * topo do bloco. Cada cartão escolhe a ajuda de custo pelo próprio botão
 * "Editar": o do despacho abre o `DespachoFinanceiroDrawer` (que já tem o
 * seletor embutido) e o do recibo abre o `ReciboAjudaCustoDrawer`. Os dois
 * mantêm o mesmo estado `ajudaSelecionadaId`, então escolher a ajuda em um
 * cartão também habilita o outro.
 */
export default function FechamentoSolicitacaoCard({ s, locked, lockedTip }: Props) {
  const [temBancario, setTemBancario] = useState<boolean | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [reciboDrawerAberto, setReciboDrawerAberto] = useState(false);
  const [despachoId, setDespachoId] = useState<string | null>(null);
  const [carregandoDespacho, setCarregandoDespacho] = useState(true);
  // PBI 13279 (ajuste do cliente): a ajuda de custo referenciada pelos dois
  // documentos não vem mais de um select global; cada cartão define este
  // mesmo estado pelo próprio drawer de edição.
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
  // custo cadastrada; a seleção do ciclo agora acontece dentro do próprio
  // drawer de emissão/edição, não mais antes de abri-lo.
  const semAjudaCadastrada = ajudasAtivas.length === 0;
  const emitirDisabled = locked || semAjudaCadastrada;
  const tipEmitir = locked
    ? lockedTip
    : semAjudaCadastrada
      ? 'Cadastre um período de ajuda de custo antes de emitir o despacho.'
      : 'Cadastrar e emitir o despacho financeiro para anexar ao SEI';

  // PBI 13279: o recibo (RPB) exige ajuda de custo cadastrada e selecionada
  // (pelo botão Editar do próprio cartão), além dos dados bancários do
  // sacador (CA05). O despacho não exige dados bancários.
  const semDadosBancarios = temBancario !== true;
  const reciboDisabled = locked || semAjudaCadastrada || semDadosBancarios || !ajudaSelecionadaId;
  const tipRecibo = locked
    ? lockedTip
    : semAjudaCadastrada
      ? 'Cadastre um período de ajuda de custo antes de gerar o recibo.'
      : semDadosBancarios
        ? 'Cadastre os dados bancários do sacador antes de gerar o recibo.'
        : !ajudaSelecionadaId
          ? 'Selecione, no botão Editar, a ajuda de custo que este recibo referencia.'
          : 'Gerar o recibo de pagamento a beneficiário (RPB) para anexar ao SEI';
  const editarReciboDisabled = locked || semAjudaCadastrada;
  const tipEditarRecibo = locked
    ? lockedTip
    : semAjudaCadastrada
      ? 'Cadastre um período de ajuda de custo antes de selecionar.'
      : 'Escolher a ajuda de custo que este recibo referencia';

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

      {ajudasCustoOptions.length === 0 && (
        <p className="text-[11.5px] mb-1" style={{ color: '#B45309' }}>
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
              className="tfd-btn tfd-btn-primary tfd-btn--sm"
            >
              <Receipt size={13} /> Gerar recibo
            </button>
            <button
              type="button"
              onClick={() => { if (!editarReciboDisabled) setReciboDrawerAberto(true); }}
              disabled={editarReciboDisabled}
              title={tipEditarRecibo}
              className="tfd-btn tfd-btn-secondary tfd-btn--sm"
            >
              <Pencil size={13} /> Editar
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
        onAjudaCustoChange={setAjudaSelecionadaId}
        onClose={() => setDrawerAberto(false)}
        aposSalvar={(id) => {
          const eraCriacao = !despachoId;
          setDespachoId(id);
          // Na emissão, abre o documento direto; na edição, só atualiza o card.
          if (eraCriacao) window.open(`/despacho/${id}`, '_blank');
        }}
      />

      <ReciboAjudaCustoDrawer
        open={reciboDrawerAberto}
        ajudasCusto={ajudasCustoOptions}
        ajudaCustoIdInicial={ajudaSelecionadaId || undefined}
        onClose={() => setReciboDrawerAberto(false)}
        onConfirmar={setAjudaSelecionadaId}
      />
    </div>
  );
}
