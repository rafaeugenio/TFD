'use client';

import { useState } from 'react';
import { Stethoscope, ClipboardCheck, CheckCircle2, Printer, Plus, AlertTriangle, CalendarClock, Pencil, Stamp, Phone, Undo2, Lock, MapPin, MessageSquareWarning, X } from 'lucide-react';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import StatusDot, { type StatusDotTone } from './StatusDot';
import OrdinalBadge from './OrdinalBadge';
import ItemRowActions from './ItemRowActions';
import ConfirmarExclusaoModal from './ConfirmarExclusaoModal';
import NewParecerDrawer from './drawers/NewParecerDrawer';
import NewTentativaDrawer from './drawers/NewTentativaDrawer';
import NewAgendamentoDrawer from './drawers/NewAgendamentoDrawer';
import CarimboRegulacaoDrawer from './drawers/CarimboRegulacaoDrawer';
import PedirAjusteParecerDrawer from './drawers/PedirAjusteParecerDrawer';
import { useToast } from '@/shared/components/toast/Toast';
import { isLocked, tooltipLocked } from '../_utils/lock';
import { agendamentosConfirmados, dataDoAgendamento, tentativasHistoricas } from '../_utils/agendamento';
import { CARIMBO_REGULACAO_VISUAL as CARIMBO_VISUAL } from '../_utils/carimboRegulacao';
import type {
  DecisaoParecer,
  DesfechoTentativa,
  ParecerMock,
  SolicitacaoMock,
  TentativaUnidadeMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { DESFECHO_TENTATIVA_LABEL, TIPO_PARECER_LABEL } from '@/core/mocks/fluxo-v2-v3-seed';
import { useTiposProcedimento } from '@/shared/hooks/useTiposProcedimento';
import { descricaoCID } from '../_data/cid-labels';

interface Props {
  s: SolicitacaoMock;
}

export default function RegulacaoTab({ s }: Props) {
  const { setCarimbo, removerParecer, removerTentativa, editarParecer } = useFluxoV2State();
  const toast = useToast();
  const { getLabel: getTipoProcedimentoLabel } = useTiposProcedimento();

  const [parecerOpen, setParecerOpen] = useState(false);
  const [parecerEditar, setParecerEditar] = useState<ParecerMock | undefined>(undefined);
  const [ajusteParecer, setAjusteParecer] = useState<ParecerMock | null>(null);
  const [tentativaOpen, setTentativaOpen] = useState(false);
  const [tentativaEditar, setTentativaEditar] = useState<TentativaUnidadeMock | undefined>(undefined);
  const [agendamentoOpen, setAgendamentoOpen] = useState(false);
  const [carimboOpen, setCarimboOpen] = useState(false);
  const [parecerExcluir, setParecerExcluir] = useState<ParecerMock | null>(null);
  const [tentativaExcluir, setTentativaExcluir] = useState<TentativaUnidadeMock | null>(null);

  const locked = isLocked(s, 'regulacao');
  const lockedTip = tooltipLocked(s, 'regulacao');

  const ultimoParecer = s.pareceres[s.pareceres.length - 1];
  const parecerDeferido = ultimoParecer?.decisao === 'deferido';
  const carimboExigeAgendamento =
    s.carimboRegulacao === 'CNRAC' ||
    s.carimboRegulacao === 'CET' ||
    s.carimboRegulacao === 'SAAS' ||
    s.carimboRegulacao === 'AGENDAMENTO';
  const isExcecao = !!s.agendamento && s.agendamento.origem !== 'criacao';

  // T2.AM — Agendamentos confirmados vêm das tentativas com desfecho
  // 'agendamento_confirmado'. Uma solicitação pode ter mais de um (um por
  // procedimento/unidade de destino).
  const confirmados = agendamentosConfirmados(s);
  const primeiraConfirmada = confirmados[0];
  const historicas = tentativasHistoricas(s);

  // Mostra a área de "registro" (lista + botão único) quando:
  //  - parecer está deferido,
  //  - carimbo exige agendamento (CNRAC/CET),
  //  - ainda não há agendamento confirmado.
  const mostraVazioRegistro =
    parecerDeferido && carimboExigeAgendamento && confirmados.length === 0;

  // Banner segundo deferimento: agendamento de exceção confirmado sem parecer posterior.
  const agendamentoExcecao =
    s.agendamento &&
    (s.agendamento.origem === 'excecao_cnrac' || s.agendamento.origem === 'excecao_cet');
  const dataAgendamento = primeiraConfirmada
    ? new Date(dataDoAgendamento(primeiraConfirmada)).getTime()
    : 0;
  const temParecerPosterior =
    !!agendamentoExcecao &&
    !!primeiraConfirmada &&
    s.pareceres.some((p) => new Date(p.data).getTime() > dataAgendamento);
  const mostraBannerSegundoDef =
    !!agendamentoExcecao && !!primeiraConfirmada && !temParecerPosterior;

  function abrirNovaTentativa() {
    setTentativaEditar(undefined);
    setTentativaOpen(true);
  }
  function abrirEditarTentativa(t: TentativaUnidadeMock) {
    setTentativaEditar(t);
    setTentativaOpen(true);
  }
  function abrirNovoParecer() {
    setParecerEditar(undefined);
    setParecerOpen(true);
  }
  function abrirEditarParecer(p: ParecerMock) {
    setParecerEditar(p);
    setParecerOpen(true);
  }

  // Stats
  const counts = {
    deferidos: s.pareceres.filter((p) => p.decisao === 'deferido').length,
    indeferidos: s.pareceres.filter((p) => p.decisao === 'indeferido').length,
    total: s.pareceres.length,
  };

  // T2.S — devoluções pendentes do financeiro
  const devolucoesPendentes = (s.devolucoes ?? []).filter((d) => !d.resolvida);

  return (
    <div>
      {/* Banner — devolução pendente do financeiro */}
      {devolucoesPendentes.map((d) => (
        <div
          key={d.id}
          className="flex items-start gap-3 mb-4 px-4 py-3"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: 10,
            color: '#78350F',
          }}
          role="alert"
        >
          <Undo2 size={18} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 text-[12.5px] leading-relaxed">
            <div className="font-semibold mb-0.5" style={{ color: '#92400E' }}>
              Devolvido do Financeiro em{' '}
              {new Date(d.data).toLocaleDateString('pt-BR')} às{' '}
              {new Date(d.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {' '}por {d.autor} — {d.perfilAutor}
            </div>
            <div style={{ color: '#78350F' }}>
              <strong>Motivo:</strong> {d.motivo}
            </div>
          </div>
        </div>
      ))}

      {/* T2.AC — Aviso de lock quando solicitação está em outro setor */}
      {locked && !s.encerramento && (
        <div
          className="flex items-start gap-3 mb-4 px-4 py-3"
          style={{
            background: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: 10,
            color: '#475569',
          }}
        >
          <Lock size={16} style={{ flexShrink: 0, marginTop: 1, color: '#64748B' }} />
          <div className="text-[12.5px] leading-relaxed">
            <strong style={{ color: '#1A1D2B' }}>Modo somente leitura.</strong>{' '}
            {lockedTip}
          </div>
        </div>
      )}

      {/* Linha de stats neutra — 1 card, 3 sub-stats com divisor vertical */}
      <div
        className="flex items-stretch mb-6"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        <Stat label="Total de pareceres" value={counts.total} />
        <StatDivider />
        <Stat label="Deferidos" value={counts.deferidos} dotTone="success" />
        <StatDivider />
        <Stat label="Indeferidos" value={counts.indeferidos} dotTone="danger" />
      </div>

      {/* Bloco Parecer */}
      <Section
        icon={Stethoscope}
        title="Parecer médico"
        subtitle={`${s.pareceres.length} parecer(es) registrado(s)`}
        action={
          !locked ? (
            <button
              type="button"
              className="tfd-btn tfd-btn-primary tfd-btn--sm"
              onClick={abrirNovoParecer}
            >
              <Plus size={14} /> Adicionar parecer
            </button>
          ) : undefined
        }
      >
        {mostraBannerSegundoDef && primeiraConfirmada && (
          <div
            className="flex items-start gap-2.5 mb-3 px-3 py-2.5"
            style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: 8,
              color: '#78350F',
            }}
            role="status"
          >
            <AlertTriangle size={15} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
            <div className="text-[12px] leading-relaxed">
              <strong style={{ color: '#92400E' }}>Agendamento de exceção registrado</strong>
              {primeiraConfirmada.unidade ? <> em <strong>{primeiraConfirmada.unidade}</strong></> : null}
              {' '}em <strong>{new Date(dataDoAgendamento(primeiraConfirmada)).toLocaleDateString('pt-BR')}</strong>.
              <br />
              Aguardando parecer de aprovação do agendamento (segundo deferimento — exigência da controladoria SES).
              <br />
              <span style={{ color: '#92400E' }}>Adicione um novo parecer abaixo para concluir essa etapa.</span>
            </div>
          </div>
        )}
        {s.pareceres.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {s.pareceres.map((p, idx) => (
              <li key={p.id} className="px-4 py-3 text-[13px]" style={{ background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <OrdinalBadge n={idx + 1} />
                  <DecisaoBadge decisao={p.decisao} />
                  {p.observacaoAjuste && <StatusDot tone="warning" strong>Em ajuste</StatusDot>}
                  <span style={{ color: '#6B7280' }}>{new Date(p.data).toLocaleString('pt-BR')}</span>
                  <span style={{ color: '#1A1D2B', fontWeight: 500 }}>{p.medico}</span>
                  <span className="ml-auto inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 transition-colors hover:bg-white"
                      style={{ color: 'var(--tfd-blue)', borderRadius: 6, border: '1px solid var(--tfd-surface-border)' }}
                      onClick={() => window.open(`/parecer/${p.id}`, '_blank')}
                    >
                      <Printer size={11} /> Exportar
                    </button>
                    {!p.observacaoAjuste && !locked && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 transition-colors hover:bg-white"
                        style={{ color: '#B45309', borderRadius: 6, border: '1px solid var(--tfd-surface-border)' }}
                        onClick={() => setAjusteParecer(p)}
                      >
                        <MessageSquareWarning size={11} /> Pedir ajuste
                      </button>
                    )}
                    <ItemRowActions
                      onEditar={() => abrirEditarParecer(p)}
                      onExcluir={() => setParecerExcluir(p)}
                      disabled={locked}
                      tooltipDisabled={lockedTip}
                    />
                  </span>
                </div>
                {p.observacaoAjuste && (
                  <div
                    className="flex items-start gap-2 mb-2 px-3 py-2"
                    style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, color: '#78350F' }}
                    role="alert"
                  >
                    <MessageSquareWarning size={14} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
                    <div className="flex-1 min-w-0 text-[12px] leading-relaxed">
                      <strong style={{ color: '#92400E' }}>Ajuste pedido pela Regulação:</strong>{' '}
                      {p.observacaoAjuste}
                    </div>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !window.confirm(
                              'Fechar o ajuste deste parecer? A observação será removida e o parecer volta ao fluxo normal.',
                            )
                          ) {
                            return;
                          }
                          editarParecer(s.id, p.id, { observacaoAjuste: undefined });
                          toast.success('Ajuste resolvido', p.medico);
                        }}
                        className="inline-flex items-center justify-center shrink-0 transition-colors hover:bg-white"
                        style={{ width: 20, height: 20, borderRadius: 6, color: '#92400E', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        aria-label="Fechar ajuste"
                        title="Fechar ajuste"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )}
                {p.tipo && (
                  <div className="mb-1 inline-flex items-center gap-1.5">
                    <span
                      className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-[1px]"
                      style={{
                        background: '#F1F5F9',
                        color: '#475569',
                        borderRadius: 4,
                        letterSpacing: '0.06em',
                      }}
                    >
                      Tipo
                    </span>
                    <span className="text-[12px]" style={{ color: '#475569' }}>
                      {TIPO_PARECER_LABEL[p.tipo]}
                    </span>
                  </div>
                )}
                {p.cidPrincipal && (
                  <div style={{ color: '#475569' }} title={descricaoCID(p.cidPrincipal, p.versaoCID ?? '10')}>
                    <span className="inline-flex items-center gap-1.5 mr-1">
                      <span
                        className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-[1px]"
                        style={{
                          background: '#F1F5F9',
                          color: '#475569',
                          borderRadius: 4,
                          letterSpacing: '0.06em',
                        }}
                      >
                        CID-{p.versaoCID ?? '10'}
                      </span>
                    </span>
                    <strong>{p.cidPrincipal}</strong>{p.cidSecundario ? ` / ${p.cidSecundario}` : ''}
                  </div>
                )}
                {p.observacao && <div style={{ color: '#475569', marginTop: 2 }}>{p.observacao}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Nenhum parecer registrado ainda.</p>
        )}
      </Section>

      {/* Bloco Regulação Operacional — sempre visível (editável só após parecer deferido) */}
      {(() => {
        const carimbo = s.carimboRegulacao;
        const visual = carimbo ? CARIMBO_VISUAL[carimbo] : null;
        const podeEditar = !locked && parecerDeferido;
        return (
          <Section
            icon={ClipboardCheck}
            title="Carimbo de regulação"
            subtitle={
              !parecerDeferido && !carimbo
                ? 'Disponível após parecer deferido.'
                : 'Encaminhamento operacional definido pela equipe.'
            }
            action={
              podeEditar ? (
                <button
                  type="button"
                  className={carimbo ? 'tfd-btn tfd-btn-secondary tfd-btn--sm' : 'tfd-btn tfd-btn-primary tfd-btn--sm'}
                  onClick={() => setCarimboOpen(true)}
                >
                  {carimbo ? <><Pencil size={13} /> Editar carimbo</> : <><Plus size={14} /> Definir carimbo</>}
                </button>
              ) : undefined
            }
          >
            {carimbo && visual ? (
              <div
                className="flex items-start gap-3 px-5 py-4"
                style={{
                  background: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                }}
              >
                <span
                  className="inline-flex items-center justify-center shrink-0 mt-[2px] text-[11px] font-semibold uppercase"
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                    minWidth: 40,
                    height: 26,
                    padding: '0 10px',
                    borderRadius: 6,
                    letterSpacing: '0.06em',
                  }}
                >
                  {carimbo === 'APROVADO_DIRETO' ? 'APR' : carimbo}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold" style={{ color: '#1A1D2B' }}>
                    {visual.label}
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>
                    {visual.sublabel}
                  </p>
                  {s.carimboObservacao && (
                    <div
                      className="mt-2.5 px-3 py-2 text-[12px] leading-relaxed"
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid var(--tfd-surface-border)',
                        borderRadius: 8,
                        color: '#475569',
                      }}
                    >
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider block mb-0.5" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>
                        Observação
                      </span>
                      {s.carimboObservacao}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center text-center py-6 px-4"
                style={{
                  background: '#FBFCFE',
                  border: '1px dashed var(--tfd-surface-border)',
                  borderRadius: 10,
                }}
              >
                <div
                  className="inline-flex items-center justify-center mb-2"
                  style={{
                    width: 44, height: 44, borderRadius: 999,
                    background: '#EBF0FF', color: 'var(--tfd-blue)',
                  }}
                >
                  <Stamp size={20} strokeWidth={1.7} />
                </div>
                <p className="text-[13px] font-semibold mb-1" style={{ color: '#1A1D2B' }}>
                  Nenhum carimbo de regulação definido ainda.
                </p>
                <p className="text-[12px] max-w-[360px]" style={{ color: '#6B7280' }}>
                  Defina o encaminhamento dado pela regulação para esta solicitação.
                </p>
              </div>
            )}
          </Section>
        );
      })()}

      {/* T2.AM — Bloco Agendamento e Tentativas (unificado, sempre visível).
          Cada procedimento agendado e confirmado aparece como um item próprio,
          com sua unidade de destino. O histórico de tentativas de contato
          fica separado, abaixo. */}
      <Section
          icon={CalendarClock}
          title="Agendamento e Tentativas"
          subtitle={
            confirmados.length > 0
              ? s.agendamento?.origem === 'criacao'
                ? 'Agendamento(s) confirmado(s) na criação. Histórico de tentativas abaixo, se houver.'
                : 'Agendamento de exceção — fluxo da central reguladora.'
              : isExcecao || carimboExigeAgendamento
                ? 'Registre tentativas conforme contata as unidades. Quando uma aceitar, adicione o agendamento.'
                : !s.agendamento
                  ? 'Sem agendamento informado. Registre tentativas conforme contata as unidades.'
                  : 'Tentativas com unidades.'
          }
          action={
            !locked ? (
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  className="tfd-btn tfd-btn-secondary tfd-btn--sm"
                  onClick={abrirNovaTentativa}
                >
                  <Plus size={14} /> Adicionar tentativa
                </button>
                <button
                  type="button"
                  className="tfd-btn tfd-btn-primary tfd-btn--sm"
                  onClick={() => setAgendamentoOpen(true)}
                >
                  <Plus size={14} /> Adicionar agendamento
                </button>
              </div>
            ) : undefined
          }
        >
          {/* Agendamentos confirmados — um item por procedimento, com a
              unidade de destino, no formato de linha usado em produção. */}
          {confirmados.length > 0 && (
            <>
              <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                Agendamentos confirmados ({confirmados.length})
              </h4>
              <ul className="flex flex-col gap-1.5 mb-4">
                {[...confirmados]
                  .sort((a, b) => new Date(dataDoAgendamento(a)).getTime() - new Date(dataDoAgendamento(b)).getTime())
                  .map((t, idx) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-3 px-4 py-3"
                      style={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
                      }}
                    >
                      <CheckCircle2 size={18} strokeWidth={2} style={{ color: '#16A34A', flexShrink: 0, marginTop: 2 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {confirmados.length > 1 && <OrdinalBadge n={idx + 1} />}
                          <span className="text-[13.5px] font-semibold truncate" style={{ color: '#0F172A' }}>
                            {t.tipoProcedimento ? getTipoProcedimentoLabel(t.tipoProcedimento) : 'Agendamento confirmado'}
                          </span>
                          <span className="text-[13px]" style={{ color: '#475569', fontWeight: 500 }}>
                            {new Date(dataDoAgendamento(t)).toLocaleDateString('pt-BR')}
                          </span>
                          {s.agendamento && <OrigemBadge origem={s.agendamento.origem} />}
                          <span className="ml-auto inline-flex items-center">
                            <ItemRowActions
                              onEditar={() => abrirEditarTentativa(t)}
                              onExcluir={() => setTentativaExcluir(t)}
                              disabled={locked}
                              tooltipDisabled={lockedTip}
                            />
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: '#64748B' }}>
                          <MapPin size={12} style={{ flexShrink: 0 }} />
                          <span className="truncate">{t.unidade}</span>
                        </div>
                        {(t.contatoUnidade || t.observacoesChegada) && (
                          <div className="flex flex-col gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                            {t.contatoUnidade && (
                              <a
                                href={`tel:${t.contatoUnidade.replace(/\D/g, '')}`}
                                className="inline-flex items-center gap-1.5 text-[12px] font-medium font-mono w-fit"
                                style={{ color: '#146BFA' }}
                              >
                                <Phone size={11} strokeWidth={2.2} />
                                {t.contatoUnidade}
                              </a>
                            )}
                            {t.observacoesChegada && (
                              <span className="text-[12px]" style={{ color: '#475569' }}>
                                {t.observacoesChegada}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </>
          )}

          {/* Lista de tentativas (não-confirmadas, se houver algum agendamento
              confirmado; caso contrário, todas) */}
          {(() => {
            const lista = confirmados.length > 0 ? historicas : (s.agendamento?.tentativas ?? []);
            if (lista.length === 0) {
              if (confirmados.length > 0) return null;
              return (
                <div
                  className="flex flex-col items-center text-center py-6 px-4"
                  style={{
                    background: '#FBFCFE',
                    border: '1px dashed var(--tfd-surface-border)',
                    borderRadius: 10,
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center mb-2"
                    style={{
                      width: 44, height: 44, borderRadius: 999,
                      background: '#EBF0FF', color: 'var(--tfd-blue)',
                    }}
                  >
                    <CalendarClock size={20} strokeWidth={1.7} />
                  </div>
                  <p className="text-[13px] font-semibold mb-1" style={{ color: '#1A1D2B' }}>
                    {isExcecao || carimboExigeAgendamento
                      ? 'Esse caso é de exceção'
                      : 'Sem tentativas registradas'}
                  </p>
                  <p className="text-[12px] max-w-[440px]" style={{ color: '#6B7280' }}>
                    Adicione tentativas conforme contata as unidades. Quando uma aceitar, marque
                    o desfecho como <strong>Agendamento confirmado</strong>.
                  </p>
                </div>
              );
            }
            return (
              <>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                  {confirmados.length > 0 ? `Outras tentativas (${lista.length})` : `Tentativas (${lista.length})`}
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {[...lista]
                    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
                    .map((t, idx) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 text-[12px]"
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid var(--tfd-surface-border)',
                          borderRadius: 8,
                        }}
                      >
                        <OrdinalBadge n={idx + 1} />
                        <span style={{ color: '#1A1D2B', fontWeight: 500 }}>{t.unidade}</span>
                        <span style={{ color: '#6B7280' }}>{new Date(t.data).toLocaleDateString('pt-BR')}</span>
                        {t.observacao && (
                          <span className="truncate" style={{ color: '#475569', fontStyle: 'italic' }}>
                            — {t.observacao}
                          </span>
                        )}
                        <span className="ml-auto inline-flex items-center gap-1.5">
                          <DesfechoBadge desfecho={t.desfecho} />
                          <ItemRowActions
                            onEditar={() => abrirEditarTentativa(t)}
                            onExcluir={() => setTentativaExcluir(t)}
                            disabled={locked}
                            tooltipDisabled={lockedTip}
                          />
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            );
          })()}
        </Section>

      {/* Drawers */}
      <NewParecerDrawer
        open={parecerOpen}
        onClose={() => setParecerOpen(false)}
        solicitacaoId={s.id}
        editar={parecerEditar}
      />
      <NewTentativaDrawer
        open={tentativaOpen}
        onClose={() => setTentativaOpen(false)}
        solicitacaoId={s.id}
        editar={tentativaEditar}
      />
      <NewAgendamentoDrawer
        open={agendamentoOpen}
        onClose={() => setAgendamentoOpen(false)}
        solicitacaoId={s.id}
      />
      <CarimboRegulacaoDrawer
        open={carimboOpen}
        onClose={() => setCarimboOpen(false)}
        carimboAtual={s.carimboRegulacao}
        observacaoAtual={s.carimboObservacao}
        outrosInfoAtual={s.carimboOutrosInfo}
        solicitacaoId={s.id}
        onSalvar={(c, obs, info) => {
          setCarimbo(s.id, c, obs, info);
          toast.success('Carimbo aplicado', CARIMBO_VISUAL[c]?.label ?? c);
        }}
      />
      <PedirAjusteParecerDrawer
        open={!!ajusteParecer}
        onClose={() => setAjusteParecer(null)}
        solicitacaoId={s.id}
        parecer={ajusteParecer}
      />

      {/* Modais de confirmação de exclusão */}
      <ConfirmarExclusaoModal
        open={!!parecerExcluir}
        onClose={() => setParecerExcluir(null)}
        tipo="parecer"
        snapshot={
          parecerExcluir
            ? `Parecer #${s.pareceres.findIndex((p) => p.id === parecerExcluir.id) + 1} — ${
                parecerExcluir.decisao === 'deferido' ? 'Deferido' : 'Indeferido'
              } — ${parecerExcluir.medico} — ${new Date(parecerExcluir.data).toLocaleDateString('pt-BR')}`
            : ''
        }
        onConfirmar={() => {
          if (parecerExcluir) {
            removerParecer(s.id, parecerExcluir.id);
            toast.success('Parecer removido', `${parecerExcluir.medico}`);
          }
        }}
      />
      <ConfirmarExclusaoModal
        open={!!tentativaExcluir}
        onClose={() => setTentativaExcluir(null)}
        tipo="tentativa"
        snapshot={
          tentativaExcluir
            ? `${tentativaExcluir.unidade} — ${DESFECHO_TENTATIVA_LABEL[tentativaExcluir.desfecho]} — ${new Date(tentativaExcluir.data).toLocaleDateString('pt-BR')}`
            : ''
        }
        onConfirmar={() => {
          if (tentativaExcluir) {
            removerTentativa(s.id, tentativaExcluir.id);
            toast.success('Tentativa removida', tentativaExcluir.unidade);
          }
        }}
      />
    </div>
  );
}

function DesfechoBadge({ desfecho }: { desfecho: DesfechoTentativa }) {
  const tone: Record<DesfechoTentativa, StatusDotTone> = {
    pendente:                'muted',
    negou:                   'danger',
    pediu_documento:         'warning',
    aceitou:                 'success',
    sem_resposta:            'warning',
    agendamento_confirmado:  'success',
  };
  return <StatusDot tone={tone[desfecho]}>{DESFECHO_TENTATIVA_LABEL[desfecho]}</StatusDot>;
}

function OrigemBadge({ origem }: { origem: 'criacao' | 'excecao_cnrac' | 'excecao_cet' }) {
  const map: Record<string, { tone: StatusDotTone; label: string }> = {
    criacao:       { tone: 'success', label: 'Definido na criação' },
    excecao_cnrac: { tone: 'info',    label: 'Exceção CNRAC' },
    excecao_cet:   { tone: 'warning', label: 'Exceção CET' },
  };
  const c = map[origem];
  return <StatusDot tone={c.tone}>{c.label}</StatusDot>;
}

function Section({ icon: Icon, title, subtitle, action, children }: {
  icon: typeof Stethoscope; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="mb-6 p-6" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 0 rgba(15,23,42,0.02)' }}>
      <div className="flex items-start gap-3 mb-5">
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
          <Icon size={16} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-semibold" style={{ color: '#0F172A' }}>{title}</h3>
          {subtitle && <p className="text-[13px] mt-0.5" style={{ color: '#64748B' }}>{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function DecisaoBadge({ decisao }: { decisao: DecisaoParecer }) {
  return (
    <StatusDot tone={decisao === 'deferido' ? 'success' : 'danger'} strong>
      {decisao === 'deferido' ? 'Deferido' : 'Indeferido'}
    </StatusDot>
  );
}

function Stat({ label, value, dotTone }: { label: string; value: number; dotTone?: StatusDotTone }) {
  return (
    <div className="flex-1 px-6 py-4">
      <div className="flex items-center gap-2 mb-1">
        {dotTone && (
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: dotTone === 'success' ? '#16A34A' : dotTone === 'danger' ? '#DC2626' : '#94A3B8' }} />
        )}
        <span className="text-[12px] font-semibold uppercase" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ color: '#0F172A', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}

function StatDivider() {
  return <div style={{ width: 1, background: '#E2E8F0' }} />;
}
