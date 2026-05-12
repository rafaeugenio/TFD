'use client';

import { useMemo, useState } from 'react';
import { Plane, Wallet, Plus, Paperclip, Lock, User } from 'lucide-react';
import StatusDot, { type StatusDotTone } from './StatusDot';
import OrdinalBadge from './OrdinalBadge';
import ItemRowActions from './ItemRowActions';
import ConfirmarExclusaoModal from './ConfirmarExclusaoModal';
import NewPassagemDrawer from './drawers/NewPassagemDrawer';
import NewAjudaCustoDrawer from './drawers/NewAjudaCustoDrawer';
import NewAdicionalDrawer from './drawers/NewAdicionalDrawer';
import { isLocked, tooltipLocked } from '../_utils/lock';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { useToast } from '@/shared/components/toast/Toast';
import {
  STATUS_AJUDA_LABEL,
  STATUS_VIAGEM_LABEL,
  STATUS_ADICIONAL_LABEL,
  VALOR_DIARIA_PERNOITE,
  VALOR_DIARIA_RETORNO,
  calcularValorAjuda,
  type StatusViagem,
  type StatusAjuda,
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
  const { removerViagem, removerAjudaCusto, removerAdicional } = useFluxoV2State();
  const toast = useToast();

  const [passagemOpen, setPassagemOpen] = useState(false);
  const [passagemEditar, setPassagemEditar] = useState<ViagemMock | undefined>(undefined);
  const [ajudaOpen, setAjudaOpen] = useState(false);
  const [ajudaEditar, setAjudaEditar] = useState<AjudaCustoMock | undefined>(undefined);
  const [adicionalOpen, setAdicionalOpen] = useState(false);
  const [adicionalEditar, setAdicionalEditar] = useState<AdicionalMock | undefined>(undefined);

  const [passagemExcluir, setPassagemExcluir] = useState<ViagemMock | null>(null);
  const [ajudaExcluir, setAjudaExcluir] = useState<AjudaCustoMock | null>(null);
  const [adicionalExcluir, setAdicionalExcluir] = useState<AdicionalMock | null>(null);

  const locked = isLocked(s, 'financeiro');
  const lockedTip = tooltipLocked(s, 'financeiro');

  function abrirNovaPassagem() { setPassagemEditar(undefined); setPassagemOpen(true); }
  function abrirEditarPassagem(v: ViagemMock) { setPassagemEditar(v); setPassagemOpen(true); }
  function abrirNovaAjuda() { setAjudaEditar(undefined); setAjudaOpen(true); }
  function abrirEditarAjuda(a: AjudaCustoMock) { setAjudaEditar(a); setAjudaOpen(true); }
  function abrirNovoAdicional() { setAdicionalEditar(undefined); setAdicionalOpen(true); }
  function abrirEditarAdicional(a: AdicionalMock) { setAdicionalEditar(a); setAdicionalOpen(true); }

  // Reembolsadas e canceladas saem do total — saíram do plano.
  const totalPassagens = useMemo(
    () =>
      s.viagens
        .filter((v) => v.status !== 'reembolso' && v.status !== 'cancelada')
        .reduce((acc, v) => acc + v.valor, 0),
    [s.viagens],
  );
  const totalAjuda = useMemo(() => s.ajudasCusto.reduce((acc, a) => acc + calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor, 0), [s.ajudasCusto]);
  const totalAdicionais = useMemo(() => s.adicionais.reduce((acc, a) => acc + a.valor, 0), [s.adicionais]);
  const totalGeral = totalPassagens + totalAjuda + totalAdicionais;

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
          label="Passagens"
          value={fmtBRL(totalPassagens)}
          hint={
            passagensAcomp > 0
              ? `${s.viagens.length} trecho(s) · ${passagensPaciente} paciente · ${passagensAcomp} acomp.`
              : `${s.viagens.length} trecho(s)`
          }
        />
        <StatDivider />
        <FinStat
          label="Ajuda de custo"
          value={fmtBRL(totalAjuda)}
          hint={
            ajudasAcomp > 0
              ? `${s.ajudasCusto.length} período(s) · ${ajudasPaciente} paciente · ${ajudasAcomp} acomp.`
              : `${s.ajudasCusto.length} período(s)`
          }
        />
        <StatDivider />
        <FinStat label="Adicionais" value={fmtBRL(totalAdicionais)} hint={`${s.adicionais.length} item(ns)`} />
        <StatDivider />
        <FinStat label="Total geral" value={fmtBRL(totalGeral)} emphasis />
      </div>

      {/* Passagens */}
      <Section
        icon={Plane}
        title="Passagens"
        subtitle={`${s.viagens.length} trecho(s) · ida, volta ou transfer.`}
        action={
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={abrirNovaPassagem}
            disabled={locked}
            title={locked ? lockedTip : undefined}
          >
            <Plus size={14} /> Adicionar passagem
          </button>
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
                      <td className="px-3 py-2" style={{ color: '#475569' }}>{v.data}</td>
                      <td className="px-3 py-2 capitalize" style={{ color: '#475569' }}>{v.modal}</td>
                      <td className="px-3 py-2" style={{ color: v.companhia ? '#1A1D2B' : '#9CA3AF' }}>
                        {v.companhia ?? '—'}
                      </td>
                      <td className="px-3 py-2 capitalize" style={{ color: '#475569' }}>{v.tipo}</td>
                      <td className="px-3 py-2"><ViagemStatusBadge status={v.status} /></td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: '#1A1D2B' }}>{fmtBRL(v.valor)}</td>
                      <td className="px-3 py-2 text-right">
                        <ItemRowActions
                          onEditar={() => abrirEditarPassagem(v)}
                          onExcluir={() => setPassagemExcluir(v)}
                          disabled={locked}
                          tooltipDisabled={lockedTip}
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
      </Section>

      {/* Ajuda de Custo */}
      <Section
        icon={Wallet}
        title="Ajuda de custo"
        subtitle={`${s.ajudasCusto.length} período(s) · Total: ${fmtBRL(totalAjuda)}`}
        action={
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={abrirNovaAjuda}
            disabled={locked}
            title={locked ? lockedTip : undefined}
          >
            <Plus size={14} /> Adicionar período
          </button>
        }
      >
        <p className="text-[11px] mb-3" style={{ color: '#9CA3AF' }}>
          Memória de cálculo: <code>(dias − 1) × {fmtBRL(VALOR_DIARIA_PERNOITE)} + {fmtBRL(VALOR_DIARIA_RETORNO)}</code>
        </p>
        {s.ajudasCusto.length > 0 ? (
          <ul className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto" style={{ paddingRight: 4 }}>
            {s.ajudasCusto.map((a, idx) => {
              const calc = calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno);
              const memoria = a.pernoiteRetorno
                ? `(${calc.dias}−1) × ${VALOR_DIARIA_PERNOITE} + ${VALOR_DIARIA_RETORNO} + ${VALOR_DIARIA_PERNOITE} (pernoite retorno) = ${fmtBRL(calc.valor)}`
                : `(${calc.dias}−1) × ${VALOR_DIARIA_PERNOITE} + ${VALOR_DIARIA_RETORNO} = ${fmtBRL(calc.valor)}`;
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
                      <span>{a.dataInicio} → {a.dataFim}</span>
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
                      style={{ color: '#1A1D2B', minWidth: 96, textAlign: 'right' }}
                      title={memoria}
                    >
                      {fmtBRL(calc.valor)}
                    </span>
                    <AjudaStatusBadge status={a.status} />
                    <span style={{ color: '#9CA3AF', fontSize: 10 }}>{a.id.slice(-4)}</span>
                    <ItemRowActions
                      onEditar={() => abrirEditarAjuda(a)}
                      onExcluir={() => setAjudaExcluir(a)}
                      disabled={locked}
                      tooltipDisabled={lockedTip}
                    />
                  </div>
                  <div className="font-mono" style={{ color: '#94A3B8', fontSize: 10.5, paddingLeft: 26 }}>
                    {memoria}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Nenhum período de ajuda registrado.</p>
        )}
      </Section>

      {/* Adicionais */}
      <Section
        icon={Plus}
        title="Adicionais"
        subtitle="Passagem extra, ajuda extra, bagagem, transfer, outros."
        action={
          <button
            type="button"
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={abrirNovoAdicional}
            disabled={locked}
            title={locked ? lockedTip : undefined}
          >
            <Plus size={14} /> Adicionar adicional
          </button>
        }
      >
        {s.adicionais.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {s.adicionais.map((a, idx) => {
              const anexoNome = a.documentoUrl?.replace(/^mock:\/\//, '');
              return (
                <li key={a.id} className="flex items-start gap-3 px-3 py-2.5" style={{ background: '#F8FAFC', borderRadius: 8 }}>
                  <div className="pt-0.5"><OrdinalBadge n={idx + 1} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: '#1A1D2B' }}>
                      {a.descricao}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: '#6B7280' }}>
                      <span>{a.data}</span>
                      <span style={{ color: '#CBD5E1' }}>·</span>
                      <span className="font-mono" style={{ color: '#1A1D2B' }}>{fmtBRL(a.valor)}</span>
                      <AdicionalStatusBadge status={a.status} />
                      {anexoNome && (
                        <span
                          className="inline-flex items-center gap-1"
                          title={anexoNome}
                          style={{ color: '#475569' }}
                        >
                          <Paperclip size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <ItemRowActions
                      onEditar={() => abrirEditarAdicional(a)}
                      onExcluir={() => setAdicionalExcluir(a)}
                      disabled={locked}
                      tooltipDisabled={lockedTip}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Nenhum adicional registrado.</p>
        )}
      </Section>

      {/* Drawers */}
      <NewPassagemDrawer
        open={passagemOpen}
        onClose={() => setPassagemOpen(false)}
        solicitacaoId={s.id}
        editar={passagemEditar}
      />
      <NewAjudaCustoDrawer
        open={ajudaOpen}
        onClose={() => setAjudaOpen(false)}
        solicitacaoId={s.id}
        editar={ajudaEditar}
      />
      <NewAdicionalDrawer
        open={adicionalOpen}
        onClose={() => setAdicionalOpen(false)}
        solicitacaoId={s.id}
        editar={adicionalEditar}
      />

      {/* Modais de exclusão */}
      <ConfirmarExclusaoModal
        open={!!passagemExcluir}
        onClose={() => setPassagemExcluir(null)}
        tipo="passagem"
        snapshot={
          passagemExcluir
            ? `${passagemExcluir.origem} → ${passagemExcluir.destino} — ${passagemExcluir.tipo} — ${passagemExcluir.data} — ${fmtBRL(passagemExcluir.valor)}`
            : ''
        }
        onConfirmar={() => {
          if (passagemExcluir) {
            removerViagem(s.id, passagemExcluir.id);
            toast.success('Passagem removida', `${passagemExcluir.origem} → ${passagemExcluir.destino}`);
          }
        }}
      />
      <ConfirmarExclusaoModal
        open={!!ajudaExcluir}
        onClose={() => setAjudaExcluir(null)}
        tipo="período de ajuda"
        snapshot={
          ajudaExcluir
            ? `${ajudaExcluir.dataInicio} → ${ajudaExcluir.dataFim} — ${STATUS_AJUDA_LABEL[ajudaExcluir.status]}`
            : ''
        }
        onConfirmar={() => {
          if (ajudaExcluir) {
            removerAjudaCusto(s.id, ajudaExcluir.id);
            toast.success('Ajuda removida', `${ajudaExcluir.dataInicio} → ${ajudaExcluir.dataFim}`);
          }
        }}
      />
      <ConfirmarExclusaoModal
        open={!!adicionalExcluir}
        onClose={() => setAdicionalExcluir(null)}
        tipo="adicional"
        snapshot={
          adicionalExcluir
            ? `${adicionalExcluir.descricao} — ${adicionalExcluir.data} — ${fmtBRL(adicionalExcluir.valor)}`
            : ''
        }
        onConfirmar={() => {
          if (adicionalExcluir) {
            removerAdicional(s.id, adicionalExcluir.id);
            toast.success('Adicional removido', adicionalExcluir.descricao);
          }
        }}
      />
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, action, children }: {
  icon: typeof Plane; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
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
  em_analise:    'warning',
  aprovada:      'info',
  em_pagamento:  'info',
  concluida:     'success',
  glosada:       'danger',
};
function AjudaStatusBadge({ status }: { status: StatusAjuda }) {
  return <StatusDot tone={AJUDA_TONE[status]}>{STATUS_AJUDA_LABEL[status]}</StatusDot>;
}

const ADICIONAL_TONE = {
  pendente_aprovacao: 'warning',
  aprovado:           'info',
  indeferido:         'danger',
  pago:               'success',
} as const satisfies Record<string, StatusDotTone>;
function AdicionalStatusBadge({ status }: { status: keyof typeof ADICIONAL_TONE }) {
  return <StatusDot tone={ADICIONAL_TONE[status]}>{STATUS_ADICIONAL_LABEL[status]}</StatusDot>;
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
