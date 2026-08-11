'use client';

import { useMemo, useState } from 'react';
import { Plane, Wallet, Plus, Paperclip, Lock, User, ExternalLink, Hash } from 'lucide-react';
import StatusDot, { type StatusDotTone } from './StatusDot';
import OrdinalBadge from './OrdinalBadge';
import ItemRowActions from './ItemRowActions';
import ConfirmarExclusaoModal from './ConfirmarExclusaoModal';
import ReembolsoModal from './ReembolsoModal';
import RecalcularVoltaAjudaModal from './RecalcularVoltaAjudaModal';
import NewPassagemDrawer from './drawers/NewPassagemDrawer';
import NewAjudaCustoDrawer from './drawers/NewAjudaCustoDrawer';
import NewAdicionalDrawer from './drawers/NewAdicionalDrawer';
import FechamentoSolicitacaoCard from './FechamentoSolicitacaoCard';
import DadosBancariosBlock from './DadosBancariosBlock';
import { tooltipLocked, setorAtual } from '../_utils/lock';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { useSaldoPaciente } from '../_state/saldoAjudaCustoStore';
import { useToast } from '@/shared/components/toast/Toast';
import { fmtDataBR } from '@/shared/utils/fmtData';
import {
  STATUS_AJUDA_LABEL,
  STATUS_VIAGEM_LABEL,
  TIPO_CALCULO_AJUDA_LABEL,
  calcularAjudaCustoTipo,
  type StatusViagem,
  type StatusAjuda,
  type TipoCalculoAjuda,
  type SolicitacaoMock,
  type ViagemMock,
  type AjudaCustoMock,
  type AdicionalMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  s: SolicitacaoMock;
}

