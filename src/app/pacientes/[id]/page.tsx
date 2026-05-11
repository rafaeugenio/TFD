'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  MapPin,
  FileText,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
  Pencil,
  Activity,
  CheckCircle2,
  Users,
  IdCard,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { useReferrerBreadcrumb } from '@/shared/hooks/useReferrerBreadcrumb';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { buscarPaciente, historicoProcessos } from '@/services/pacientes.service';
import { listarPorPaciente } from '@/services/acompanhantes.service';
import { formatCPF, formatCNS, formatDate } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Helpers                                           */
/* -------------------------------------------------- */

function calcIdade(dataNasc: string): number {
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

const VINCULO_LABELS: Record<string, string> = {
  CONJUGE: 'Cônjuge',
  FILHO: 'Filho(a)',
  PAI_MAE: 'Pai/Mãe',
  RESPONSAVEL_LEGAL: 'Responsável Legal',
  IRMAO: 'Irmão(ã)',
  OUTRO: 'Outro',
};

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PacienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const parentCrumb = useReferrerBreadcrumb({ label: 'Pacientes', href: '/pacientes' });

  const [paciente, setPaciente] = useState<Record<string, unknown> | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Record<string, unknown>[]>([]);
  const [acompanhantes, setAcompanhantes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSol, setLoadingSol] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarPaciente(id);
      if (data) setPaciente(data as Record<string, unknown>);
      setLoading(false);

      setLoadingSol(true);
      const [solResult, acompResult] = await Promise.all([
        historicoProcessos(id),
        listarPorPaciente(id),
      ]);
      if (solResult.data) setSolicitacoes(solResult.data as Record<string, unknown>[]);
      if (acompResult.data) setAcompanhantes(acompResult.data as Record<string, unknown>[]);
      setLoadingSol(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</span>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <XCircle size={40} style={{ color: 'var(--tfd-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Paciente não encontrado</p>
        <Link href="/pacientes" className="tfd-btn tfd-btn-secondary tfd-btn--sm">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  const nome = paciente.nome_completo as string;
  const cpf = paciente.cpf as string;
  const cns = paciente.cns as string;
  const sexo = paciente.sexo as string;
  const dataNascimento = paciente.data_nascimento as string;
  const telefone = paciente.telefone_celular as string;
  const telefoneFixo = paciente.telefone_fixo as string;
  const email = paciente.email as string;
  const municipio = paciente.municipio as string;
  const uf = (paciente.uf as string) || 'MA';
  const logradouro = paciente.logradouro as string;
  const numero = paciente.numero as string;
  const bairro = paciente.bairro as string;
  const cep = paciente.cep as string;
  const idade = dataNascimento ? calcIdade(dataNascimento) : null;

  const enderecoLinha = [
    logradouro && (numero ? `${logradouro}, ${numero}` : logradouro),
    bairro,
  ].filter(Boolean).join(' — ');
  const cidadeFull = municipio ? `${municipio} — ${uf}` : null;

  const totalSol = solicitacoes.length;
  const emAndamento = solicitacoes.filter((s) => {
    const st = s.status as string;
    return st && !['CONCLUIDO', 'CANCELADO', 'ENCERRADO'].includes(st);
  }).length;
  const concluidas = solicitacoes.filter((s) => {
    const st = s.status as string;
    return st === 'CONCLUIDO' || st === 'ENCERRADO';
  }).length;

  return (
    <>
      <PageHeader
        title={nome}
        subtitle="Detalhes do paciente"
        breadcrumbs={[
          { label: parentCrumb.label, href: parentCrumb.href },
          { label: nome },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={() => router.push(`/pacientes?editar=${id}`)}
            >
              <Pencil size={16} />
              Editar Paciente
            </button>
            <Link href="/pacientes" className="tfd-btn tfd-btn-secondary">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ====== LEFT (2/3) — Sections ====== */}
        <div className="xl:col-span-2 space-y-4">
          {/* ── Dados Pessoais ── */}
          <Section title="Dados Pessoais" icon={<User size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Nome completo" value={nome} />
              <InfoRow label="CPF" value={cpf ? formatCPF(cpf) : '—'} mono />
              {cns && <InfoRow label="CNS" value={formatCNS(cns)} mono />}
              {dataNascimento && (
                <InfoRow
                  label="Nascimento"
                  value={`${formatDate(dataNascimento)}${idade !== null ? ` (${idade} anos)` : ''}`}
                />
              )}
              <InfoRow
                label="Sexo"
                value={sexo === 'MASCULINO' ? 'Masculino' : sexo === 'FEMININO' ? 'Feminino' : sexo || '—'}
              />
              {telefone && <InfoRow label="Celular" value={telefone} />}
              {telefoneFixo && <InfoRow label="Telefone fixo" value={telefoneFixo} />}
              {email && <InfoRow label="E-mail" value={email} />}
            </div>
          </Section>

          {/* ── Endereço ── */}
          {(logradouro || municipio) && (
            <Section title="Endereço" icon={<MapPin size={18} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {enderecoLinha && <InfoRow label="Logradouro" value={enderecoLinha} />}
                {cidadeFull && <InfoRow label="Município / UF" value={cidadeFull} />}
                {cep && <InfoRow label="CEP" value={cep} mono />}
              </div>
            </Section>
          )}

          {/* ── Acompanhantes ── */}
          <Section
            title="Acompanhantes"
            icon={<Users size={18} />}
            badge={
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
              >
                {acompanhantes.length}
              </span>
            }
            empty={acompanhantes.length === 0}
          >
            <div className="space-y-2">
              {acompanhantes.map((ac) => (
                <div
                  key={ac.id as string}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {ac.nome_completo as string}
                    </p>
                    {(ac.vinculo as string | null) && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}
                      >
                        {VINCULO_LABELS[(ac.vinculo as string)] || (ac.vinculo as string).replace(/_/g, ' ')}
                      </span>
                    )}
                    {(ac.necessidade_especial as boolean) && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                      >
                        Necessidade especial
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                      CPF: {formatCPF((ac.cpf as string) || '')}
                    </span>
                    {(ac.telefone as string | null) && (
                      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                        Tel: {ac.telefone as string}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Histórico de Solicitações ── */}
          <Section
            title="Histórico de Solicitações"
            icon={<FileText size={18} />}
            badge={
              !loadingSol ? (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  {solicitacoes.length} ciclo{solicitacoes.length !== 1 ? 's' : ''}
                </span>
              ) : undefined
            }
          >
            {loadingSol ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</span>
              </div>
            ) : solicitacoes.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhuma solicitação registrada para este paciente
              </p>
            ) : (
              <div className="space-y-2">
                {solicitacoes.map((sol, idx) => {
                  const status = sol.status as StatusSolicitacao;
                  const numProcesso = sol.numero_processo as string;
                  const dataCriacao = sol.created_at as string;
                  const cid = sol.cid10_principal as string;
                  const especialidade = sol.especialidade as string;
                  const modalidade = sol.modalidade as string;
                  const ciclo = solicitacoes.length - idx;

                  return (
                    <Link
                      key={sol.id as string}
                      href={`/solicitacoes/${sol.id}?from=pacientes`}
                      className="block rounded-lg p-3 transition-colors duration-150 group"
                      style={{
                        border: '1px solid var(--tfd-surface-border)',
                        backgroundColor: 'var(--tfd-surface-card)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--tfd-primary-200)';
                        e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--tfd-surface-border)';
                        e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)';
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}
                            >
                              Ciclo {ciclo}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>
                              {numProcesso}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                            {cid && (
                              <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                                CID: {cid}
                              </span>
                            )}
                            {especialidade && (
                              <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                                {especialidade}
                              </span>
                            )}
                            {modalidade && (
                              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                                {modalidade === 'INTERESTADUAL' ? 'Interestadual' : 'Intraestadual'}
                              </span>
                            )}
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                              <Clock size={11} />
                              {formatDate(dataCriacao)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusTag status={status} />
                          <ExternalLink
                            size={14}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--tfd-primary-500)' }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* ====== RIGHT (1/3) — Sidebar ====== */}
        <div className="xl:col-span-1 space-y-4">
          {/* Identificação resumida */}
          <Section title="Identificação" icon={<IdCard size={18} />}>
            <div className="space-y-3">
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Nome</p>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{nome}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>CPF</p>
                <p className="text-sm font-mono" style={{ color: 'var(--tfd-text-primary)' }}>
                  {cpf ? formatCPF(cpf) : '—'}
                </p>
              </div>
              {cidadeFull && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Município</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{cidadeFull}</p>
                </div>
              )}
            </div>
          </Section>

          {/* KPIs */}
          <div className="grid grid-cols-1 gap-3">
            <KpiTile
              icon={<FileText size={18} />}
              label="Total de Solicitações"
              value={loadingSol ? '...' : String(totalSol)}
              tone="primary"
            />
            <KpiTile
              icon={<Activity size={18} />}
              label="Em Andamento"
              value={loadingSol ? '...' : String(emAndamento)}
              tone="warning"
            />
            <KpiTile
              icon={<CheckCircle2 size={18} />}
              label="Concluídas"
              value={loadingSol ? '...' : String(concluidas)}
              tone="success"
            />
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------- */
/*  Section / InfoRow / KpiTile                       */
/* -------------------------------------------------- */

function Section({
  title,
  icon,
  children,
  badge,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="tfd-card">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--tfd-primary-500)' }}>{icon}</span>
        <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{title}</h2>
        {badge}
      </div>
      {empty ? (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
          Nenhum registro
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
      <span className="text-sm font-medium shrink-0 w-40" style={{ color: 'var(--tfd-text-secondary)' }}>
        {label}
      </span>
      <span
        className="text-sm"
        style={{
          color: 'var(--tfd-text-primary)',
          fontFamily: mono ? 'var(--tfd-font-mono)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const KPI_TONES: Record<string, { bg: string; fg: string; iconBg: string }> = {
  primary: { bg: 'var(--tfd-primary-50)', fg: 'var(--tfd-primary-500)', iconBg: 'var(--tfd-primary-100)' },
  warning: { bg: '#FFFBEB', fg: '#D97706', iconBg: '#FEF3C7' },
  success: { bg: '#ECFDF5', fg: '#059669', iconBg: '#D1FAE5' },
};

function KpiTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'warning' | 'success';
}) {
  const c = KPI_TONES[tone];
  return (
    <div
      className="rounded-lg p-3 flex items-center gap-3"
      style={{ backgroundColor: c.bg, border: '1px solid var(--tfd-surface-border)' }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{ backgroundColor: c.iconBg, color: c.fg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight" style={{ color: c.fg }}>{value}</p>
        <p className="text-xs" style={{ color: c.fg, opacity: 0.8 }}>{label}</p>
      </div>
    </div>
  );
}
