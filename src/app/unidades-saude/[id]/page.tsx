'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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

import StatusTag from '@/shared/components/status-tag/StatusTag';
import { buscarUnidadeSaude, listarSolicitacoesPorUnidade } from '@/services/unidades-saude.service';
import { formatDate } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Tabs                                              */
/* -------------------------------------------------- */

type TabKey = 'identificacao' | 'endereco' | 'solicitacoes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'identificacao', label: 'Identificação' },
  { key: 'endereco',      label: 'Endereço' },
  { key: 'solicitacoes',  label: 'Solicitações' },
];

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function UnidadeSaudeDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <UnidadeSaudeDetalheInner id={id} />
    </Suspense>
  );
}

function UnidadeSaudeDetalheInner({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = tabParam && TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'identificacao';

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'identificacao') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

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
      <div className="text-center py-20">
        <XCircle size={40} className="inline-block mb-3" style={{ color: '#94A3B8' }} />
        <p className="text-[14px]" style={{ color: '#6B7280' }}>Unidade de saúde não encontrada.</p>
        <Link href="/unidades-saude" className="tfd-btn tfd-btn-ghost mt-4 inline-flex">
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
    <div>
      <Link
        href="/unidades-saude"
        className="inline-flex items-center gap-1 text-[12px] mb-3 transition-colors hover:text-[#1A1D2B]"
        style={{ color: '#6B7280' }}
      >
        <ArrowLeft size={12} /> Voltar para Unidades de Saúde
      </Link>

      {/* ============ Header card ============ */}
      <div
        className="mb-6 overflow-hidden"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        {/* Linha 1 — Nome + CNES + Editar */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-[20px] font-semibold"
                style={{ color: '#146BFA', letterSpacing: '-0.02em' }}
              >
                {nome}
              </h1>
              {cnes && (
                <span className="text-[13px] font-mono" style={{ color: '#94A3B8' }} title="CNES">
                  CNES {cnes}
                </span>
              )}
            </div>
          </div>
          <button
            className="tfd-btn tfd-btn-primary shrink-0"
            onClick={() => router.push(`/unidades-saude?editar=${id}`)}
          >
            <Pencil size={14} /> Editar
          </button>
        </div>

        {/* Linha 2 — metadados */}
        <div className="px-6 pb-3 text-[14px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            {tipo && (
              <span className="inline-flex items-center px-2 py-[2px] text-[12px] font-medium" style={{ background: 'var(--tfd-primary-50)', borderRadius: 999, color: 'var(--tfd-primary-500)' }}>
                {tipo}
              </span>
            )}
            {regional && (
              <>
                <span><span style={{ color: '#94A3B8' }}>Regional </span>{regional}</span>
                <Sep />
              </>
            )}
            {responsavel && (
              <span><span style={{ color: '#94A3B8' }}>Responsável </span>{responsavel}</span>
            )}
          </div>
        </div>

        {/* Linha 3 — Contato | Endereço */}
        <div className="header-groups px-6 pb-5 text-[13px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
            {telefone && (
              <a href={`tel:${telefone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA]" title="Ligar">
                <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                <span className="font-mono">{telefone}</span>
              </a>
            )}
            {email && (
              <>
                {telefone && <Sep />}
                <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA] truncate max-w-[260px]" title={email}>
                  <Mail size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="truncate">{email}</span>
                </a>
              </>
            )}
            {!telefone && !email && (
              <span style={{ color: '#94A3B8' }}>Sem contatos</span>
            )}
          </div>

          <span aria-hidden className="header-groups-divider" />

          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
            {cidadeFull && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                <span>{cidadeFull}</span>
              </span>
            )}
            {enderecoLinha && (
              <>
                {cidadeFull && <Sep />}
                <span className="truncate max-w-[360px]">{enderecoLinha}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiTile icon={<FileText size={18} />} label="Total de Solicitações" value={loadingSol ? '...' : String(totalSolicitacoes)} tone="primary" />
        <KpiTile icon={<Activity size={18} />} label="Em Andamento" value={loadingSol ? '...' : String(emAndamento)} tone="warning" />
        <KpiTile icon={<CheckCircle2 size={18} />} label="Concluídas" value={loadingSol ? '...' : String(concluidas)} tone="success" />
      </div>

      {/* ============ Tabs ============ */}
      <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid #E2E8F0' }}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative px-4 py-3 text-[14px] font-medium transition-colors"
              style={{ color: active ? '#146BFA' : '#64748B', background: 'transparent' }}
            >
              {t.label}
              {active && <span className="absolute left-2 right-2 -bottom-px h-[2px]" style={{ background: '#146BFA' }} />}
            </button>
          );
        })}
      </div>

      {/* ============ Tab content ============ */}
      <div className="animate-fade-in">
        {activeTab === 'identificacao' && (
          <Section title="Identificação" icon={<Info size={18} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Nome" value={nome} />
              {cnes && <InfoRow label="CNES" value={cnes} mono />}
              {tipo && <InfoRow label="Tipo" value={tipo} />}
              {regional && <InfoRow label="Regional" value={regional} />}
              {responsavel && <InfoRow label="Responsável" value={responsavel} />}
              {telefone && <InfoRow label="Telefone" value={telefone} />}
              {email && <InfoRow label="E-mail" value={email} />}
            </div>
          </Section>
        )}

        {activeTab === 'endereco' && (
          <Section title="Endereço" icon={<MapPin size={18} />}>
            {(logradouro || municipio) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {enderecoLinha && <InfoRow label="Logradouro" value={enderecoLinha} />}
                {cidadeFull && <InfoRow label="Município / UF" value={cidadeFull} />}
                {cep && <InfoRow label="CEP" value={cep} mono />}
              </div>
            ) : (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Endereço não cadastrado.
              </p>
            )}
          </Section>
        )}

        {activeTab === 'solicitacoes' && (
          <Section
            title="Solicitações Vinculadas"
            icon={<FileText size={18} />}
            badge={
              !loadingSol ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
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
                Nenhuma solicitação vinculada a esta unidade.
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
                      style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-card)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)'; e.currentTarget.style.borderColor = 'var(--tfd-primary-200)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)'; e.currentTarget.style.borderColor = 'var(--tfd-surface-border)'; }}
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
                            {cid && <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>CID: {cid}</span>}
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-text-muted)' }}>
                              <Clock size={11} />
                              {formatDate(dataCriacao)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusTag status={status} />
                          <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--tfd-primary-500)' }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 180ms ease-out; }
        .header-groups { display: flex; flex-direction: column; gap: 6px; }
        .header-groups-divider { display: none; }
        @media (min-width: 1100px) {
          .header-groups { flex-direction: row; align-items: center; gap: 16px; flex-wrap: wrap; }
          .header-groups-divider { display: inline-block; width: 1px; height: 16px; background: #E2E8F0; flex-shrink: 0; }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Helpers visuais                                    */
/* -------------------------------------------------- */

function Sep() {
  return <span aria-hidden style={{ color: '#CBD5E1' }}>·</span>;
}

function Section({
  title, icon, children, badge,
}: { title: string; icon: React.ReactNode; children: React.ReactNode; badge?: React.ReactNode; }) {
  return (
    <div className="tfd-card tfd-card--flat">
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
      <span className="text-sm font-medium shrink-0 w-40" style={{ color: 'var(--tfd-text-secondary)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--tfd-text-primary)', fontFamily: mono ? 'var(--tfd-font-mono)' : undefined }}>
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
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone: 'primary' | 'warning' | 'success'; }) {
  const c = KPI_TONES[tone];
  return (
    <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: c.bg, border: '1px solid var(--tfd-surface-border)' }}>
      <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: c.iconBg, color: c.fg }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight" style={{ color: c.fg }}>{value}</p>
        <p className="text-xs" style={{ color: c.fg, opacity: 0.8 }}>{label}</p>
      </div>
    </div>
  );
}
