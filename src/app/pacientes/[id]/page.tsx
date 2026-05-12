'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  FileText,
  Clock,
  ExternalLink,
  XCircle,
  Pencil,
  Users,
  Phone,
  Mail,
} from 'lucide-react';

import StatusTag from '@/shared/components/status-tag/StatusTag';
import { DetailPageSkeleton, CardListSkeleton } from '@/shared/components/skeleton';
import { buscarPaciente, historicoProcessos } from '@/services/pacientes.service';
import { listarPorPaciente } from '@/services/acompanhantes.service';
import { formatCPF, formatCNS, formatDate } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Tabs                                              */
/* -------------------------------------------------- */

type TabKey = 'endereco' | 'acompanhantes' | 'historico';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'endereco',      label: 'Endereço' },
  { key: 'acompanhantes', label: 'Acompanhantes' },
  { key: 'historico',     label: 'Histórico de Solicitações' },
];

const DEFAULT_TAB: TabKey = 'endereco';

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

export default function PacienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <PacienteDetalheInner id={id} />
    </Suspense>
  );
}

function PacienteDetalheInner({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = tabParam && TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : DEFAULT_TAB;

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_TAB) params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

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
    return <DetailPageSkeleton tabs={TABS.length} />;
  }

  if (!paciente) {
    return (
      <div className="text-center py-20">
        <XCircle size={40} className="inline-block mb-3" style={{ color: '#94A3B8' }} />
        <p className="text-[14px]" style={{ color: '#6B7280' }}>Paciente não encontrado.</p>
        <Link href="/pacientes" className="tfd-btn tfd-btn-ghost mt-4 inline-flex">
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

  const sexoLabel = sexo === 'MASCULINO' ? 'Masculino' : sexo === 'FEMININO' ? 'Feminino' : sexo;

  return (
    <div>
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-1 text-[12px] mb-3 transition-colors hover:text-[#1A1D2B]"
        style={{ color: '#6B7280' }}
      >
        <ArrowLeft size={12} /> Voltar para Pacientes
      </Link>

      {/* ============ Header card (estilo fluxo-v2) ============ */}
      <div
        className="mb-6 overflow-hidden"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        {/* Linha 1 — Nome + idade + CPF + Editar */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-[20px] font-semibold"
                style={{ color: '#146BFA', letterSpacing: '-0.02em' }}
              >
                {nome}
              </h1>
              {idade !== null && (
                <span className="text-[14px]" style={{ color: '#64748B' }}>{idade} anos</span>
              )}
              <span className="text-[13px] font-mono" style={{ color: '#94A3B8' }}>
                {cpf ? formatCPF(cpf) : '—'}
              </span>
            </div>
          </div>
          <button
            className="tfd-btn tfd-btn-primary shrink-0"
            onClick={() => router.push(`/pacientes?editar=${id}`)}
          >
            <Pencil size={14} /> Editar
          </button>
        </div>

        {/* Linha 2 — metadados secundários */}
        <div className="px-6 pb-3 text-[14px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            {cns && (
              <>
                <span><span style={{ color: '#94A3B8' }}>CNS </span><span className="font-mono" style={{ color: '#1E293B', fontWeight: 500 }}>{formatCNS(cns)}</span></span>
                <Sep />
              </>
            )}
            {sexoLabel && (
              <>
                <span><span style={{ color: '#94A3B8' }}>Sexo </span>{sexoLabel}</span>
                <Sep />
              </>
            )}
            {dataNascimento && (
              <span><span style={{ color: '#94A3B8' }}>Nasc. </span>{formatDate(dataNascimento)}</span>
            )}
          </div>
        </div>

        {/* Linha 3 — Contato | Endereço */}
        <div className="header-groups px-6 pb-5 text-[13px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
            {telefone && (
              <a
                href={`tel:${telefone.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA]"
                title="Ligar"
              >
                <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                <span className="font-mono">{telefone}</span>
              </a>
            )}
            {email && (
              <>
                {telefone && <Sep />}
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA] truncate max-w-[260px]"
                  title={email}
                >
                  <Mail size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="truncate">{email}</span>
                </a>
              </>
            )}
            {telefoneFixo && (
              <>
                {(telefone || email) && <Sep />}
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="font-mono">{telefoneFixo}</span>
                </span>
              </>
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
      <KpiBar
        items={[
          { label: 'Total de Solicitações', value: loadingSol ? '...' : String(totalSol) },
          { label: 'Em Andamento',          value: loadingSol ? '...' : String(emAndamento) },
          { label: 'Concluídas',            value: loadingSol ? '...' : String(concluidas) },
        ]}
      />

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

        {activeTab === 'acompanhantes' && (
          <Section
            title="Acompanhantes"
            icon={<Users size={18} />}
            badge={
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                {acompanhantes.length}
              </span>
            }
          >
            {acompanhantes.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhum acompanhante cadastrado.
              </p>
            ) : (
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
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>
                          {VINCULO_LABELS[(ac.vinculo as string)] || (ac.vinculo as string).replace(/_/g, ' ')}
                        </span>
                      )}
                      {(ac.necessidade_especial as boolean) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
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
            )}
          </Section>
        )}

        {activeTab === 'historico' && (
          <Section
            title="Histórico de Solicitações"
            icon={<FileText size={18} />}
            badge={
              !loadingSol ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
                  {solicitacoes.length} ciclo{solicitacoes.length !== 1 ? 's' : ''}
                </span>
              ) : undefined
            }
          >
            {loadingSol ? (
              <CardListSkeleton rows={3} />
            ) : solicitacoes.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhuma solicitação registrada para este paciente.
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
                      style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-card)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)'; e.currentTarget.style.borderColor = 'var(--tfd-primary-200)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)'; e.currentTarget.style.borderColor = 'var(--tfd-surface-border)'; }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}>
                              Ciclo {ciclo}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>
                              {numProcesso}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                            {cid && <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>CID: {cid}</span>}
                            {especialidade && <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{especialidade}</span>}
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

function KpiBar({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div
      className="mb-6 overflow-hidden"
      style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 0 rgba(15,23,42,0.02)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 kpi-bar">
        {items.map((it, i) => (
          <div key={i} className="px-5 py-4 kpi-cell">
            <p className="text-[11px] font-medium uppercase" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>
              {it.label}
            </p>
            <p className="text-[22px] font-semibold leading-tight mt-1" style={{ color: '#0F172A' }}>
              {it.value}
            </p>
            {it.sub && (
              <p className="text-[12px] mt-1" style={{ color: '#94A3B8' }}>{it.sub}</p>
            )}
          </div>
        ))}
      </div>
      <style jsx>{`
        @media (min-width: 640px) {
          .kpi-cell + .kpi-cell { border-left: 1px solid #F1F5F9; }
        }
      `}</style>
    </div>
  );
}
