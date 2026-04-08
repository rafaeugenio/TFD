'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XOctagon,
  Clock,
  CreditCard,
  User,
  ExternalLink,
  Loader2,
  XCircle,
  Pencil,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { buscarMedico } from '@/services/medicos.service';
import { createClient } from '@/lib/supabase/client';
import { formatCPF, formatDate } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Helpers                                           */
/* -------------------------------------------------- */

async function listarSolicitacoesPorMedico(medicoId: string) {
  return createClient()
    .from('pareceres')
    .select('solicitacao_id, decisao, solicitacoes(*, pacientes(nome_completo))')
    .eq('medico_id', medicoId)
    .order('created_at', { ascending: false });
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function MedicoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [medico, setMedico] = useState<Record<string, unknown> | null>(null);
  const [pareceres, setPareceres] = useState<Record<string, unknown>[]>([]);
  const [decisoes, setDecisoes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSol, setLoadingSol] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarMedico(id);
      if (data) setMedico(data as Record<string, unknown>);
      setLoading(false);

      setLoadingSol(true);
      const { data: parecerData } = await listarSolicitacoesPorMedico(id);
      if (parecerData) {
        setPareceres(parecerData as Record<string, unknown>[]);
        const map: Record<string, string> = {};
        for (const p of parecerData as Record<string, unknown>[]) {
          const solId = p.solicitacao_id as string;
          const dec = p.decisao as string;
          if (solId && dec) map[solId] = dec;
        }
        setDecisoes(map);
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

  if (!medico) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <XCircle size={40} style={{ color: 'var(--tfd-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Medico nao encontrado</p>
        <Link href="/medicos" className="tfd-btn tfd-btn-secondary tfd-btn--sm">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  const nome = medico.nome_completo as string;
  const crm = medico.crm as string;
  const crmUf = (medico.crm_uf as string) || '';
  const cpf = medico.cpf as string;
  const especialidade = medico.especialidade as string;

  const totalSolicitacoes = Object.keys(decisoes).length;
  const totalDeferidos = Object.values(decisoes).filter((d) => d === 'DEFERIDO').length;
  const totalIndeferidos = Object.values(decisoes).filter((d) => d === 'INDEFERIDO').length;

  return (
    <>
      <PageHeader
        title={nome}
        subtitle="Detalhes do medico"
        actions={
          <div className="flex items-center gap-2">
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={() => router.push(`/medicos?editar=${id}`)}
            >
              <Pencil size={16} />
              Editar Medico
            </button>
            <Link href="/medicos" className="tfd-btn tfd-btn-secondary">
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          icon={<FileText size={20} />}
          label="Total de Solicitacoes"
          value={totalSolicitacoes}
          variant="primary"
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="Pareceres Favoraveis"
          value={totalDeferidos}
          variant="success"
        />
        <SummaryCard
          icon={<XOctagon size={20} />}
          label="Pareceres Desfavoraveis"
          value={totalIndeferidos}
          variant="error"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== Left Column: Doctor Data ========== */}
        <div className="lg:col-span-1 space-y-6">
          <div className="tfd-card">
            {/* Avatar + Name */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: 'var(--tfd-primary-500)' }}
              >
                {nome.split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                  {nome}
                </h2>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  CRM {crm}{crmUf ? `/${crmUf}` : ''}
                </p>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3">
              <InfoRow icon={<User size={14} />} label="CRM" value={`${crm}${crmUf ? `/${crmUf}` : ''}`} />
              {cpf && <InfoRow icon={<CreditCard size={14} />} label="CPF" value={formatCPF(cpf)} />}
              {especialidade && <InfoRow icon={<FileText size={14} />} label="Especialidade" value={especialidade} />}
            </div>
          </div>
        </div>

        {/* ========== Right Column: Solicitacoes com Parecer ========== */}
        <div className="lg:col-span-2">
          <div className="tfd-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
                <FileText size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                Solicitacoes com Parecer
                {!loadingSol && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                  >
                    {pareceres.length}
                  </span>
                )}
              </h3>
            </div>

            {loadingSol ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando solicitacoes...</span>
              </div>
            ) : pareceres.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-muted)' }}>
                  Nenhuma solicitacao vinculada a este medico
                </p>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  Solicitacoes aparecerao aqui quando pareceres forem vinculados a este medico.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pareceres.map((parecer) => {
                  const sol = parecer.solicitacoes as Record<string, unknown> | null;
                  if (!sol) return null;

                  const solId = parecer.solicitacao_id as string;
                  const status = sol.status as StatusSolicitacao;
                  const numProcesso = sol.numero_processo as string;
                  const dataCriacao = sol.created_at as string;
                  const cid = sol.cid10_principal as string;
                  const paciente = sol.pacientes as Record<string, unknown> | null;
                  const nomePaciente = paciente?.nome_completo as string;

                  return (
                    <Link
                      key={solId}
                      href={`/solicitacoes/${solId}`}
                      className="block rounded-lg p-4 transition-all duration-150 group"
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
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>
                              {numProcesso}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
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
          </div>
        </div>
      </div>
    </>
  );
}

/* ── InfoRow helper ── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--tfd-text-muted)' }}>{icon}</span>
      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{label}:</span>
      <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{value}</span>
    </div>
  );
}

/* ── SummaryCard helper ── */

const VARIANT_STYLES = {
  primary: {
    bg: 'var(--tfd-primary-50)',
    iconColor: 'var(--tfd-primary-500)',
    valueColor: 'var(--tfd-primary-700)',
  },
  success: {
    bg: 'var(--tfd-success-50, #F0FDF4)',
    iconColor: 'var(--tfd-success-500, #22C55E)',
    valueColor: 'var(--tfd-success-700, #15803D)',
  },
  error: {
    bg: 'var(--tfd-error-50, #FEF2F2)',
    iconColor: 'var(--tfd-error-500, #EF4444)',
    valueColor: 'var(--tfd-error-700, #B91C1C)',
  },
};

function SummaryCard({
  icon,
  label,
  value,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant: 'primary' | 'success' | 'error';
}) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div
      className="tfd-card flex items-center gap-3"
      style={{ backgroundColor: styles.bg }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ color: styles.iconColor }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: styles.valueColor }}>
          {value}
        </p>
        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
          {label}
        </p>
      </div>
    </div>
  );
}
