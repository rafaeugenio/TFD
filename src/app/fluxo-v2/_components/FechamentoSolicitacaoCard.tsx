'use client';

import { useEffect, useState } from 'react';
import { FileSignature, Eye, Pencil, Loader2, Receipt } from 'lucide-react';
import { buscarPorSolicitacao as buscarDadosBancarios } from '@/services/dados-bancarios.service';
import { buscarPorSolicitacao as buscarDespacho } from '@/services/despachos-financeiros.service';
import DespachoFinanceiroDrawer from '@/shared/components/despacho/DespachoFinanceiroDrawer';
import ReciboAjudaCustoDrawer, {
  type ReciboSelecaoItem,
} from '@/shared/components/despacho/ReciboAjudaCustoDrawer';
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
 * fechamento (despacho financeiro e recibo de ajuda de custo do SEI,
 * PBI 13279). Enquanto não há despacho, mostra "Emitir despacho", que abre
 * o drawer de cadastro; depois de emitido, mostra "Visualizar" (abre o
 * documento pronto para imprimir/PDF em nova aba) e "Editar" (reabre o
 * mesmo drawer em edição). O despacho referencia uma única ajuda de custo,
 * escolhida no seletor embutido do próprio `DespachoFinanceiroDrawer`
 * (estado `ajudaSelecionadaId`).
 *
 * Ajuste do cliente (2026-07): o recibo deixou de referenciar um único
 * ciclo. O botão "Gerar recibo" abre direto o `ReciboAjudaCustoDrawer`, que
 * permite marcar uma ou mais ajudas de custo (cada uma com sua própria
 * justificativa) e já dispara a geração do documento com a seleção
 * escolhida, sem passo de "Editar" em separado. O recibo não é persistido:
 * cada geração remonta o documento com os dados atuais.
 */
export default function FechamentoSolicitacaoCard({ s, locked, lockedTip }: Props) {
  const [temBancario, setTemBancario] = useState<boolean | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [reciboDrawerAberto, setReciboDrawerAberto] = useState(false);
  const [despachoId, setDespachoId] = useState<string | null>(null);
  const [carregandoDespacho, setCarregandoDespacho] = useState(true);
  // PBI 13279 (ajuste do cliente): a ajuda de custo referenciada pelo
  // despacho não vem de um select global; o cartão define este estado pelo
  // próprio drawer de edição do despacho.
  const [ajudaSelecionadaId, setAjudaSelecionadaId] = useState('');
  // Última seleção confirmada no drawer do recibo (ajudas + justificativas),
  // só para reabrir o drawer já preenchido — não é persistida no banco.
  const [reciboSelecao, setReciboSelecao] = useState<ReciboSelecaoItem[]>([]);

  const ajudasAtivas = s.ajudasCusto.filter((a) => a.ativa !== false);
  const acompanhantesPorId = new Map(s.acompanhantes.map((a) => [a.id, a.nome]));

  // PBI 13195 — opções do select de ajuda de custo referenciada pelo despacho
  // e, agora, também do multi-select do recibo (com beneficiário e tipo).
  // Ordenadas com o paciente primeiro e os acompanhantes em seguida, cada
  // grupo por data de início, para casar com a ordem exibida no recibo.
  const ajudasCustoOptions = [...ajudasAtivas]
    .sort((a, b) => {
      if (a.beneficiarioTipo !== b.beneficiarioTipo) {
        return a.beneficiarioTipo === 'paciente' ? -1 : 1;
      }
      return a.dataInicio.localeCompare(b.dataInicio);
    })
    .map((a) => ({
      id: a.id,
      numeroSEI: a.numeroSEI,
      periodoLabel: `${fmtDataBR(a.dataInicio)} → ${fmtDataBR(a.dataFim)}`,
      valorLabel: fmtBRL(calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor),
      beneficiario:
        a.beneficiarioTipo === 'acompanhante'
          ? (acompanhantesPorId.get(a.beneficiarioId ?? '') ?? 'Acompanhante')
          : (s.paciente?.nome ?? 'Paciente'),
      tipo: (a.beneficiarioTipo === 'acompanhante' ? 'ACOMPANHANTE' : 'PACIENTE') as
        | 'PACIENTE'
        | 'ACOMPANHANTE',
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

  // PBI 13279 (ajuste do cliente): o recibo exige ajuda de custo cadastrada
  // e os dados bancários do sacador (CA05); a seleção de quais ajudas
  // entram no documento e as justificativas acontecem dentro do próprio
  // drawer, aberto por este botão. O despacho não exige dados bancários.
  const semDadosBancarios = temBancario !== true;
  const reciboDisabled = locked || semAjudaCadastrada || semDadosBancarios;
  const tipRecibo = locked
    ? lockedTip
    : semAjudaCadastrada
      ? 'Cadastre um período de ajuda de custo antes de gerar o recibo.'
      : semDadosBancarios
        ? 'Cadastre os dados bancários do sacador antes de gerar o recibo.'
        : 'Selecionar as ajudas de custo e gerar o recibo (SEI) para o beneficiário';

  function visualizarDespacho() {
    if (!despachoId) return;
    window.open(`/despacho/${despachoId}`, '_blank');
  }

  /** Monta a URL do documento com as ajudas escolhidas, a justificativa de
   *  cada uma e o nome do beneficiário (a tabela `ajudas_custo` ainda não
   *  vincula o período a um acompanhante específico quando há mais de um
   *  na solicitação — ver "Pontos de atenção" na entrega). */
  function abrirRecibo(selecao: ReciboSelecaoItem[]) {
    if (selecao.length === 0) return;
    const ids = selecao.map((item) => item.id);
    const justificativas = Object.fromEntries(selecao.map((item) => [item.id, item.justificativa]));
    const nomes = Object.fromEntries(
      ids.map((id) => [id, ajudasCustoOptions.find((a) => a.id === id)?.beneficiario ?? '']),
    );
    const params = new URLSearchParams({
      ids: ids.join(','),
      just: JSON.stringify(justificativas),
      nomes: JSON.stringify(nomes),
    });
    window.open(`/recibo-ajuda-custo/${ids[0]}?${params.toString()}`, '_blank');
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
              onClick={() => { if (!reciboDisabled) setReciboDrawerAberto(true); }}
              disabled={reciboDisabled}
              title={tipRecibo}
              className="tfd-btn tfd-btn-primary tfd-btn--sm"
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
        selecaoInicial={reciboSelecao}
        onClose={() => setReciboDrawerAberto(false)}
        onGerar={(selecao) => {
          setReciboSelecao(selecao);
          setReciboDrawerAberto(false);
          abrirRecibo(selecao);
        }}
      />
    </div>
  );
}
