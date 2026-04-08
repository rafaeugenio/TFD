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
  Globe,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
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
        // Deduplicate by solicitacao_id and extract the nested solicitacao
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

  const enderecoCompleto = [
    logradouro && (numero ? `${logradouro}, ${numero}` : logradouro),
    bairro,
  ].filter(Boolean).join(' — ');

  const cidadeFull = municipio ? `${municipio} — ${uf}` : null;

  const tipoSubtitle = [tipo, cnes && `CNES ${cnes}`].filter(Boolean).join(' · ');

  /* Summary counts */
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          icon={<FileText size={20} />}
          label="Total de Solicitações"
          value={loadingSol ? '...' : String(totalSolicitacoes)}
          color="primary"
        />
        <SummaryCard
          icon={<Activity size={20} />}
          label="Em Andamento"
          value={loadingSol ? '...' : String(emAndamento)}
          color="warning"
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="Concluídas"
          value={loadingSol ? '...' : String(concluidas)}
          color="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== Coluna Esquerda: Dados da Unidade ========== */}
        <div className="lg:col-span-1 space-y-6">
          <div className="tfd-card">
            {/* Avatar + Nome */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full text-white shrink-0"
                style={{ backgroundColor: 'var(--tfd-primary-500)' }}
              >
                <Building2 size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                  {nome}
                </h2>
                {tipoSubtitle && (
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                    {tipoSubtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Dados da unidade */}
            <div className="space-y-3">
              {regional && <InfoRow icon={<Globe size={14} />} label="Regional" value={regional} />}
              {responsavel && <InfoRow icon={<User size={14} />} label="Responsável" value={responsavel} />}
              {telefone && <InfoRow icon={<Phone size={14} />} label="Telefone" value={telefone} />}
              {email && <InfoRow icon={<Mail size={14} />} label="E-mail" value={email} />}
            </div>

            {/* Separador + Endereço */}
            {(logradouro || municipio) && (
              <>
                <hr className="tfd-divider my-4" />
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wide" style={{ color: 'var(--tfd-text-muted)' }}>
                  <MapPin size={12} />
                  Endereço
                </h3>
                <div className="space-y-1">
                  {enderecoCompleto && (
                    <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {enderecoCompleto}
                    </p>
                  )}
                  {cidadeFull && (
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {cidadeFull}
                    </p>
                  )}
                  {cep && (
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                      CEP: {cep}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========== Coluna Direita: Solicitações Vinculadas ========== */}
        <div className="lg:col-span-2">
          <div className="tfd-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
                <FileText size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                Solicitações Vinculadas
                {!loadingSol && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                  >
                    {solicitacoes.length}
                  </span>
                )}
              </h3>
            </div>

            {loadingSol ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                <span className="ml-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando solicitações...</span>
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  Nenhuma solicitação vinculada a esta unidade
                </p>
              </div>
            ) : (
              <div className="space-y-3">
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
                      href={`/solicitacoes/${sol.id}`}
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

const SUMMARY_COLORS: Record<string, { bg: string; fg: string; iconBg: string }> = {
  primary: {
    bg: 'var(--tfd-primary-50)',
    fg: 'var(--tfd-primary-500)',
    iconBg: 'var(--tfd-primary-100)',
  },
  warning: {
    bg: '#FFFBEB',
    fg: '#D97706',
    iconBg: '#FEF3C7',
  },
  success: {
    bg: '#ECFDF5',
    fg: '#059669',
    iconBg: '#D1FAE5',
  },
};

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'warning' | 'success';
}) {
  const c = SUMMARY_COLORS[color];
  return (
    <div
      className="tfd-card flex items-center gap-4"
      style={{ backgroundColor: c.bg }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: c.iconBg, color: c.fg }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: c.fg }}>
          {value}
        </p>
        <p className="text-xs" style={{ color: c.fg, opacity: 0.8 }}>
          {label}
        </p>
      </div>
    </div>
  );
}
