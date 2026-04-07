'use client';

import { useState } from 'react';
import {
  Search,
  User,
  FileText,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  ArrowLeft,
  Plane,
  ArrowRight,
  Clock,
  Stethoscope,
  ShieldCheck,
  ClipboardCheck,
  Home,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

import { buscarPorCpf, historicoProcessosCompleto } from '@/services/pacientes.service';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { formatCPF, formatCNS, formatDate, formatDateTime, formatCurrency } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/lib/supabase/database.types';

/* -------------------------------------------------- */
/*  Labels                                             */
/* -------------------------------------------------- */

const situacaoViagemLabel: Record<string, string> = {
  AGUARDANDO_EMISSAO: 'Pendente',
  EMITIDA: 'Emitida',
  REMARCADA: 'Remarcada',
  CANCELADA: 'Cancelada',
  NO_SHOW: 'Não Compareceu',
  UTILIZADA: 'Utilizada',
};

const parecerLabels: Record<string, { label: string; bg: string; color: string }> = {
  DEFERIDO: { label: 'Deferido', bg: '#DCFCE7', color: '#15803D' },
  INDEFERIDO: { label: 'Indeferido', bg: '#FEE2E2', color: '#B91C1C' },
  EXIGENCIA: { label: 'Exigência', bg: '#FEF3C7', color: '#92400E' },
};

const rotaLabels: Record<string, string> = {
  CNRAC: 'CNRAC',
  SETI: 'SETI',
  SAAS_DUTRA: 'SAAS / Hospital Dutra',
  RESPOSTA_EXTERNA: 'Consulta SAAS/Dutra',
  SERVICO_SOCIAL: 'Serviço Social',
  APROVADO_DIRETO: 'Aprovação Direta',
  APROVADO_PRORROGACAO: 'Prorrogação Aprovada',
  REPROVADO_PRORROGACAO: 'Prorrogação Indeferida',
};

const motivoAltaLabels: Record<string, string> = {
  ALTA_MEDICA: 'Alta Médica',
  OBITO: 'Óbito',
  DESISTENCIA: 'Desistência',
  ABANDONO: 'Abandono',
  TRANSFERENCIA: 'Transferência',
};

/* -------------------------------------------------- */
/*  Helper                                             */
/* -------------------------------------------------- */

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

function maskCpfInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function ConsultaExternaPage() {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paciente, setPaciente] = useState<any>(null);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleBuscar() {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      setError('Informe um CPF válido com 11 dígitos.');
      return;
    }

    setError('');
    setLoading(true);
    setPaciente(null);
    setSolicitacoes([]);

    const { data: pac, error: pacErr } = await buscarPorCpf(digits);
    if (pacErr || !pac) {
      setError('Nenhum paciente encontrado com este CPF.');
      setLoading(false);
      return;
    }

    setPaciente(pac);

    const { data: sols, error: solsErr } = await historicoProcessosCompleto(pac.id);
    if (solsErr) {
      console.error('Erro ao buscar solicitações:', solsErr);
    }
    setSolicitacoes(sols ?? []);
    setLoading(false);
  }

  function handleVoltar() {
    setPaciente(null);
    setSolicitacoes([]);
    setCpf('');
    setError('');
    setExpandedId(null);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tfd-surface-ground)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-6 py-4" style={{ background: 'var(--tfd-surface-card)', borderBottom: '1px solid var(--tfd-surface-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
            <FileText size={18} />
          </div>
          <div>
            <h1 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Consulta de Solicitações TFD</h1>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Consulte o andamento das suas solicitações</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* ========== Search State ========== */}
        {!paciente && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                <Search size={28} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Consultar solicitações</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                Digite seu CPF para visualizar suas solicitações de Tratamento Fora de Domicílio.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <label className="tfd-label">CPF</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="tfd-input flex-1"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(maskCpfInput(e.target.value))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBuscar(); }}
                  maxLength={14}
                />
                <button className="tfd-btn tfd-btn-primary" onClick={handleBuscar} disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={16} /> Buscar</>}
                </button>
              </div>
              {error && (
                <p className="text-sm mt-2" style={{ color: 'var(--tfd-status-danger)' }}>{error}</p>
              )}
            </div>
          </div>
        )}

        {/* ========== Results State ========== */}
        {paciente && (
          <div className="space-y-6">
            {/* Back button */}
            <button className="tfd-btn tfd-btn-ghost" onClick={handleVoltar}>
              <ArrowLeft size={16} /> Nova consulta
            </button>

            {/* Patient card */}
            <div className="tfd-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{paciente.nome_completo}</h3>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dados do paciente</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoItem icon={<FileText size={14} />} label="CPF" value={formatCPF(paciente.cpf ?? '')} mono />
                {paciente.cns && <InfoItem icon={<FileText size={14} />} label="CNS" value={formatCNS(paciente.cns)} mono />}
                <InfoItem icon={<Calendar size={14} />} label="Data de Nascimento" value={formatDate(paciente.data_nascimento)} />
                <InfoItem icon={<User size={14} />} label="Sexo" value={paciente.sexo === 'MASCULINO' ? 'Masculino' : paciente.sexo === 'FEMININO' ? 'Feminino' : paciente.sexo ?? '—'} />
                {(paciente.telefone_celular || paciente.telefone_fixo) && (
                  <InfoItem icon={<Phone size={14} />} label="Telefone" value={paciente.telefone_celular ?? paciente.telefone_fixo} />
                )}
                {paciente.email && <InfoItem icon={<FileText size={14} />} label="E-mail" value={paciente.email} />}
                <InfoItem icon={<MapPin size={14} />} label="Endereço" value={[paciente.logradouro, paciente.numero, paciente.bairro].filter(Boolean).join(', ') || '—'} span2 />
              </div>
            </div>

            {/* Solicitações */}
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                Solicitações ({solicitacoes.length})
              </h3>

              {solicitacoes.length === 0 ? (
                <div className="tfd-card text-center py-8">
                  <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--tfd-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma solicitação encontrada.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {solicitacoes.map((sol: any) => (
                    <SolicitacaoCard
                      key={sol.id}
                      sol={sol}
                      expanded={expandedId === sol.id}
                      onToggle={() => setExpandedId(expandedId === sol.id ? null : sol.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
        Sistema TFD — Tratamento Fora de Domicílio
      </footer>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Solicitação Card (expandable)                      */
/* -------------------------------------------------- */

function SolicitacaoCard({ sol, expanded, onToggle }: { sol: any; expanded: boolean; onToggle: () => void }) {
  const pareceres = sol.pareceres ?? [];
  const parecer = pareceres[0];
  const rotas = sol.rotas_regulacao ?? [];
  const agendamentos = sol.agendamentos ?? [];
  const agendamento = agendamentos[0];
  const viagens = sol.viagens ?? [];
  const ajudas = sol.ajudas_custo ?? [];
  const permanencias = sol.permanencias ?? [];
  const permanencia = permanencias[0];
  const encerramentos = sol.encerramentos ?? [];
  const encerramento = encerramentos[0];

  return (
    <div className="tfd-card">
      {/* Summary row — always visible */}
      <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-600)' }}>
              {sol.numero_processo}
            </span>
            <StatusTag status={sol.status as StatusSolicitacao} />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Aberto em {fmtDate(sol.created_at)}
            {sol.cid10_principal && <> — CID: <strong>{sol.cid10_principal}</strong></>}
          </p>
        </div>
        <span className="text-xs shrink-0" style={{ color: 'var(--tfd-text-muted)', transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 200ms' }}>
          &#9654;
        </span>
      </div>

      {/* Expanded details — ALL sections always visible */}
      {expanded && (
        <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>

          {/* ── Diagnóstico Clínico ── */}
          <SectionCard icon={<Stethoscope size={15} />} title="Diagnóstico Clínico">
            {sol.cid10_principal ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>CID-10</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                    <code className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-700)', fontFamily: 'var(--tfd-font-mono)' }}>
                      {sol.cid10_principal}
                    </code>
                    {sol.descricao_diagnostico && <span className="ml-2">{sol.descricao_diagnostico}</span>}
                  </p>
                </div>
                {sol.tipo_procedimento && (
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Procedimento</p>
                    <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{sol.tipo_procedimento}</p>
                  </div>
                )}
                {sol.justificativa_tfd && (
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Justificativa clínica</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-secondary)' }}>{sol.justificativa_tfd}</p>
                  </div>
                )}
              </div>
            ) : <EmptyStep />}
          </SectionCard>

          {/* ── Parecer Médico ── */}
          <SectionCard
            icon={<ShieldCheck size={15} />}
            title="Parecer Médico"
            badge={parecer && parecerLabels[parecer.decisao] ? (
              <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: parecerLabels[parecer.decisao].bg, color: parecerLabels[parecer.decisao].color }}>
                {parecerLabels[parecer.decisao].label}
              </span>
            ) : undefined}
          >
            {parecer ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data do parecer</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{formatDateTime(parecer.created_at)}</p>
                </div>
                {parecer.observacoes_medicas && (
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Observações</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-secondary)' }}>{parecer.observacoes_medicas}</p>
                  </div>
                )}
              </div>
            ) : <EmptyStep />}
          </SectionCard>

          {/* ── Regulação ── */}
          <SectionCard
            icon={<ClipboardCheck size={15} />}
            title="Regulação"
            badge={rotas.length > 0 ? (
              <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{
                backgroundColor: rotas[0].tipo_rota === 'APROVADO_DIRETO' ? '#DCFCE7' : '#DBEAFE',
                color: rotas[0].tipo_rota === 'APROVADO_DIRETO' ? '#15803D' : '#1D4ED8',
              }}>
                {rotaLabels[rotas[0].tipo_rota] ?? rotas[0].tipo_rota}
              </span>
            ) : undefined}
          >
            {rotas.length > 0 ? (
              <div className="space-y-3">
                {rotas.map((rota: any) => (
                  <div key={rota.id} className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Decisão</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{rotaLabels[rota.tipo_rota] ?? rota.tipo_rota}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data</p>
                      <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{fmtDate(rota.created_at)}</p>
                    </div>
                    {rota.justificativa && (
                      <div className="col-span-2">
                        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Justificativa</p>
                        <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{rota.justificativa}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <EmptyStep />}
          </SectionCard>

          {/* ── Agendamento ── */}
          <SectionCard
            icon={<Calendar size={15} />}
            title="Agendamento no Destino"
            badge={agendamento ? (
              <span className={`tfd-tag tfd-tag--rounded tfd-tag--dot ${agendamento.status === 'CONFIRMADO' ? 'tfd-tag--success' : 'tfd-tag--warning'}`}>
                {agendamento.status === 'CONFIRMADO' ? 'Confirmado' : 'Pendente'}
              </span>
            ) : undefined}
          >
            {agendamento ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Unidade</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{agendamento.unidade_executante ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Destino</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{[agendamento.cidade_destino, agendamento.uf_destino].filter(Boolean).join('/') || '—'}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{formatDateTime(agendamento.data_hora_agendamento)}</p>
                </div>
                {agendamento.tipo_atendimento && (
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Tipo</p>
                    <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{agendamento.tipo_atendimento.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </div>
            ) : <EmptyStep />}
          </SectionCard>

          {/* ── Viagens ── */}
          <SectionCard icon={<Plane size={15} />} title={viagens.length > 0 ? `Viagens (${viagens.length})` : 'Viagens'}>
            {viagens.length > 0 ? (
              <div className="space-y-2">
                {[...viagens].sort((a: any, b: any) => {
                  const ta = a.tipo === 'IDA' ? 0 : 1;
                  const tb = b.tipo === 'IDA' ? 0 : 1;
                  if (ta !== tb) return ta - tb;
                  return (a.numero_sequencial ?? 1) - (b.numero_sequencial ?? 1);
                }).map((v: any) => {
                  const tipoLabel = v.tipo === 'IDA' ? 'Ida' : 'Volta';
                  const seq = v.numero_sequencial ?? 1;
                  const isTerminal = ['CANCELADA', 'NO_SHOW', 'REMARCADA'].includes(v.situacao);
                  return (
                    <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--tfd-surface-50)', opacity: isTerminal ? 0.5 : 1 }}>
                      <Plane size={13} style={{ color: v.tipo === 'IDA' ? '#3B82F6' : '#7C3AED', transform: v.tipo === 'IDA' ? undefined : 'rotate(180deg)', flexShrink: 0 }} />
                      <span className="text-xs font-semibold shrink-0" style={{ color: v.tipo === 'IDA' ? '#1D4ED8' : '#7C3AED' }}>
                        {tipoLabel} #{seq}
                      </span>
                      <span style={{ color: 'var(--tfd-text-secondary)' }}>{v.origem_cidade}</span>
                      <ArrowRight size={10} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
                      <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{v.destino_cidade}</span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--tfd-text-muted)', textDecoration: isTerminal ? 'line-through' : undefined }}>{fmtDate(v.data_embarque_prevista)}</span>
                      <span className="ml-auto text-xs font-medium shrink-0" style={{ color: 'var(--tfd-text-secondary)' }}>{situacaoViagemLabel[v.situacao] ?? v.situacao}</span>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyStep />}
          </SectionCard>

          {/* ── Ajuda de Custo ── */}
          <SectionCard icon={<DollarSign size={15} />} title={ajudas.length > 0 ? `Ajuda de Custo (${ajudas.length})` : 'Ajuda de Custo'}>
            {ajudas.length > 0 ? (
              <div className="space-y-2">
                {ajudas.map((ac: any) => (
                  <div key={ac.id} className="flex items-center gap-3 p-2.5 rounded-lg text-sm" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {ac.valor_diaria != null ? `${formatCurrency(ac.valor_diaria)} /dia` : '—'}
                    </span>
                    {ac.data_inicio && (
                      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{fmtDate(ac.data_inicio)} — {fmtDate(ac.data_fim)}</span>
                    )}
                    <span className="ml-auto text-xs font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>{ac.status}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyStep />}
          </SectionCard>

          {/* ── Permanência ── */}
          <SectionCard icon={<Home size={15} />} title="Permanência">
            {permanencia ? (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data comunicação</p>
                    <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{fmtDate(permanencia.data_comunicacao)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Retorno previsto</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{fmtDate(permanencia.nova_data_retorno_prevista)}</p>
                  </div>
                  {permanencia.motivo && (
                    <div className="col-span-2">
                      <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Motivo</p>
                      <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{permanencia.motivo.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>
                {(permanencia.prorrogacoes ?? []).length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tfd-text-muted)' }}>Prorrogações</p>
                    <div className="space-y-2">
                      {permanencia.prorrogacoes.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                          <span style={{ color: 'var(--tfd-text-secondary)' }}>+{p.dias_adicionais_solicitados} dias</span>
                          <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Novo retorno: {fmtDate(p.nova_data_retorno)}</span>
                          <span className="ml-auto text-xs font-medium" style={{
                            color: p.decisao === 'APROVADA' ? '#15803D' : p.decisao === 'REJEITADA' ? '#B91C1C' : '#92400E',
                          }}>
                            {p.decisao === 'APROVADA' ? 'Aprovada' : p.decisao === 'REJEITADA' ? 'Rejeitada' : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : <EmptyStep />}
          </SectionCard>

          {/* ── Encerramento ── */}
          <SectionCard
            icon={<CheckCircle2 size={15} />}
            title="Encerramento"
            badge={encerramento ? (
              <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                Encerrado
              </span>
            ) : undefined}
          >
            {encerramento ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {encerramento.motivo && (
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Motivo</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{motivoAltaLabels[encerramento.motivo] ?? encerramento.motivo.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {encerramento.data_encerramento && (
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data do encerramento</p>
                    <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{fmtDate(encerramento.data_encerramento)}</p>
                  </div>
                )}
                {encerramento.observacoes && (
                  <div className="col-span-2">
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Observações</p>
                    <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{encerramento.observacoes}</p>
                  </div>
                )}
              </div>
            ) : <EmptyStep />}
          </SectionCard>

        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------- */
/*  Reusable sub-components                            */
/* -------------------------------------------------- */

function EmptyStep() {
  return (
    <p className="text-xs py-1" style={{ color: 'var(--tfd-text-muted)' }}>
      Etapa pendente
    </p>
  );
}

function SectionCard({ icon, title, badge, children }: { icon: React.ReactNode; title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--tfd-surface-card)', border: '1px solid var(--tfd-surface-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--tfd-primary-500)' }}>{icon}</span>
        <h4 className="text-xs font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{title}</h4>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function InfoItem({ icon, label, value, mono, span2 }: { icon: React.ReactNode; label: string; value: string; mono?: boolean; span2?: boolean }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span style={{ color: 'var(--tfd-text-muted)' }}>{icon}</span>
        <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{label}</span>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)', fontFamily: mono ? 'var(--tfd-font-mono)' : undefined }}>
        {value || '—'}
      </p>
    </div>
  );
}
