'use client';

import { use, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ArrowLeft, Archive, Send, Phone, Mail, ExternalLink, Paperclip, FileText, FileX,
} from 'lucide-react';
import StatusV2Badge from '../../_components/StatusV2Badge';
import { idadeAnos } from '../../_utils/idade';
import LinhaDoTempoTab from '../../_components/LinhaDoTempoTab';
import ObservacoesTab from '../../_components/ObservacoesTab';
import RegulacaoTab from '../../_components/RegulacaoTab';
import FinanceiroTab from '../../_components/FinanceiroTab';
import EnviarParaSetorDrawer from '../../_components/drawers/EnviarParaSetorDrawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { isLocked, tooltipLocked, setorAtual } from '../../_utils/lock';
import { DetailPageSkeleton } from '@/shared/components/skeleton';
import { Can } from '@/shared/auth/Can';
import { useToast } from '@/shared/components/toast/Toast';

type TabKey = 'timeline' | 'regulacao' | 'financeiro' | 'observacoes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'timeline',    label: 'Linha do tempo' },
  { key: 'regulacao',   label: 'Regulação' },
  { key: 'financeiro',  label: 'Financeiro' },
  { key: 'observacoes', label: 'Observações' },
];

// `?tab=dados` is the only legacy redirect now — strip it so the URL
// returns to "no param" which renders the default Linha do tempo tab.
const LEGACY_TAB_REDIRECTS = new Set(['dados']);

export default function SolicitacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <SolicitacaoDetalheInner id={id} />
    </Suspense>
  );
}

