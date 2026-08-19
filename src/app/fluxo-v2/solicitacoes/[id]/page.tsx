'use client';

import { use, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ArrowLeft, Archive, ArchiveRestore, Send, Phone, Mail, ExternalLink, Paperclip, FileText, FileX,
  Plus, Trash2, HeartHandshake, Clock, CalendarDays, MapPin,
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
import NewDespesaFunerariaDrawer from '../../_components/drawers/NewDespesaFunerariaDrawer';
import { useFluxoV2State } from '../../_state/FluxoV2Provider';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { isLocked, tooltipLocked, setorAtual, type SetorAcao } from '../../_utils/lock';
import { DetailPageSkeleton } from '@/shared/components/skeleton';
import { Can } from '@/shared/auth/Can';
import { useToast } from '@/shared/components/toast/Toast';
import { resolverOrigem } from '@/shared/utils/solicitacaoOrigem';
import { tempoNoSetor } from '../../_utils/tempoSetor';

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
  const { getById, encerrar, reabrirSolicitacao, removerDespesaFuneraria, isLoading } = useFluxoV2State();
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
  const [reabrirSetor, setReabrirSetor] = useState<'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento'>('regulacao');
  const [reabrirMotivo, setReabrirMotivo] = useState('');
  const [despFuneOpen, setDespFuneOpen] = useState(false);
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
      passagens: 'Passagens',
      ajuda_custo: 'Ajuda de Custo',
      acompanhamento: 'Acompanhamento',
    }[reabrirSetor];
    toast.success('Solicitação reaberta', `Encaminhada para ${setorLabel}.`);
    setReabrirOpen(false);
    setReabrirMotivo('');
    setReabrirSetor('regulacao');
    router.refresh();
  }

  const acompCount = s.acompanhantes.length;

  // Proxy de "tempo no setor atual" — mesma métrica (dias desde a criação da
  // solicitação) usada nas filas de Passagens, Ajuda de Custo e Acompanhamento.
  // Não existe timestamp de entrada no setor atual persistido no modelo.
  const diasAguardando = tempoNoSetor(s.dataCriacao);

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
        <div className="flex items-start justify-between gap-x-4 gap-y-3 flex-wrap px-6 pt-6 pb-3">
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
          {s.status !== 'em_encerramento' && (
            <div className="flex items-center gap-2 flex-wrap">
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

        <div style={{ borderTop: '1px solid #E2E8F0' }} />

        {/* Bloco de detalhes — duas linhas em ordem de importância. A primeira
            carrega o que orienta a decisão (status, tempo de espera, número e
            SEI); a segunda é apoio, com cada dado se explicando pelo ícone e
            pelo próprio valor. Dados da mesma natureza se juntam num item só,
            com ponto médio (município · regional · zona; laudo · unidade).
            Acompanhantes ficam num card à direita. */}
        <div className="detail-groups px-6 py-4">
          <div className="detail-main">
            {/* Linha 1 — situação: peso visual no status e no tempo de espera */}
            <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
              <StatusV2Badge status={s.status} />
              {s.status !== 'em_encerramento' && (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: '#1E293B' }}>
                  <Clock size={13} strokeWidth={2.2} style={{ color: '#94A3B8' }} aria-hidden />
                  {diasAguardando === 0
                    ? 'Aguardando desde hoje'
                    : `Aguardando há ${diasAguardando} ${diasAguardando === 1 ? 'dia' : 'dias'}`}
                </span>
              )}
              <span
                className="text-[13px] font-mono"
                style={{ color: '#475569', fontWeight: 500 }}
                title="Número da solicitação"
              >
                {s.numero}
              </span>
              {s.numeroSEI ? (
                s.seiUrl ? (
                  <a
                    href={s.seiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] transition-colors hover:underline"
                    style={{ color: '#146BFA', textUnderlineOffset: 3 }}
                    title={`Abrir processo SEI nº ${s.numeroSEI}`}
                  >
                    <ExternalLink size={12} strokeWidth={2.2} />
                    <span>
                      {/^sei/i.test(s.numeroSEI) ? '' : 'SEI '}
                      <span className="font-mono">{s.numeroSEI}</span>
                    </span>
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 text-[13px]"
                    style={{ color: '#475569' }}
                    title="Processo SEI sem URL cadastrada"
                  >
                    <FileText size={12} style={{ color: '#94A3B8' }} />
                    <span>
                      {/^sei/i.test(s.numeroSEI) ? '' : 'SEI '}
                      <span className="font-mono">{s.numeroSEI}</span>
                    </span>
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

            {/* Linha 2 — apoio: criação, contato, local, laudo e anexos */}
            <div
              className="flex items-start gap-x-4 gap-y-1.5 flex-wrap mt-2.5 text-[12.5px]"
              style={{ color: '#64748B' }}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <CalendarDays size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} aria-hidden />
                Criada em {new Date(s.dataCriacao).toLocaleDateString('pt-BR')}
              </span>
              <a
                href={`tel:${s.paciente.telefone.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-[#146BFA]"
                title="Ligar para o paciente"
              >
                <Phone size={12} strokeWidth={2.2} style={{ color: '#94A3B8' }} aria-hidden />
                <span className="font-mono">{s.paciente.telefone}</span>
              </a>
              {s.paciente.email && (
                <a
                  href={`mailto:${s.paciente.email}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#146BFA]"
                  title={`Escrever para ${s.paciente.email}`}
                >
                  <Mail size={12} strokeWidth={2.2} className="shrink-0" style={{ color: '#94A3B8' }} aria-hidden />
                  <span className="truncate max-w-[220px]">{s.paciente.email}</span>
                </a>
              )}
              <span className="inline-flex items-center gap-1.5" title="Município, regional e zona do paciente">
                <MapPin size={12} strokeWidth={2.2} className="shrink-0" style={{ color: '#94A3B8' }} aria-hidden />
                <span>
                  {s.paciente.municipio.split(' - ')[0]}
                  {' · '}
                  {s.paciente.regionalCodigo ? `${s.paciente.regionalCodigo} ` : ''}
                  {s.paciente.regional} · Zona {s.paciente.zonaRegional}
                </span>
              </span>
              {s.dataLaudo && (
                <span className="inline-flex items-center gap-1.5" title="Data e unidade de origem do laudo médico">
                  <FileText size={12} strokeWidth={2.2} className="shrink-0" style={{ color: '#94A3B8' }} aria-hidden />
                  <span>
                    Laudo de {new Date(s.dataLaudo).toLocaleDateString('pt-BR')}
                    {s.laudoOrigemUnidade ? ` · ${s.laudoOrigemUnidade}` : ''}
                  </span>
                </span>
              )}
              <AnexosCounter total={agregarAnexos(s).length} onClick={() => setTab('anexos')} ativo={activeTab === 'anexos'} />
            </div>
          </div>

          {/* Acompanhantes — card lateral, tratamento mantido */}
          <div className="detail-aside" id="acompanhantes">
            <GroupLabel>Acompanhantes</GroupLabel>
            {acompCount === 0 ? (
              <p className="text-[13px]" style={{ color: '#6B7280' }}>
                Sem acompanhante. O paciente segue sozinho nesta solicitação.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {s.acompanhantes.map((a) => (
                  <li
                    key={a.id}
                    className="px-3 py-2"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8 }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold" style={{ color: '#1A1D2B' }}>
                        {a.nome}
                      </span>
                      {a.doador && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-[2px] text-[10.5px] font-semibold uppercase"
                          style={{ background: '#FFE4E6', color: '#9F1239', borderRadius: 999, letterSpacing: '0.04em' }}
                          title="Acompanhante doador nesta solicitação"
                        >
                          <HeartHandshake size={11} strokeWidth={2.2} />
                          Doador
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] mt-0.5" style={{ color: '#64748B' }}>
                      {a.vinculo} · {idadeAnos(a.dataNascimento)} anos
                    </div>
                  </li>
                ))}
              </ul>
            )}
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

          {/* Despesas de funerária — só quando encerrada por óbito */}
          {s.encerramento.motivo === 'obito' && (
            <div
              className="mt-4 pt-4"
              style={{ borderTop: '1px solid #FECACA' }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-[13px] font-semibold" style={{ color: '#7F1D1D' }}>
                    Despesas de funerária
                  </h4>
                  <p className="text-[11.5px]" style={{ color: '#B91C1C' }}>
                    Custos cobertos pelo município (transporte, urna, translado).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDespFuneOpen(true)}
                  className="tfd-btn tfd-btn--sm shrink-0"
                  style={{ background: 'white', border: '1px solid #FECACA', color: '#B91C1C' }}
                >
                  <Plus size={14} /> Adicionar despesa de funerária
                </button>
              </div>

              {s.despesasFunerarias.length === 0 ? (
                <p className="text-[12px]" style={{ color: '#B91C1C' }}>
                  Nenhuma despesa registrada.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {s.despesasFunerarias.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-3 py-2"
                      style={{ background: 'white', border: '1px solid #FECACA', borderRadius: 8 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate" style={{ color: '#1A1D2B' }}>
                          {d.descricao}
                        </div>
                        <div className="text-[11.5px]" style={{ color: '#94A3B8' }}>
                          {new Date(`${d.data}T00:00:00`).toLocaleDateString('pt-BR')}
                          {d.anexoNome ? ` · ${d.anexoNome}` : ''}
                        </div>
                      </div>
                      <div className="text-[13px] font-semibold" style={{ color: '#7F1D1D' }}>
                        {d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <button
                        type="button"
                        onClick={() => removerDespesaFuneraria(s.id, d.id)}
                        className="inline-flex items-center justify-center shrink-0"
                        style={{ color: '#B91C1C' }}
                        aria-label="Remover despesa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between px-3 py-2 mt-1"
                    style={{ borderTop: '1px dashed #FECACA' }}
                  >
                    <span className="text-[12px] font-semibold" style={{ color: '#7F1D1D' }}>
                      Subtotal funerária
                    </span>
                    <span className="text-[13px] font-bold" style={{ color: '#7F1D1D' }}>
                      {s.despesasFunerarias
                        .reduce((acc, d) => acc + d.valor, 0)
                        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
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
      {s.status !== 'em_encerramento' && (
        <EnviarParaSetorDrawer
          open={enviarOpen}
          onClose={() => setEnviarOpen(false)}
          solicitacaoId={s.id}
          setorAtual={setorAtual(s) as SetorAcao}
        />
      )}

      {s.encerramento?.motivo === 'obito' && (
        <NewDespesaFunerariaDrawer
          open={despFuneOpen}
          onClose={() => setDespFuneOpen(false)}
          solicitacaoId={s.id}
        />
      )}

      {/* Reabrir modal — exibido apenas quando solicitação está encerrada */}
      {reabrirOpen && s.status === 'em_encerramento' && (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
              {(
                [
                  { key: 'dados_basicos', titulo: 'Dados Básicos', descricao: 'Reanalisar dados clínicos e do paciente.' },
                  { key: 'regulacao', titulo: 'Regulação', descricao: 'Retomar regulação, parecer ou agendamento.' },
                  { key: 'passagens', titulo: 'Passagens', descricao: 'Emitir ou remarcar passagens.' },
                  { key: 'ajuda_custo', titulo: 'Ajuda de Custo', descricao: 'Calcular e pagar diárias.' },
                  { key: 'acompanhamento', titulo: 'Acompanhamento', descricao: 'Retomar acompanhamento da viagem/tratamento.' },
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
        /* Bloco de detalhes do cabeçalho — resumo denso em duas linhas à
           esquerda e card de acompanhantes à direita a partir de 1024px, com
           divisor vertical sutil entre eles; empilham em coluna abaixo disso. */
        .detail-groups {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .detail-main {
          flex: 1 1 auto;
          min-width: 0;
        }
        .detail-aside {
          min-width: 0;
        }
        @media (min-width: 1024px) {
          .detail-groups {
            flex-direction: row;
            align-items: flex-start;
            gap: 28px;
          }
          .detail-aside {
            flex: 0 0 300px;
            padding-left: 28px;
            border-left: 1px solid #E2E8F0;
          }
        }
      `}</style>
    </div>
  );
}

/** Título do grupo de detalhes no cabeçalho da solicitação. */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="text-[11px] font-semibold uppercase mb-3"
      style={{ color: '#94A3B8', letterSpacing: '0.08em' }}
    >
      {children}
    </h4>
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

