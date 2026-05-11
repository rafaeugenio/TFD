'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  Loader2,
  XCircle,
  Pencil,
  Info,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { useReferrerBreadcrumb } from '@/shared/hooks/useReferrerBreadcrumb';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { buscarUnidadeSaude, listarSolicitacoesPorUnidade } from '@/services/unidades-saude.service';
import { formatDate } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function UnidadeSaudeDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const parentCrumb = useReferrerBreadcrumb({ label: 'Unidades de Saúde', href: '/unidades-saude' });

  const [unidade, setUnidade] = useState<Record<string, unknown> | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSol, setLoadingSol] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarUnidadeSaude(id);
      if (data) setUnidade(data as Record<string, unknown>);
      setLoading(false);

      setLoadingSol(true);
      const solResult = await listarSolicitacoesPorUnidade(id);
      if (solResult.data) {
        const seen = new Set<string>();
        const unique: Record<string, unknown>[] = [];
        for (const row of solResult.data as Record<string, unknown>[]) {
          const sol = row.solicitacoes as Record<string, unknown> | null;
          if (sol && !seen.has(sol.id as string)) {
            seen.add(sol.id as string);
            unique.push(sol);
          }
        }
        setSolicitacoes(unique);
      }
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

  if (!unidade) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <XCircle size={40} style={{ color: 'var(--tfd-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Unidade de saúde não encontrada</p>
        <Link href="/unidades-saude" className="tfd-btn tfd-btn-secondary tfd-btn--sm">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  const nome = unidade.nome as string;
  const cnes = unidade.cnes as string;
  const tipo = unidade.tipo as string;
  const responsavel = unidade.responsavel as string;
  const telefone = unidade.telefone as string;
  const email = unidade.email as string;
  const logradouro = unidade.logradouro as string;
  const numero = unidade.numero as string;
  const bairro = unidade.bairro as string;
  const municipio = unidade.municipio as string;
  const uf = (unidade.uf as string) || 'MA';
  const cep = unidade.cep as string;
  const regional = (unidade.tabelas_auxiliares as Record<string, unknown> | null)?.nome as string | undefined;

  const enderecoLinha = [
    logradouro && (numero ? `${logradouro}, ${numero}` : logradouro),
    bairro,
  ].filter(Boolean).join(' — ');
  const cidadeFull = municipio ? `${municipio} — ${uf}` : null;

  const totalSolicitacoes = solicitacoes.length;
  const emAndamento = solicitacoes.filter((s) => {
    const st = s.status as string;
    return !['CONCLUIDO', 'CANCELADO', 'ENCERRADO'].includes(st);
  }).length;
  const concluidas = solicitacoes.filter((s) => {
    const st = s.status as string;
    return st === 'CONCLUIDO' || st === 'ENCERRADO';
  }).length;

  return (
    <>
      <PageHeader
        title={nome}
        subtitle="Detalhes da unidade de saúde"
        breadcrumbs={[
          { label: parentCrumb.label, href: parentCrumb.href },
          { label: nome },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={() => router.push(`/unidades-saude?editar=${id}`)}
            >
              <Pencil size={16} />
              Editar Unidade
            </button>
            <Link href="/unidades-saude" className="tfd-btn tfd-btn-secondary">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ====== LEFT (2/3) ====== */}
        <div className="xl:col-span-2 space-y-4">
          {/* ── Identificação ── */}
          <Section title="Identificação" icon={<Info size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Nome" value={nome} />
              {cnes && <InfoRow label="CNES" value={cnes} mono />}
              {tipo && <InfoRow label="Tipo" value={tipo} />}
              {regional && <InfoRow label="Regional" value={regional} />}
              {responsavel && <InfoRow label="Responsável" value={responsavel} />}
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

          {/* ── Solicitações Vinculadas ── */}
          <Section
            title="Solicitações Vinculadas"
            icon={<FileText size={18} />}
            badge={
              !loadingSol ? (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  {solicitacoes.length}
                </span>
              ) : undefined
            }
          >
            {loadingSol ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando solicitações...</span>
              </div>
            ) : solicitacoes.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhuma solicitação vinculada a esta unidade
              </p>
            ) : (
              <div className="space-y-2">
                {solicitacoes.map((sol) => {
                  const status = sol.status as StatusSolicitacao;
                  const numProcesso = sol.numero_processo as string;
                  const dataCriacao = sol.created_at as string;
                  const cid = sol.cid10_principal as string;
                  const paciente = sol.pacientes as Record<string, unknown> | null;
                  const nomePaciente = paciente?.nome_completo as string | undefined;

                  return (
                    <Link
                      key={sol.id as string}
                      href={`/solicitacoes/${sol.id}?from=unidades-saude`}
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
                          <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>
                            {numProcesso}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                            {nomePaciente && (
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                                <User size={11} />
                                {nomePaciente}
                              </span>
                            )}
                            {cid && (
                              <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                                CID: {cid}
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

        {/* ====== RIGHT (1/3) ====== */}
        <div className="xl:col-span-1 space-y-4">
          <Section title="Contato" icon={<Phone size={18} />}>
            <div className="space-y-3">
              {telefone && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Telefone</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{telefone}</p>
                </div>
              )}
              {email && (
                <div>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                    <Mail size={11} /> E-mail
                  </p>
                  <p className="text-sm break-all" style={{ color: 'var(--tfd-text-primary)' }}>{email}</p>
                </div>
              )}
              {!telefone && !email && (
                <p className="text-sm text-center py-2" style={{ color: 'var(--tfd-text-muted)' }}>
                  Sem contatos cadastrados
                </p>
              )}
            </div>
          </Section>

          <Section title="Resumo" icon={<Building2 size={18} />}>
            <div className="space-y-3">
              {cnes && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>CNES</p>
                  <p className="text-sm font-mono" style={{ color: 'var(--tfd-text-primary)' }}>{cnes}</p>
                </div>
              )}
              {tipo && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Tipo</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{tipo}</p>
                </div>
              )}
              {cidadeFull && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Município</p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{cidadeFull}</p>
                </div>
              )}
            </div>
          </Section>

          <div className="grid grid-cols-1 gap-3">
            <KpiTile
              icon={<FileText size={18} />}
              label="Total de Solicitações"
              value={loadingSol ? '...' : String(totalSolicitacoes)}
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
/*  Helpers                                            */
/* -------------------------------------------------- */

function Section({
  title,
  icon,
  children,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="tfd-card">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--tfd-primary-500)' }}>{icon}</span>
        <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{title}</h2>
        {badge}
      </div>
      {children}
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