function SolicitacaoDetalheInner({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getById, encerrar, isLoading } = useFluxoV2State();
  const toast = useToast();
  const s = getById(id);

  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = tabParam && TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'timeline';

  // Redireciona aba legada `?tab=dados` para sem param (vira Linha do tempo).
  useEffect(() => {
    if (tabParam && LEGACY_TAB_REDIRECTS.has(tabParam)) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('tab');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [tabParam, pathname, router, searchParams]);

  const [encerrarOpen, setEncerrarOpen] = useState(false);
  const [enviarOpen, setEnviarOpen] = useState(false);
  const [motivo, setMotivo] = useState<string>('');
  const [dataEnc, setDataEnc] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState('');

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'timeline') params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  if (!s) {
    if (isLoading) {
      return <DetailPageSkeleton tabs={TABS.length} />;
    }
    return (
      <div className="text-center py-20">
        <p className="text-[14px]" style={{ color: '#6B7280' }}>Solicitação não encontrada.</p>
        <Link href="/fluxo-v2/solicitacoes" className="tfd-btn tfd-btn-ghost mt-4 inline-flex">
          <ArrowLeft size={14} /> Voltar
        </Link>
      </div>
    );
  }

  function handleEncerrar() {
    encerrar(s!.id, { data: dataEnc, motivo, observacao: obs.trim() || undefined });
    toast.success('Solicitação encerrada', motivo);
    setEncerrarOpen(false);
    router.refresh();
  }

  const acompCount = s.acompanhantes.length;
  const acompResumo =
    acompCount === 0 ? 'Sem acompanhantes' :
    acompCount === 1 ? `1 acompanhante: ${s.acompanhantes[0].nome.split(' ')[0]}` :
    `${acompCount} acompanhantes: ${s.acompanhantes.slice(0, 2).map((a) => a.nome.split(' ')[0]).join(', ')}${acompCount > 2 ? ` +${acompCount - 2}` : ''}`;

  return (
    <div>
      <Link href="/fluxo-v2/solicitacoes" className="inline-flex items-center gap-1 text-[12px] mb-3 transition-colors hover:text-[#1A1D2B]" style={{ color: '#6B7280' }}>
        <ArrowLeft size={12} /> Voltar para Solicitações
      </Link>

      {/* ============ Header (corporativo, 2-3 linhas) ============ */}
      <div
        className="mb-6 overflow-hidden"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        {/* Linha 1 — proeminente: Nome (link) + idade + CPF + Encerrar */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href={`/pacientes/${s.paciente.id}`}
                className="text-[20px] font-semibold transition-colors hover:underline"
                style={{ color: '#146BFA', letterSpacing: '-0.02em', textUnderlineOffset: 3 }}
              >
                {s.paciente.nome}
              </Link>
              <span className="text-[14px]" style={{ color: '#64748B' }}>
                {idadeAnos(s.paciente.dataNascimento)} anos
              </span>
              <span className="text-[13px] font-mono" style={{ color: '#94A3B8' }}>
                {s.paciente.cpf}
              </span>
            </div>
          </div>
          {s.status !== 'encerrada' && (
            <div className="flex items-center gap-2 shrink-0">
              <Can action="tramitacao.tramitar">
                <button
                  type="button"
                  className="tfd-btn tfd-btn-secondary"
                  onClick={() => setEnviarOpen(true)}
                  title="Enviar para outro setor"
                >
                  <Send size={14} /> Enviar para setor
                </button>
              </Can>
              <button
                type="button"
                className="tfd-btn tfd-btn-danger"
                onClick={() => setEncerrarOpen(true)}
              >
                <Archive size={14} /> Encerrar solicitação
              </button>
            </div>
          )}
        </div>

        {/* Linha 2 — estado da solicitação: status + número + datas */}
        <div className="px-6 pb-3 text-[14px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <StatusV2Badge status={s.status} />
            <span><span style={{ color: '#94A3B8' }}>Solicitação </span><span className="font-mono" style={{ color: '#1E293B', fontWeight: 500 }}>{s.numero}</span></span>
            <Sep />
            <span><span style={{ color: '#94A3B8' }}>Criada em </span>{new Date(s.dataCriacao).toLocaleDateString('pt-BR')}</span>
            <Sep />
            {s.numeroSEI ? (
              s.seiUrl ? (
                <a
                  href={s.seiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:underline"
                  style={{ color: '#146BFA', textUnderlineOffset: 3 }}
                  title={`SEI nº ${s.numeroSEI}`}
                >
                  <ExternalLink size={12} strokeWidth={2.2} />
                  <span className="font-mono">SEI {s.numeroSEI}</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5" style={{ color: '#475569' }} title="SEI sem URL cadastrada">
                  <FileText size={12} style={{ color: '#94A3B8' }} />
                  <span className="font-mono">SEI {s.numeroSEI}</span>
                </span>
              )
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-[2px] text-[12px]"
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: 999,
                  color: '#94A3B8',
                }}
                title="Nenhum vínculo SEI cadastrado nesta solicitação"
              >
                <FileX size={11} strokeWidth={2.2} />
                Sem vínculo SEI
              </span>
            )}
          </div>
        </div>

        {/* Linha 3 — Contato | Endereço operacional (2 grupos)
            Em ≥1100px ficam lado a lado com divisor sutil entre eles.
            Abaixo disso empilham em duas sub-linhas. */}
        <div className="header-groups px-6 pb-5 text-[13px]" style={{ color: '#475569' }}>
          {/* Grupo 1 — Contato (telefone · email) */}
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
            <a
              href={`tel:${s.paciente.telefone.replace(/\D/g, '')}`}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA]"
              title="Ligar"
            >
              <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
              <span className="font-mono">{s.paciente.telefone}</span>
            </a>
            {s.paciente.email && (
              <>
                <Sep />
                <a
                  href={`mailto:${s.paciente.email}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA] truncate max-w-[240px]"
                  title={s.paciente.email}
                >
                  <Mail size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
                  <span className="truncate">{s.paciente.email}</span>
                </a>
              </>
            )}
          </div>

          {/* Divisor visual entre grupos (somente em viewport amplo) */}
          <span aria-hidden className="header-groups-divider" />

          {/* Grupo 2 — Endereço operacional: regional · SEI · anexos · acompanhante(s) */}
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap min-w-0">
            <span style={{ color: '#475569' }} title={`${s.paciente.regional} · Zona ${s.paciente.zonaRegional}`}>
              <span style={{ color: '#94A3B8' }}>Reg. </span>
              {s.paciente.regional.replace(/^Regional de /, '')} · {s.paciente.zonaRegional}
            </span>
            {s.dataLaudo && (
              <>
                <Sep />
                <span><span style={{ color: '#94A3B8' }}>Laudo </span>{new Date(s.dataLaudo).toLocaleDateString('pt-BR')}</span>
              </>
            )}
            <Sep />
            <AnexosPopover anexos={s.anexos} />
            <Sep />
            <span style={{ color: '#475569' }}>{acompResumo}</span>
          </div>
        </div>

      </div>

      {/* ============ Encerramento (visível em todas as abas) ============ */}
      {s.encerramento && (
        <div
          className="p-5 mb-6"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 'var(--tfd-radius-lg)',
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#FEE2E2', color: '#B91C1C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Archive size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: '#7F1D1D' }}>Solicitação encerrada</h3>
              <p className="text-[12px]" style={{ color: '#B91C1C' }}>Encerramento registrado pela equipe.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <EncerramentoField label="Motivo" value={s.encerramento.motivo} />
            <EncerramentoField label="Data" value={new Date(s.encerramento.data).toLocaleDateString('pt-BR')} />
            <EncerramentoField label="Observação" value={s.encerramento.observacao || '—'} />
          </div>
        </div>
      )}

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
              style={{
                color: active ? '#146BFA' : '#64748B',
                background: 'transparent',
              }}
            >
              {t.label}
              {active && (
                <span
                  className="absolute left-2 right-2 -bottom-px h-[2px]"
                  style={{ background: '#146BFA' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ============ Tab content ============ */}
      <div className="animate-fade-in">
        {activeTab === 'timeline' && (
          <div id="linha-do-tempo" className="min-w-0">
            <LinhaDoTempoTab s={s} />
          </div>
        )}
        {activeTab === 'regulacao'   && <RegulacaoTab s={s} />}
        {activeTab === 'financeiro'  && <FinanceiroTab s={s} />}
        {activeTab === 'observacoes' && (
          <div id="observacoes" className="min-w-0">
            <ObservacoesTab s={s} />
          </div>
        )}
      </div>

      {/* Encerrar modal */}
      {encerrarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setEncerrarOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: 'min(480px, 92vw)', padding: 24 }}>
            <h3 className="text-[18px] font-semibold mb-1" style={{ color: '#1A1D2B' }}>Encerrar solicitação</h3>
            <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>{s.numero} — {s.paciente.nome}</p>
            <div className="mb-3">
              <LookupSelect
                categoria="motivo_encerramento"
                label="Motivo"
                value={motivo}
                onChange={setMotivo}
                required
              />
            </div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>Data</label>
            <input
              type="date" value={dataEnc} onChange={(e) => setDataEnc(e.target.value)}
              className="w-full px-3 py-2 text-[13px] mb-3"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />
            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>Observação</label>
            <textarea
              value={obs} onChange={(e) => setObs(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-[13px] mb-4"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="tfd-btn tfd-btn-ghost" onClick={() => setEncerrarOpen(false)}>Cancelar</button>
              <button type="button" className="tfd-btn tfd-btn-danger" onClick={handleEncerrar}>Confirmar encerramento</button>
            </div>
          </div>
        </div>
      )}

      {/* Enviar para outro setor */}
      {s.status !== 'encerrada' && (
        <EnviarParaSetorDrawer
          open={enviarOpen}
          onClose={() => setEnviarOpen(false)}
          solicitacaoId={s.id}
          setorAtual={setorAtual(s) as 'dados_basicos' | 'regulacao' | 'financeiro'}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 180ms ease-out;
        }
        /* Linha 3 — em viewport ≥1100px exibe Contato | divisor | Endereço operacional
           lado a lado. Abaixo disso empilha em duas sub-linhas e oculta o divisor. */
        .header-groups {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .header-groups-divider { display: none; }
        @media (min-width: 1100px) {
          .header-groups {
            flex-direction: row;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
          }
          .header-groups-divider {
            display: inline-block;
            width: 1px;
            height: 16px;
            background: #E2E8F0;
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
}

function Sep() {
  return <span aria-hidden style={{ color: '#CBD5E1' }}>·</span>;
}

/**
 * T2.AO — Popover compacto para listar anexos da solicitação. Cada anexo é
 * clicável (mock-only — abre alert simulando download). Mantém aparência
 * neutra (cinza), sem cor.
 */
function AnexosPopover({
  anexos,
}: {
  anexos: Array<{ id: string; nome: string; tipo: string; tamanhoKB?: number }>;
}) {
  const [open, setOpen] = useState(false);
  const count = anexos.length;
  const dim = count === 0;
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => !dim && setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="inline-flex items-center gap-1.5 transition-colors"
        style={{
          color: dim ? '#94A3B8' : '#475569',
          background: 'transparent',
          cursor: dim ? 'default' : 'pointer',
        }}
        title={count === 0 ? 'Nenhum anexo' : `${count} anexo(s)`}
      >
        <Paperclip size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
        <span>
          <strong style={{ color: dim ? '#94A3B8' : '#1E293B', fontWeight: 600 }}>{count}</strong>{' '}
          {count === 1 ? 'anexo' : 'anexos'}
        </span>
      </button>
      {open && count > 0 && (
        <div
          className="absolute left-0 top-full mt-1 z-30"
          style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 10px 24px rgba(15,23,42,0.10)',
            minWidth: 280,
            padding: 6,
          }}
        >
          <ul className="flex flex-col gap-0.5">
            {anexos.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.alert(`Abrir/baixar anexo: ${a.nome}`);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] transition-colors hover:bg-[#F8FAFC] text-left"
                  style={{ borderRadius: 6, background: 'transparent' }}
                >
                  <FileText size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                  <span className="flex-1 truncate" style={{ color: '#1E293B' }}>{a.nome}</span>
                  {typeof a.tamanhoKB === 'number' && (
                    <span className="text-[11px] font-mono" style={{ color: '#94A3B8' }}>{a.tamanhoKB} KB</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}

function EncerramentoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>{label}</p>
      <div className="text-[13px]" style={{ color: '#1A1D2B' }}>{value}</div>
    </div>
  );
}