export default function FinanceiroTab({ s }: Props) {
  const {
    cancelarViagem,
    cancelarAjudaCusto,
    reembolsarAjudaCusto,
    removerAdicional,
  } = useFluxoV2State();
  const toast = useToast();

  const [passagemOpen, setPassagemOpen] = useState(false);
  const [passagemEditar, setPassagemEditar] = useState<ViagemMock | undefined>(undefined);
  const [ajudaOpen, setAjudaOpen] = useState(false);
  const [ajudaEditar, setAjudaEditar] = useState<AjudaCustoMock | undefined>(undefined);
  const [adicionalOpen, setAdicionalOpen] = useState(false);
  const [adicionalEditar, setAdicionalEditar] = useState<AdicionalMock | undefined>(undefined);
  const [ajudaPrefill, setAjudaPrefill] = useState<{ dataInicio: string; dataFim: string; observacao?: string } | undefined>(undefined);
  const [ajudaRecalcular, setAjudaRecalcular] = useState<AjudaCustoMock | null>(null);
  const { saldo: saldoPaciente } = useSaldoPaciente(s.paciente.id);
  // Correção de regra (11/08/2026) — saldo com sinal: positivo (a receber)
  // em verde, negativo (recebeu a mais) em vermelho, zero neutro.
  const saldoCor = saldoPaciente > 0.005 ? '#15803D' : saldoPaciente < -0.005 ? '#B91C1C' : '#94A3B8';
  const saldoLabel = `${saldoPaciente > 0.005 ? '+' : ''}${fmtBRL(saldoPaciente)}`;

  /** O "Excluir" da passagem virou Cancelar (inativar) — mantém histórico mas
   *  sai dos KPIs/relatórios. Modal de confirmação reusa o ConfirmarExclusaoModal. */
  const [passagemCancelar, setPassagemCancelar] = useState<ViagemMock | null>(null);
  const [ajudaCancelar, setAjudaCancelar] = useState<AjudaCustoMock | null>(null);
  const [adicionalExcluir, setAdicionalExcluir] = useState<AdicionalMock | null>(null);

  /** Modais de reembolso (passagem + ajuda). */
  const [ajudaReembolso, setAjudaReembolso] = useState<AjudaCustoMock | null>(null);

  // PBI 13237 (regras da semana) — a aba Financeiro cobre os 3 setores
  // sucessores do antigo "Financeiro" único (Passagens, Ajuda de Custo,
  // Acompanhamento), mas cada seção só é editável no setor que a possui:
  // Passagens edita passagens/adicionais e vê Ajuda de Custo travada;
  // Ajuda de Custo edita ajuda de custo e vê passagens travadas; em
  // Acompanhamento tudo é somente leitura, com exceção do status da
  // passagem e do status da ajuda de custo, que são editados pelo próprio
  // drawer de edição (os demais campos do drawer ficam travados lá dentro).
  const setorAtualS = setorAtual(s);
  const emFinanceiro =
    setorAtualS === 'passagens' || setorAtualS === 'ajuda_custo' || setorAtualS === 'acompanhamento';
  const locked = !emFinanceiro;
  const lockedPassagens = setorAtualS !== 'passagens';
  const lockedAjuda = setorAtualS !== 'ajuda_custo';
  const emAcompanhamento = setorAtualS === 'acompanhamento';
  // Em Acompanhamento, o botão Editar continua liberado — é a porta de
  // entrada pro drawer, que ali só deixa o status ser alterado.
  const editarPassagensDisabled = lockedPassagens && !emAcompanhamento;
  const editarAjudaDisabled = lockedAjuda && !emAcompanhamento;
  const lockedTip = tooltipLocked(s, 'passagens');
  const lockedTipPassagens = emAcompanhamento
    ? 'Em Acompanhamento, passagens ficam somente leitura. Apenas o status pode ser atualizado pelo drawer de edição.'
    : tooltipLocked(s, 'passagens');
  const lockedTipAjuda = emAcompanhamento
    ? 'Em Acompanhamento, ajuda de custo fica somente leitura. Apenas o status pode ser atualizado pelo drawer de edição.'
    : tooltipLocked(s, 'ajuda_custo');

  function abrirNovaPassagem() { setPassagemEditar(undefined); setPassagemOpen(true); }
  function abrirEditarPassagem(v: ViagemMock) { setPassagemEditar(v); setPassagemOpen(true); }
  function abrirNovaAjuda() { setAjudaEditar(undefined); setAjudaPrefill(undefined); setAjudaOpen(true); }
  function abrirEditarAjuda(a: AjudaCustoMock) { setAjudaEditar(a); setAjudaPrefill(undefined); setAjudaOpen(true); }
  function abrirNovoAdicional() { setAdicionalEditar(undefined); setAdicionalOpen(true); }
  function abrirEditarAdicional(a: AdicionalMock) { setAdicionalEditar(a); setAdicionalOpen(true); }

  // KPIs descontam reembolsos e ignoram inativas (canceladas).
  // valor_efetivo = valor - COALESCE(valor_reembolso, 0) quando ativa = true
  const totalPassagens = useMemo(
    () =>
      s.viagens
        .filter((v) => v.ativa !== false)
        .reduce((acc, v) => acc + (v.valor - (v.valorReembolso ?? 0)), 0),
    [s.viagens],
  );
  // Correção de regra (11/08/2026) — o total só conta períodos que
  // representam pagamento de fato (padrão e integral). Aditiva e subtrativa
  // existem para registrar a diferença e alimentar o saldo do paciente
  // (ver saldoAjudaCustoStore), nunca entram no total pago — senão o mesmo
  // valor apareceria contado duas vezes (uma no período, outra no saldo).
  const totalAjuda = useMemo(
    () =>
      s.ajudasCusto
        .filter((a) => {
          if (a.ativa === false) return false;
          const tipo = a.tipoCalculo ?? 'padrao';
          return tipo !== 'aditiva' && tipo !== 'subtrativa';
        })
        .reduce((acc, a) => acc + (calcularAjudaCustoTipo({
          tipoCalculo: a.tipoCalculo ?? 'padrao',
          dataInicio: a.dataInicio,
          dataFim: a.dataFim,
          valorDiariaFinal: a.valorDiariaFinal,
          pernoiteRetorno: a.pernoiteRetorno,
        }).valor - (a.valorReembolso ?? 0)), 0),
    [s.ajudasCusto],
  );
  const totalAdicionais = useMemo(() => s.adicionais.reduce((acc, a) => acc + a.valor, 0), [s.adicionais]);
  const totalFuneraria = useMemo(
    () => s.despesasFunerarias.reduce((acc, d) => acc + d.valor, 0),
    [s.despesasFunerarias],
  );
  const totalGeral = totalPassagens + totalAjuda + totalAdicionais + totalFuneraria;

  // T2.AF — contagem por beneficiário
  const passagensPaciente = useMemo(
    () => s.viagens.filter((v) => v.beneficiarioTipo === 'paciente').length,
    [s.viagens],
  );
  const passagensAcomp = s.viagens.length - passagensPaciente;

  // T2.AQ — contagem de ajudas por beneficiário
  const ajudasPaciente = useMemo(
    () => s.ajudasCusto.filter((a) => a.beneficiarioTipo === 'paciente').length,
    [s.ajudasCusto],
  );
  const ajudasAcomp = s.ajudasCusto.length - ajudasPaciente;

  return (
    <div>
      {/* T2.AC — Aviso de lock quando solicitação não está com o financeiro */}
      {locked && (
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

      {/* Aviso específico do Acompanhamento — tudo somente leitura, exceto o
          status da passagem e o status da ajuda de custo. */}
      {emAcompanhamento && (
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
            <strong style={{ color: '#1A1D2B' }}>Somente leitura em Acompanhamento.</strong>{' '}
            Abra o drawer de edição da passagem ou da ajuda de custo para atualizar o status. Os demais campos ficam travados lá dentro.
          </div>
        </div>
      )}

      {/* Linha tipográfica horizontal — 4 stats neutros com divisor vertical */}
      <div
        className="flex items-stretch mb-6"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        <FinStat
          label="Viagens"
          value={fmtBRL(totalPassagens + totalAdicionais)}
          hint={
            `${s.viagens.length} trecho(s)${
              passagensAcomp > 0 ? ` · ${passagensPaciente} pac. · ${passagensAcomp} acomp.` : ''
            }${s.adicionais.length > 0 ? ` · ${s.adicionais.length} adic.` : ''}`
          }
        />
        <StatDivider />
        <FinStat
          label="Ajuda de custo"
          value={fmtBRL(totalAjuda)}
          hint={
            ajudasAcomp > 0
              ? `${s.ajudasCusto.length} período(s) · ${ajudasPaciente} pac. · ${ajudasAcomp} acomp.`
              : `${s.ajudasCusto.length} período(s)`
          }
        />
        {totalFuneraria > 0 && (
          <>
            <StatDivider />
            <FinStat
              label="Funerária"
              value={fmtBRL(totalFuneraria)}
              hint={`${s.despesasFunerarias.length} despesa(s)`}
            />
          </>
        )}
        <StatDivider />
        <FinStat label="Total geral" value={fmtBRL(totalGeral)} emphasis />
      </div>

      {/* Viagens (passagens + adicionais — mesmo setor) */}
      <Section
        icon={Plane}
        title="Viagens"
        subtitle={`${s.viagens.length} trecho(s) · ida, volta ou transfer.${
          s.adicionais.length > 0 ? ` ${s.adicionais.length} adicional(is) vinculado(s).` : ''
        }`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="tfd-btn tfd-btn-secondary tfd-btn--sm"
              onClick={abrirNovoAdicional}
              disabled={lockedPassagens}
              title={lockedPassagens ? lockedTipPassagens : 'Adicional vinculado à viagem (bagagem extra, oxigênio, assento, etc.)'}
            >
              <Plus size={14} /> Adicional
            </button>
            <button
              type="button"
              className="tfd-btn tfd-btn-primary tfd-btn--sm"
              onClick={abrirNovaPassagem}
              disabled={lockedPassagens}
              title={lockedPassagens ? lockedTipPassagens : undefined}
            >
              <Plus size={14} /> Passagem
            </button>
          </div>
        }
      >
        {s.viagens.length > 0 ? (
          <div className="overflow-hidden" style={{ border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: '#475569', width: 56 }}>#</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: '#475569' }}>Trecho</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: '#475569' }}>Data</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: '#475569' }}>Modal</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: '#475569' }}>Companhia</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: '#475569' }}>Tipo</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: '#475569' }}>Status</th>
                  <th className="text-right px-3 py-2 font-medium" style={{ color: '#475569' }}>Valor</th>
                  <th className="text-right px-3 py-2 font-medium" style={{ color: '#475569', width: 64 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {s.viagens.map((v, idx) => {
                  const acomp = v.beneficiarioTipo === 'acompanhante' && v.beneficiarioId
                    ? s.acompanhantes.find((a) => a.id === v.beneficiarioId)
                    : null;
                  return (
                    <tr key={v.id} style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                      <td className="px-3 py-2"><OrdinalBadge n={idx + 1} /></td>
                      <td className="px-3 py-2" style={{ color: '#1A1D2B' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{v.origem} → {v.destino}</span>
                          <BeneficiarioBadge
                            tipo={v.beneficiarioTipo}
                            nomeAcomp={acomp?.nome}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2" style={{ color: '#475569' }}>{fmtDataBR(v.data)}</td>
                      <td className="px-3 py-2 capitalize" style={{ color: '#475569' }}>{v.modal}</td>
                      <td className="px-3 py-2" style={{ color: v.companhia ? '#1A1D2B' : '#9CA3AF' }}>
                        {v.companhia ?? '—'}
                      </td>
                      <td className="px-3 py-2 capitalize" style={{ color: '#475569' }}>{v.tipo}</td>
                      <td className="px-3 py-2">
                        <ViagemStatusBadge status={v.status} />
                      </td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: v.ativa === false ? '#94A3B8' : '#1A1D2B', textDecoration: v.ativa === false ? 'line-through' : undefined }}>
                        {fmtBRL(v.valor)}
                        {v.valorReembolso != null && v.valorReembolso > 0 && (
                          <span className="block text-[10px] font-normal" style={{ color: '#B45309' }}>
                            −{fmtBRL(v.valorReembolso)} reemb.
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ItemRowActions
                          onEditar={() => abrirEditarPassagem(v)}
                          onExcluir={() => setPassagemCancelar(v)}
                          labelExcluir={v.ativa === false ? 'Já cancelada' : 'Cancelar passagem'}
                          disabled={lockedPassagens}
                          disabledEditar={editarPassagensDisabled}
                          tooltipDisabled={lockedTipPassagens}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Nenhuma passagem registrada ainda.</p>
        )}

        {/* ── Sub-bloco: Adicionais vinculados à viagem ── */}
        {s.adicionais.length > 0 && (
          <div className="mt-5 pt-4" style={{ borderTop: '1px dashed var(--tfd-surface-border)' }}>
            <div className="flex items-baseline justify-between mb-2">
              <h4 className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>
                Adicionais
              </h4>
              <span className="text-[11px]" style={{ color: '#94A3B8' }}>
                Bagagem, oxigênio, assento, transfer — conforme contrato.
              </span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {s.adicionais.map((a, idx) => {
                const anexoNome = a.documentoUrl?.replace(/^mock:\/\//, '');
                const acomp = a.beneficiarioTipo === 'acompanhante' && a.beneficiarioId
                  ? s.acompanhantes.find((ac) => ac.id === a.beneficiarioId)
                  : null;
                return (
                  <li key={a.id} className="flex items-start gap-3 px-3 py-2.5" style={{ background: '#F8FAFC', borderRadius: 8 }}>
                    <div className="pt-0.5"><OrdinalBadge n={idx + 1} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold" style={{ color: '#1A1D2B' }}>
                          {a.descricao}
                        </p>
                        <BeneficiarioBadge tipo={a.beneficiarioTipo ?? 'paciente'} nomeAcomp={acomp?.nome} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: '#6B7280' }}>
                        <span>{fmtDataBR(a.data)}</span>
                        <span style={{ color: '#CBD5E1' }}>·</span>
                        <span className="font-mono" style={{ color: '#1A1D2B' }}>{fmtBRL(a.valor)}</span>
                        {anexoNome && (
                          <span className="inline-flex items-center gap-1" title={anexoNome} style={{ color: '#475569' }}>
                            <Paperclip size={11} />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pt-0.5">
                      <ItemRowActions
                        onEditar={() => abrirEditarAdicional(a)}
                        onExcluir={() => setAdicionalExcluir(a)}
                        disabled={lockedPassagens}
                        tooltipDisabled={lockedTipPassagens}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Section>

      {/* Ajuda de Custo */}
      <Section
        icon={Wallet}
        title="Ajuda de custo"
        subtitle={
          <>
            {s.ajudasCusto.length} período(s) · Pago {fmtBRL(totalAjuda)} · Saldo do paciente{' '}
            <span style={{ color: saldoCor, fontWeight: 600 }}>{saldoLabel}</span>
          </>
        }
        action={
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={abrirNovaAjuda}
            disabled={lockedAjuda}
            title={lockedAjuda ? lockedTipAjuda : undefined}
          >
            <Plus size={14} /> Adicionar período
          </button>
        }
      >
        {/* PBI — saldo de ajuda de custo do paciente, sempre visível (mesmo
            zerado) porque é usado no cálculo do próximo período lançado. */}
        <div
          className="flex items-center gap-2 mb-3 px-3 py-2"
          style={{
            background: saldoPaciente > 0.005 ? '#F0FDF4' : saldoPaciente < -0.005 ? '#FEF2F2' : '#F8FAFC',
            border: `1px solid ${saldoPaciente > 0.005 ? '#BBF7D0' : saldoPaciente < -0.005 ? '#FECACA' : 'var(--tfd-surface-border)'}`,
            borderRadius: 8,
          }}
        >
          <Wallet size={14} style={{ color: saldoCor, flexShrink: 0 }} />
          <span className="text-[12px]" style={{ color: saldoCor }}>
            Saldo do paciente: <strong>{saldoLabel}</strong>
          </span>
        </div>

        {s.ajudasCusto.length > 0 ? (
          <ul className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto" style={{ paddingRight: 4 }}>
            {s.ajudasCusto.map((a, idx) => {
              const calc = calcularAjudaCustoTipo({
                tipoCalculo: a.tipoCalculo ?? 'padrao',
                dataInicio: a.dataInicio,
                dataFim: a.dataFim,
                valorDiariaFinal: a.valorDiariaFinal,
                pernoiteRetorno: a.pernoiteRetorno,
                ajudaReferencia: a.ajudaReferenciaId ? s.ajudasCusto.find((x) => x.id === a.ajudaReferenciaId) : undefined,
              });
              const memoria = calc.memoria;
              const acomp =
                a.beneficiarioTipo === 'acompanhante' && a.beneficiarioId
                  ? s.acompanhantes.find((ac) => ac.id === a.beneficiarioId)
                  : null;
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-1 px-3 py-2 text-[12px]"
                  style={{ background: '#F8FAFC', borderRadius: 8 }}
                >
                  <div className="flex items-center gap-2">
                    <OrdinalBadge n={idx + 1} />
                    <span className="flex-1 min-w-0 flex items-center gap-2 flex-wrap" style={{ color: '#1A1D2B' }}>
                      <span>{fmtDataBR(a.dataInicio)} → {fmtDataBR(a.dataFim)}</span>
                      <BeneficiarioBadge tipo={a.beneficiarioTipo} nomeAcomp={acomp?.nome} />
                    </span>
                    <span style={{ color: '#475569' }}>{calc.dias} dia(s)</span>
                    {a.pernoiteRetorno && (
                      <StatusDot tone="info" title="Pernoite no retorno (chegou após meia-noite)">
                        + Pernoite
                      </StatusDot>
                    )}
                    <span
                      className="font-mono"
                      style={{
                        color: a.ativa === false ? '#94A3B8' : '#1A1D2B',
                        minWidth: 96,
                        textAlign: 'right',
                        textDecoration: a.ativa === false ? 'line-through' : undefined,
                      }}
                      title={memoria}
                    >
                      {fmtBRL(calc.valor)}
                      {a.valorReembolso != null && a.valorReembolso > 0 && (
                        <span className="block text-[10px] font-normal" style={{ color: '#B45309' }}>
                          −{fmtBRL(a.valorReembolso)} reemb.
                        </span>
                      )}
                    </span>
                    <AjudaStatusBadge status={a.status} />
                    <TipoCalculoAjudaBadge tipo={a.tipoCalculo ?? 'padrao'} />
                    <span style={{ color: '#9CA3AF', fontSize: 10 }}>{a.id.slice(-4)}</span>
                    <ItemRowActions
                      onEditar={() => abrirEditarAjuda(a)}
                      onRecalcular={a.ativa === false ? undefined : () => setAjudaRecalcular(a)}
                      onReembolso={a.ativa === false ? undefined : () => setAjudaReembolso(a)}
                      onExcluir={() => setAjudaCancelar(a)}
                      labelExcluir={a.ativa === false ? 'Já cancelada' : 'Cancelar ajuda'}
                      labelReembolso={a.valorReembolso != null ? 'Editar reembolso' : 'Reembolsar'}
                      reembolsado={a.valorReembolso != null && a.valorReembolso > 0}
                      disabled={lockedAjuda}
                      disabledEditar={editarAjudaDisabled}
                      tooltipDisabled={lockedTipAjuda}
                    />
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2" style={{ paddingLeft: 26 }}>
                    <div className="font-mono" style={{ color: '#94A3B8', fontSize: 10.5 }}>
                      {memoria}
                    </div>
                    {/* PBI 13218 — processo próprio da ajuda no SEI, hiperlink de acesso rápido. */}
                    {a.linkProcesso ? (
                      <a
                        href={a.linkProcesso}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono transition-colors hover:underline"
                        style={{ color: '#146BFA', fontSize: 10.5, textUnderlineOffset: 2 }}
                        title="Abrir processo no SEI"
                      >
                        <Hash size={10} style={{ opacity: 0.7 }} />
                        {a.numeroSEI || 'Processo SEI'}
                        <ExternalLink size={10} style={{ opacity: 0.6 }} />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono" style={{ color: '#CBD5E1', fontSize: 10.5 }}>
                        <Hash size={10} /> Sem processo SEI
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Nenhum período de ajuda registrado.</p>
        )}

        {/* ── Sub-bloco: Dados bancários da solicitação ── */}
        <DadosBancariosBlock
          solicitacaoId={s.id}
          pacienteId={s.paciente.id}
          pacienteCpf={s.paciente.cpf}
          pacienteNome={s.paciente.nome}
          locked={lockedAjuda}
          lockedTip={lockedTipAjuda}
        />

        {/* ── Sub-bloco: documentos do fechamento (despacho + recibo, PBI 13279) ──
            Os dois documentos referenciam um ciclo de ajuda de custo, então
            moram aqui dentro da própria seção. Só existem no setor Ajuda de
            Custo, que é quem paga a ajuda referenciada. */}
        {setorAtualS === 'ajuda_custo' && (
          <FechamentoSolicitacaoCard
            s={s}
            locked={locked || emAcompanhamento}
            lockedTip={emAcompanhamento ? 'Somente leitura em Acompanhamento.' : lockedTip}
          />
        )}
      </Section>

      {/* Drawers */}
      <NewPassagemDrawer
        open={passagemOpen}
        onClose={() => setPassagemOpen(false)}
        solicitacaoId={s.id}
        editar={passagemEditar}
        somenteStatus={emAcompanhamento}
      />
      <NewAjudaCustoDrawer
        open={ajudaOpen}
        onClose={() => { setAjudaOpen(false); setAjudaPrefill(undefined); }}
        solicitacaoId={s.id}
        editar={ajudaEditar}
        prefill={ajudaPrefill}
        somenteStatus={emAcompanhamento}
      />

      {/* PBI — recalcular período pela data real de volta (saldo entre ciclos). */}
      <RecalcularVoltaAjudaModal
        open={!!ajudaRecalcular}
        onClose={() => setAjudaRecalcular(null)}
        solicitacaoId={s.id}
        solicitacaoNumero={s.numero}
        pacienteId={s.paciente.id}
        ajuda={ajudaRecalcular}
        onAbrirComplemento={(prefill) => {
          setAjudaEditar(undefined);
          setAjudaPrefill(prefill);
          setAjudaOpen(true);
        }}
      />
      <NewAdicionalDrawer
        open={adicionalOpen}
        onClose={() => setAdicionalOpen(false)}
        solicitacaoId={s.id}
        editar={adicionalEditar}
      />

      {/* Modais de cancelamento (substituem o "excluir") + reembolso */}
      <ConfirmarExclusaoModal
        open={!!passagemCancelar}
        onClose={() => setPassagemCancelar(null)}
        tipo="cancelar passagem"
        snapshot={
          passagemCancelar
            ? `${passagemCancelar.origem} → ${passagemCancelar.destino} — ${passagemCancelar.tipo} — ${fmtDataBR(passagemCancelar.data)} — ${fmtBRL(passagemCancelar.valor)}`
            : ''
        }
        onConfirmar={() => {
          if (passagemCancelar) {
            cancelarViagem(s.id, passagemCancelar.id);
            toast.success('Passagem cancelada', `${passagemCancelar.origem} → ${passagemCancelar.destino}`);
          }
        }}
      />
      <ConfirmarExclusaoModal
        open={!!ajudaCancelar}
        onClose={() => setAjudaCancelar(null)}
        tipo="cancelar ajuda"
        snapshot={
          ajudaCancelar
            ? `${fmtDataBR(ajudaCancelar.dataInicio)} → ${fmtDataBR(ajudaCancelar.dataFim)} — ${STATUS_AJUDA_LABEL[ajudaCancelar.status]}`
            : ''
        }
        onConfirmar={() => {
          if (ajudaCancelar) {
            cancelarAjudaCusto(s.id, ajudaCancelar.id);
            toast.success('Ajuda cancelada', `${fmtDataBR(ajudaCancelar.dataInicio)} → ${fmtDataBR(ajudaCancelar.dataFim)}`);
          }
        }}
      />
      <ConfirmarExclusaoModal
        open={!!adicionalExcluir}
        onClose={() => setAdicionalExcluir(null)}
        tipo="adicional"
        snapshot={
          adicionalExcluir
            ? `${adicionalExcluir.descricao} — ${fmtDataBR(adicionalExcluir.data)} — ${fmtBRL(adicionalExcluir.valor)}`
            : ''
        }
        onConfirmar={() => {
          if (adicionalExcluir) {
            removerAdicional(s.id, adicionalExcluir.id);
            toast.success('Adicional removido', adicionalExcluir.descricao);
          }
        }}
      />

      {/* Reembolso de ajuda de custo (passagem é tratada no próprio drawer) */}
      <ReembolsoModal
        open={!!ajudaReembolso}
        titulo="Reembolsar ajuda de custo"
        subtitulo={
          ajudaReembolso
            ? `${fmtDataBR(ajudaReembolso.dataInicio)} → ${fmtDataBR(ajudaReembolso.dataFim)}`
            : undefined
        }
        valorTotal={
          ajudaReembolso
            ? calcularAjudaCustoTipo({
                tipoCalculo: ajudaReembolso.tipoCalculo ?? 'padrao',
                dataInicio: ajudaReembolso.dataInicio,
                dataFim: ajudaReembolso.dataFim,
                valorDiariaFinal: ajudaReembolso.valorDiariaFinal,
                pernoiteRetorno: ajudaReembolso.pernoiteRetorno,
                ajudaReferencia: ajudaReembolso.ajudaReferenciaId
                  ? s.ajudasCusto.find((x) => x.id === ajudaReembolso.ajudaReferenciaId)
                  : undefined,
              }).valor
            : 0
        }
        valorAtual={ajudaReembolso?.valorReembolso}
        dataAtual={ajudaReembolso?.dataReembolso}
        onClose={() => setAjudaReembolso(null)}
        onConfirm={(valor, data) => {
          if (ajudaReembolso) {
            reembolsarAjudaCusto(s.id, ajudaReembolso.id, valor, data);
            toast.success('Reembolso registrado', `${fmtBRL(valor)} em ${fmtDataBR(data)}`);
          }
          setAjudaReembolso(null);
        }}
      />
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, action, children }: {
  icon: typeof Plane; title: string; subtitle?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
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

const VIAGEM_TONE: Record<StatusViagem, StatusDotTone> = {
  agendada:       'neutral',
  confirmada:     'success',
  remarcada:      'info',
  nao_compareceu: 'warning',
  cancelada:      'danger',
  reembolso:      'muted',
};
function ViagemStatusBadge({ status }: { status: StatusViagem }) {
  return <StatusDot tone={VIAGEM_TONE[status]}>{STATUS_VIAGEM_LABEL[status]}</StatusDot>;
}

const AJUDA_TONE: Record<StatusAjuda, StatusDotTone> = {
  emitido:   'info',
  concluido: 'success',
  glosada:   'danger',
};
function AjudaStatusBadge({ status }: { status: StatusAjuda }) {
  return <StatusDot tone={AJUDA_TONE[status]}>{STATUS_AJUDA_LABEL[status]}</StatusDot>;
}

/** Tipo de cálculo da ajuda (discovery 09/08/2026) — badge neutro, a cor já
 *  está ocupada pelo status ao lado. */
const TIPO_CALCULO_TONE: Record<TipoCalculoAjuda, StatusDotTone> = {
  padrao: 'neutral',
  integral: 'muted',
  aditiva: 'warning',
  subtrativa: 'danger',
};
function TipoCalculoAjudaBadge({ tipo }: { tipo: TipoCalculoAjuda }) {
  return <StatusDot tone={TIPO_CALCULO_TONE[tipo]}>{TIPO_CALCULO_AJUDA_LABEL[tipo]}</StatusDot>;
}

/** Beneficiário — texto cinza neutro com ícone, sem cor. */
function BeneficiarioBadge({
  tipo,
  nomeAcomp,
}: {
  tipo: 'paciente' | 'acompanhante';
  nomeAcomp?: string;
}) {
  const label = tipo === 'paciente' ? 'Paciente' : (nomeAcomp ? primeiroNome(nomeAcomp) : 'Acompanhante');
  const title = tipo === 'paciente'
    ? 'Passagem para o paciente'
    : (nomeAcomp ? `Acompanhante: ${nomeAcomp}` : 'Passagem para acompanhante');
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 text-[12px]"
      style={{ color: '#64748B' }}
    >
      <User size={11} strokeWidth={2} style={{ color: '#94A3B8' }} />
      {label}
    </span>
  );
}

function primeiroNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length <= 1) return partes[0] ?? nome;
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function FinStat({ label, value, hint, emphasis }: { label: string; value: string; hint?: string; emphasis?: boolean }) {
  return (
    <div className="flex-1 min-w-0 px-5 py-4">
      <div className="text-[12px] font-semibold uppercase mb-1" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div
        className="font-mono"
        style={{
          color: '#0F172A',
          fontSize: emphasis ? 20 : 17,
          fontWeight: emphasis ? 700 : 600,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[12px] mt-1" style={{ color: '#94A3B8' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function StatDivider() {
  return <div style={{ width: 1, background: '#E2E8F0' }} />;
}
