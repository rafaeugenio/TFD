'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  User,
  ExternalLink,
  XCircle,
  Pencil,
} from 'lucide-react';
import { DetailPageSkeleton, CardListSkeleton } from '@/shared/components/skeleton';

import StatusTag from '@/shared/components/status-tag/StatusTag';
import {
  buscarUnidadeSaude,
  listarSolicitacoesPorUnidade,
  VINCULO_SOLICITACAO_UNIDADE_LABEL,
  type SolicitacaoVinculadaUnidade,
  type VinculoSolicitacaoUnidade,
} from '@/services/unidades-saude.service';
import UnidadeDrawer from '../_UnidadeDrawer';
import { formatDate } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

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

  const [unidade, setUnidade] = useState<Record<string, unknown> | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoVinculadaUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSol, setLoadingSol] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await buscarUnidadeSaude(id);
      if (data) setUnidade(data as Record<string, unknown>);
      setLoading(false);

      setLoadingSol(true);
      const solResult = await listarSolicitacoesPorUnidade(id);
      if (solResult.data) setSolicitacoes(solResult.data);
      setLoadingSol(false);
    }
    load();
  }, [id, reloadFlag]);

  if (loading) {
    return <DetailPageSkeleton tabs={0} />;
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
  const emAndamento = solicitacoes.filter(({ solicitacao: s }) => {
    const st = s.status as string;
    return !['CONCLUIDO', 'CANCELADO', 'ENCERRADO'].includes(st);
  }).length;
  const concluidas = solicitacoes.filter(({ solicitacao: s }) => {
    const st = s.status as string;
    return st === 'CONCLUIDO' || st === 'ENCERRADO';
  }).length;
  const totalOrigemLaudo = solicitacoes.filter((v) => v.vinculos.includes('origem_laudo')).length;
  const totalDestinoAgendamento = solicitacoes.filter((v) => v.vinculos.includes('destino_agendamento')).length;

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
            onClick={() => setEditOpen(true)}
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
            {cep && (
              <>
                {(cidadeFull || enderecoLinha) && <Sep />}
                <span className="font-mono"><span style={{ color: '#94A3B8' }}>CEP </span>{cep}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============ KPIs ============ */}
      <KpiBar
        items={[
          { label: 'Total de Solicitações', value: loadingSol ? '...' : String(totalSolicitacoes) },
          { label: 'Origem do Laudo',       value: loadingSol ? '...' : String(totalOrigemLaudo) },
          { label: 'Destino Agendamento',   value: loadingSol ? '...' : String(totalDestinoAgendamento) },
          { label: 'Em Andamento',          value: loadingSol ? '...' : String(emAndamento) },
          { label: 'Concluídas',            value: loadingSol ? '...' : String(concluidas) },
        ]}
      />

      {/* ============ Solicitações vinculadas ============ */}
      <div className="space-y-4">
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
            <CardListSkeleton rows={3} />
          ) : solicitacoes.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
              Nenhuma solicitação vinculada a esta unidade.
            </p>
          ) : (
            <div className="space-y-2">
              {solicitacoes.map(({ solicitacao: sol, vinculos }) => {
                const status = sol.status as StatusSolicitacao;
                const numProcesso = sol.numero_processo as string;
                const dataCriacao = sol.created_at as string;
                const cid = sol.cid10_principal as string;
                const paciente = sol.pacientes as Record<string, unknown> | null;
                const nomePaciente = paciente?.nome_completo as string | undefined;

                return (
                  <Link
                    key={sol.id as string}
                    href={`/fluxo-v2/solicitacoes/${sol.id}?from=unidades-saude`}
                    className="block rounded-lg p-3 transition-colors duration-150 group"
                    style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-card)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)'; e.currentTarget.style.borderColor = 'var(--tfd-primary-200)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)'; e.currentTarget.style.borderColor = 'var(--tfd-surface-border)'; }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-500)' }}>
                            {numProcesso}
                          </span>
                          {vinculos.map((v) => (
                            <VinculoTag key={v} vinculo={v} />
                          ))}
                        </div>
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
      </div>

      <style jsx>{`
        .header-groups { display: flex; flex-direction: column; gap: 6px; }
        .header-groups-divider { display: none; }
        @media (min-width: 1100px) {
          .header-groups { flex-direction: row; align-items: center; gap: 16px; flex-wrap: wrap; }
          .header-groups-divider { display: inline-block; width: 1px; height: 16px; background: #E2E8F0; flex-shrink: 0; }
        }
      `}</style>

      <UnidadeDrawer
        open={editOpen}
        editandoId={editOpen ? id : null}
        editandoData={editOpen ? unidade : null}
        onClose={() => setEditOpen(false)}
        onSaved={() => setReloadFlag((n) => n + 1)}
      />
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

function KpiBar({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div
      className="mb-6 overflow-hidden"
      style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 1px 0 rgba(15,23,42,0.02)' }}
    >
      <div
        className="kpi-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((it, i) => (
          <div key={i} className="px-5 py-4 kpi-cell min-w-0">
            <p className="text-[11px] font-medium uppercase whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>
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
        .kpi-cell + .kpi-cell { border-left: 1px solid #F1F5F9; }
      `}</style>
    </div>
  );
}

/**
 * Tag de diferenciação visual do tipo de vínculo entre uma solicitação e
 * a unidade. Usada na listagem da tela de unidade e dentro do detalhe do
 * paciente, para o pessoal de relatórios separar:
 *  - Origem do laudo: solicitação cujo laudo veio desta unidade
 *  - Destino de agendamento: solicitação cujo agendamento foi feito aqui
 */
function VinculoTag({ vinculo }: { vinculo: VinculoSolicitacaoUnidade }) {
  const palette: Record<VinculoSolicitacaoUnidade, { bg: string; fg: string }> = {
    origem_laudo: { bg: '#EEF2FF', fg: '#3730A3' },
    destino_agendamento: { bg: '#ECFDF5', fg: '#047857' },
  };
  const p = palette[vinculo];
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-[2px] rounded"
      style={{ background: p.bg, color: p.fg }}
      title={VINCULO_SOLICITACAO_UNIDADE_LABEL[vinculo]}
    >
      {VINCULO_SOLICITACAO_UNIDADE_LABEL[vinculo]}
    </span>
  );
}
