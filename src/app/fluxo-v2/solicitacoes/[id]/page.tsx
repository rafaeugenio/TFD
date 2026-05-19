'use client';

import { use, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ArrowLeft, Archive, ArchiveRestore, Send, Phone, Mail, ExternalLink, Paperclip, FileText, FileX,
} from 'lucide-react';
import StatusV2Badge from '../../_components/StatusV2Badge';
import { idadeAnos } from '../../_utils/idade';
import LinhaDoTempoTab from '../../_components/LinhaDoTempoTab';
import ObservacoesTab from '../../_components/ObservacoesTab';
import RegulacaoTab from '../../_components/RegulacaoTab';
import FinanceiroTab from '../../_components/FinanceiroTab';
import AnexosTab from '../../_components/AnexosTab';
import { agregarAnexos } from '../../_utils/anexosUnificados';
import EnviarParaSetorDrawer from '../../_components/drawers/EnviarParaSetorDrawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { isLocked, tooltipLocked, setorAtual } from '../../_utils/lock';
import { DetailPageSkeleton } from '@/shared/components/skeleton';
import { Can } from '@/shared/auth/Can';
import { useToast } from '@/shared/components/toast/Toast';
import { resolverOrigem } from '@/shared/utils/solicitacaoOrigem';

type TabKey = 'timeline' | 'regulacao' | 'financeiro' | 'anexos' | 'observacoes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'timeline',    label: 'Linha do tempo' },
  { key: 'regulacao',   label: 'Regulação' },
  { key: 'financeiro',  label: 'Financeiro' },
  { key: 'anexos',      label: 'Anexos' },
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
  const { getById, encerrar, reabrirSolicitacao, isLoading } = useFluxoV2State();
  const toast = useToast();
  const s = getById(id);

  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = tabParam && TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'timeline';

  // "Voltar" usa a origem (?from=...) quando informada, senão cai em Solicitações.
  const origem = resolverOrigem(searchParams.get('from'));
  const voltar = origem ?? { href: '/fluxo-v2/solicitacoes', label: 'Solicitações' };

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
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [reabrirSetor, setReabrirSetor] = useState<'dados_basicos' | 'regulacao' | 'financeiro'>('regulacao');
  const [reabrirMotivo, setReabrirMotivo] = useState('');
  /** Código vindo da tabela auxiliar `motivo_encerramento` — vazio força o
   *  operador a selecionar antes de salvar. */
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

  function handleReabrir() {
    if (!s) return;
    reabrirSolicitacao(s.id, reabrirSetor, reabrirMotivo.trim() || undefined);
    const setorLabel = {
      dados_basicos: 'Dados Básicos',
      regulacao: 'Regulação',
      financeiro: 'Financeiro',
    }[reabrirSetor];
    toast.success('Solicitação reaberta', `Encaminhada para ${setorLabel}.`);
    setReabrirOpen(false);
    setReabrirMotivo('');
    setReabrirSetor('regulacao');
    router.refresh();
  }

  const acompCount = s.acompanhantes.length;
  const acompResumo =
    acompCount === 0 ? 'Sem acompanhantes' :
    acompCount === 1 ? `1 acompanhante: ${s.acompanhantes[0].nome.split(' ')[0]}` :
    `${acompCount} acompanhantes: ${s.acompanhantes.slice(0, 2).map((a) => a.nome.split(' ')[0]).join(', ')}${acompCount > 2 ? ` +${acompCount - 2}` : ''}`;

  return (
    <div>
      <Link href={voltar.href} className="inline-flex items-center gap-1 text-[12px] mb-3 transition-colors hover:text-[#1A1D2B]" style={{ color: '#6B7280' }}>
        <ArrowLeft size={12} /> Voltar para {voltar.label}
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

        {/* Linha 2 — estado da solicitação: status + tipo + número + datas */}
        <div className="px-6 pb-3 text-[14px]" style={{ color: '#475569' }}>
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <StatusV2Badge status={s.status} />
            <TipoSolicitacaoBadge tipo={s.tipoSolicitacao} />
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
            <AnexosCounter total={agregarAnexos(s).length} onClick={() => setTab('anexos')} ativo={activeTab === 'anexos'} />
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
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
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
                <p className="text-[12px]" style={{ color: '#B91C1C' }}>
                  Nenhuma edição é permitida. Para retomar o fluxo, reabra a solicitação.
                </p>
              </div>
            </div>
            <Can action="solicitacoes.reabrir">
              <button
                type="button"
                onClick={() => setReabrirOpen(true)}
                className="tfd-btn tfd-btn-primary tfd-btn--sm shrink-0"
                style={{ background: '#B91C1C', borderColor: '#B91C1C' }}
              >
                <ArchiveRestore size={14} /> Reabrir solicitação
              </button>
            </Can>
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
        {activeTab === 'anexos'      && <AnexosTab s={s} />}
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

      {/* Reabrir modal — exibido apenas quando solicitação está encerrada */}
      {reabrirOpen && s.status === 'encerrada' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setReabrirOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 12, width: 'min(520px, 92vw)', padding: 24 }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--tfd-primary-50, #EBF0FF)',
                  color: 'var(--tfd-primary-500)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ArchiveRestore size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-semibold" style={{ color: '#1A1D2B' }}>Reabrir solicitação</h3>
                <p className="text-[12.5px] mt-0.5" style={{ color: '#6B7280' }}>
                  {s.numero} — {s.paciente.nome}
                </p>
              </div>
            </div>

            <p className="text-[12.5px] mb-4 leading-relaxed" style={{ color: '#475569' }}>
              Ao reabrir, a solicitação volta ao fluxo normal e poderá ser tramitada entre setores
              como qualquer outra. Escolha o setor inicial para onde ela deve cair:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              {(
                [
                  { key: 'dados_basicos', titulo: 'Dados Básicos', descricao: 'Reanalisar dados clínicos e do paciente.' },
                  { key: 'regulacao', titulo: 'Regulação', descricao: 'Retomar regulação, parecer ou agendamento.' },
                  { key: 'financeiro', titulo: 'Financeiro', descricao: 'Ajustar passagens, ajuda de custo ou adicionais.' },
                ] as const
              ).map((opt) => {
                const ativo = reabrirSetor === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setReabrirSetor(opt.key)}
                    className="text-left p-3 transition-all"
                    style={{
                      background: ativo ? 'var(--tfd-primary-50)' : 'white',
                      border: ativo ? '1px solid var(--tfd-primary-500)' : '1px solid var(--tfd-surface-border)',
                      borderRadius: 8,
                      boxShadow: ativo ? '0 0 0 3px rgba(20,107,250,0.08)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        style={{
                          width: 12, height: 12, borderRadius: '50%',
                          border: ativo ? '4px solid var(--tfd-primary-500)' : '2px solid #CBD5E1',
                          background: 'white',
                        }}
                        aria-hidden
                      />
                      <span
                        className="text-[12.5px] font-semibold"
                        style={{ color: ativo ? 'var(--tfd-primary-700, #0D4FBD)' : '#1A1D2B' }}
                      >
                        {opt.titulo}
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: '#64748B' }}>{opt.descricao}</p>
                  </button>
                );
              })}
            </div>

            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
              Motivo da reabertura <span style={{ color: '#94A3B8' }}>(opcional)</span>
            </label>
            <textarea
              value={reabrirMotivo}
              onChange={(e) => setReabrirMotivo(e.target.value)}
              rows={2}
              placeholder="Ex.: nova documentação enviada pelo paciente / glosa identificada no BPA..."
              className="w-full px-3 py-2 text-[13px] mb-4"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="tfd-btn tfd-btn-ghost"
                onClick={() => setReabrirOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="tfd-btn tfd-btn-primary"
                onClick={handleReabrir}
              >
                <ArchiveRestore size={14} /> Reabrir
              </button>
            </div>
          </div>
        </div>
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

/** Badge do tipo da solicitação (Normal x Ajuda de Custo) no header. */
function TipoSolicitacaoBadge({ tipo }: { tipo?: 'normal' | 'ajuda_custo' }) {
  const ajuda = tipo === 'ajuda_custo';
  const styles = ajuda
    ? { bg: '#FFFBEB', fg: '#92400E', bd: '#FDE68A', label: 'Ajuda de custo' }
    : { bg: '#EFF6FF', fg: '#1D4ED8', bd: '#BFDBFE', label: 'Normal' };
  return (
    <span
      className="inline-flex items-center px-2 py-[3px] text-[11px] font-semibold uppercase"
      style={{
        background: styles.bg,
        color: styles.fg,
        border: `1px solid ${styles.bd}`,
        borderRadius: 6,
        letterSpacing: '0.05em',
      }}
      title={ajuda
        ? 'Paciente já está no destino. Só recebe diárias — sem viagens e sem adicionais.'
        : 'Fluxo completo: viagens, adicionais e ajuda de custo.'}
    >
      {styles.label}
    </span>
  );
}

/**
 * Chip de contagem de anexos no header. Linka para a aba "Anexos" que mostra
 * a lista completa (incluindo comprovantes de adicionais, bilhetes, pareceres
 * gerados pelo sistema e despachos). Substitui o antigo popover por uma única
 * fonte de verdade — a aba.
 */
function AnexosCounter({ total, onClick, ativo }: { total: number; onClick: () => void; ativo: boolean }) {
  const dim = total === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={dim}
      className="inline-flex items-center gap-1.5 transition-colors"
      style={{
        color: dim ? '#94A3B8' : ativo ? '#146BFA' : '#475569',
        background: 'transparent',
        cursor: dim ? 'default' : 'pointer',
        textDecoration: dim ? 'none' : 'underline',
        textUnderlineOffset: 3,
        textDecorationColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!dim) e.currentTarget.style.textDecorationColor = '#CBD5E1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecorationColor = 'transparent';
      }}
      title={total === 0 ? 'Nenhum anexo nesta solicitação' : `${total} anexo(s) — abrir aba Anexos`}
    >
      <Paperclip size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} />
      <span>
        <strong style={{ color: dim ? '#94A3B8' : '#1E293B', fontWeight: 600 }}>{total}</strong>{' '}
        {total === 1 ? 'anexo' : 'anexos'}
      </span>
    </button>
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

