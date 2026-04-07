'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Search,
  Building2,
  Heart,
  Users,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  ExternalLink,
  Stethoscope,
  Loader2,
  SendHorizonal,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarFilaRegulacao, criarCobrancaExterna, criarRotaRegulacao } from '@/services/regulacao.service';
import { atualizarStatus } from '@/services/solicitacoes.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { formatDate, formatCPF } from '@/shared/pipes/formatters';
import { useLookup } from '@/shared/hooks/useLookup';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Local types (previously from mock)                 */
/* -------------------------------------------------- */

type PrioridadeRegulacao = 'NORMAL' | 'URGENTE' | 'EMERGENCIAL';

interface RegulacaoItem {
  id: string;
  solicitacaoId: string;
  solicitacaoStatus: string;
  numeroProcesso: string;
  pacienteNome: string;
  pacienteCpf: string;
  cidCodigo: string;
  cidDescricao: string;
  diasNaFila: number;
  prioridade: PrioridadeRegulacao;
  parecerMedico?: {
    status: string;
    medico: string;
    data: string;
    observacoes: string;
  } | null;
}

/* -------------------------------------------------- */

/* -------------------------------------------------- */
/*  Priority styling                                   */
/* -------------------------------------------------- */

const prioridadeMap: Record<string, { bg: string; text: string; label: string }> = {
  NORMAL: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-text-secondary)', label: 'Normal' },
  URGENTE: { bg: '#FFEDD5', text: '#C2410C', label: 'Urgente' },
  EMERGENCIAL: { bg: '#FEE2E2', text: '#B91C1C', label: 'Emergencial' },
};

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function RegulacaoPage() {
  const toast = useToast();
  const { user } = useCurrentUser();
  const { options: canalOptions, loading: canalLoading } = useLookup('canal_comunicacao');

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ---- Devolver state ---- */
  const [devolverItem, setDevolverItem] = useState<RegulacaoItem | null>(null);
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('REGULACAO');

  /* ---- Fetch from Supabase ---- */
  const { data: regulacaoRaw, loading, refresh } = useSupabaseData(
    () => listarFilaRegulacao({ search }),
    [search]
  );

  /* ---- Map Supabase rows to display format ---- */
  const items = useMemo<RegulacaoItem[]>(() => {
    return regulacaoRaw.map((sol: any) => ({
      id: sol.id,
      solicitacaoId: sol.id,
      solicitacaoStatus: sol.status,
      numeroProcesso: sol.numero_processo,
      pacienteNome: sol.pacientes?.nome_completo ?? '—',
      pacienteCpf: sol.pacientes?.cpf ?? '',
      cidCodigo: sol.cid10_principal,
      cidDescricao: sol.descricao_diagnostico ?? '',
      prioridade: sol.prioridade || 'NORMAL',
      diasNaFila: Math.floor((Date.now() - new Date(sol.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      parecerMedico: null,
    }));
  }, [regulacaoRaw]);

  /* ---- Selected item ---- */
  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((i) => i.id === selectedId) ?? null;
  }, [selectedId, items]);

  return (
    <>
      <PageHeader
        title="Regulação"
        subtitle="Fila de regulação, parecer médico e roteamento de processos"
      />

      {/* ========== Summary Card ========== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Prontos p/ análise</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{items.length}</p>
          </div>
        </div>
      </div>

      {/* ========== Search ========== */}
      <div className="tfd-toolbar mb-4">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search
            size={16}
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar paciente, processo, CID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ========== Table ========== */}
      <div>
        <div className="tfd-card p-0 overflow-hidden w-full">
          <div className="overflow-x-auto">
            <table className="tfd-table">
              <thead>
                <tr>
                  <th>N.o Processo</th>
                  <th>Paciente</th>
                  <th className="hidden md:table-cell">CID-10</th>
                  <th>Prioridade</th>
                  <th>Dias na fila</th>
                  <th className="w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                          Carregando fila de regulação...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                          Nenhum processo encontrado
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const prio = prioridadeMap[item.prioridade];
                    const aguardandoRetorno = labelDestino(item.solicitacaoId);
                    const devolucaoInfo = devolucoesEnviadas.get(item.solicitacaoId);

                    return (
                      <tr
                        key={item.id}
                        className={aguardandoRetorno ? '' : 'cursor-pointer'}
                        style={{
                          opacity: aguardandoRetorno ? 0.55 : undefined,
                          pointerEvents: aguardandoRetorno ? 'none' : undefined,
                          backgroundColor: aguardandoRetorno ? '#FFFBEB' : undefined,
                        }}
                        onClick={aguardandoRetorno ? undefined : () => setSelectedId(item.id)}
                      >
                        <td>
                          <div>
                            <span className="font-medium text-sm" style={{ color: aguardandoRetorno ? 'var(--tfd-text-muted)' : 'var(--tfd-primary-500)' }}>
                              {item.numeroProcesso}
                            </span>
                            {aguardandoRetorno && devolucaoInfo && (
                              <div
                                className="flex items-center gap-1.5 mt-1"
                                title={`Devolvido em ${new Date(devolucaoInfo.created_at).toLocaleDateString('pt-BR')} — ${devolucaoInfo.urgencia === 'URGENTE' ? 'URGENTE' : 'Normal'}`}
                              >
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                                >
                                  Devolvido p/ {aguardandoRetorno}
                                </span>
                                {devolucaoInfo.urgencia === 'URGENTE' && (
                                  <span
                                    className="text-[9px] font-bold px-1 py-0.5 rounded"
                                    style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}
                                  >
                                    URGENTE
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="max-w-[160px] truncate font-medium">
                          {item.pacienteNome}
                        </td>
                        <td className="hidden md:table-cell">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--tfd-surface-100)',
                              color: 'var(--tfd-text-primary)',
                              fontFamily: 'var(--tfd-font-mono)',
                            }}
                          >
                            {item.cidCodigo}
                          </span>
                        </td>
                        <td>
                          {item.prioridade !== 'NORMAL' ? (
                            <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: prio.bg, color: prio.text }}>
                              {prio.label}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Normal</span>
                          )}
                        </td>
                        <td>
                          <span
                            className="font-semibold text-sm"
                            style={{
                              color: item.diasNaFila > 10
                                ? 'var(--tfd-status-danger)'
                                : item.diasNaFila > 5
                                  ? 'var(--tfd-status-warning)'
                                  : 'var(--tfd-text-primary)',
                            }}
                          >
                            {item.diasNaFila}d
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
                            <Link
                              href={`/solicitacoes/${item.solicitacaoId}`}
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Ver processo completo"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye size={16} />
                            </Link>
                            {!aguardandoRetorno && (
                              <button
                                className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                                title="Devolver"
                                onClick={(e) => { e.stopPropagation(); setDevolverItem(item); }}
                              >
                                <SendHorizonal size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ========== Análise / Decisão Drawer ========== */}
      <Drawer
        open={!!selectedItem}
        onClose={() => setSelectedId(null)}
        title="Análise e Decisão"
        subtitle={selectedItem ? `${selectedItem.numeroProcesso} — ${selectedItem.pacienteNome}` : ''}
        width="480px"
      >
        {selectedItem && (
          <DetailPanel
            item={selectedItem}
            onClose={() => setSelectedId(null)}
            canalOptions={canalOptions}
            canalLoading={canalLoading}
            onDecisionWithCobranca={async (tipoRota, destinatario, canal, contatoCanal, dataEnvio, conteudo) => {
              // 1. Create the routing decision
              const rotaResult = await criarRotaRegulacao({
                solicitacao_id: selectedItem.solicitacaoId,
                tipo_rota: tipoRota,
                responsavel_id: user?.id,
                status_espera: 'AGUARDANDO',
              } as any);
              if (rotaResult.error) {
                toast.error('Erro na decisão', (rotaResult.error as any).message);
                return;
              }
              // 2. Create the cobrança linked to the rota
              const cobResult = await criarCobrancaExterna({
                rota_regulacao_id: rotaResult.data.id,
                destinatario,
                canal,
                contato_canal: contatoCanal || null,
                data_envio: new Date(dataEnvio + 'T00:00:00').toISOString(),
                conteudo_envio: conteudo || null,
              } as any);
              if (cobResult.error) {
                toast.error('Erro ao registrar cobrança', (cobResult.error as any).message);
                // Rota was created but cobrança failed — still refresh
              }
              const msgs: Record<string, string> = {
                CNRAC: 'Processo encaminhado ao CNRAC com proposta registrada.',
                SETI: 'Processo encaminhado ao SETI com proposta registrada.',
                RESPOSTA_EXTERNA: 'Consulta enviada ao SAAS/Dutra com proposta registrada.',
                SERVICO_SOCIAL: 'Processo encaminhado ao Serviço Social com proposta registrada.',
              };
              toast.success('Encaminhamento registrado!', msgs[tipoRota] ?? `Processo ${selectedItem.numeroProcesso} atualizado.`);
              setSelectedId(null);
              refresh();
            }}
            onDecision={async (tipoRota: string) => {
              // Special case: INDEFERIDO goes directly to status update
              if (tipoRota === 'INDEFERIDO') {
                const result = await atualizarStatus(selectedItem.solicitacaoId, 'INDEFERIDO' as any);
                if (result.error) {
                  toast.error('Erro ao indeferir', (result.error as any).message);
                } else {
                  toast.success('Solicitação indeferida', `Processo ${selectedItem.numeroProcesso} foi indeferido.`);
                  setSelectedId(null);
                  refresh();
                }
                return;
              }
              const result = await criarRotaRegulacao({
                solicitacao_id: selectedItem.solicitacaoId,
                tipo_rota: tipoRota,
                responsavel_id: user?.id,
                status_espera: 'AGUARDANDO',
              } as any);
              if (result.error) {
                toast.error('Erro na decisão', (result.error as any).message);
              } else {
                const msgs: Record<string, string> = {
                  APROVADO_DIRETO: 'Processo aprovado e encaminhado para agendamento.',
                };
                toast.success('Decisão registrada!', msgs[tipoRota] ?? `Processo ${selectedItem.numeroProcesso} atualizado.`);
                setSelectedId(null);
                refresh();
              }
            }}
          />
        )}
      </Drawer>

      {/* ========== Devolver Modal ========== */}
      <DevolverModal
        open={!!devolverItem}
        onClose={() => setDevolverItem(null)}
        setorAtual="REGULACAO"
        solicitacaoId={devolverItem?.solicitacaoId ?? ''}
        statusAtual={(devolverItem?.solicitacaoStatus as StatusSolicitacao) ?? 'AGUARDANDO_REGULACAO'}
        label={`${devolverItem?.numeroProcesso ?? ''} — ${devolverItem?.pacienteNome ?? 'Paciente'}`}
        onSuccess={() => { refresh(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />
    </>
  );
}

/* ================================================== */
/*  Detail Panel                                       */
/* ================================================== */

function DetailPanel({
  item,
  onClose,
  onDecision,
  onDecisionWithCobranca,
  canalOptions,
  canalLoading,
}: {
  item: RegulacaoItem;
  onClose: () => void;
  onDecision: (tipoRota: string) => Promise<void>;
  onDecisionWithCobranca: (tipoRota: string, destinatario: string, canal: string, contatoCanal: string, dataEnvio: string, conteudo: string) => Promise<void>;
  canalOptions: { value: string; label: string }[];
  canalLoading: boolean;
}) {
  const [deciding, setDeciding] = useState(false);

  // Pending route — when user picks a route, show cobrança form before confirming
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [cobDestinatario, setCobDestinatario] = useState('');
  const [cobCanal, setCobCanal] = useState('');
  const [cobContatoCanal, setCobContatoCanal] = useState('');
  const [cobDataEnvio, setCobDataEnvio] = useState(new Date().toISOString().split('T')[0]);
  const [cobConteudo, setCobConteudo] = useState('');

  async function handleDecision(tipo: string) {
    setDeciding(true);
    await onDecision(tipo);
    setDeciding(false);
  }

  const prio = prioridadeMap[item.prioridade];

  const rotaDestinatarioMap: Record<string, string> = {
    CNRAC: 'CNRAC',
    SETI: 'SETI',
    RESPOSTA_EXTERNA: 'SAAS/Hospital Dutra',
    SERVICO_SOCIAL: 'Serviço Social',
  };

  const rotaLabelMap: Record<string, string> = {
    CNRAC: 'Encaminhar para CNRAC',
    SETI: 'Encaminhar para SETI',
    RESPOSTA_EXTERNA: 'Consultar SAAS/Dutra',
    SERVICO_SOCIAL: 'Encaminhar ao Serviço Social',
  };

  function startRoute(tipo: string) {
    setPendingRoute(tipo);
    setCobDestinatario(rotaDestinatarioMap[tipo] ?? '');
    setCobCanal('');
    setCobContatoCanal('');
    setCobDataEnvio(new Date().toISOString().split('T')[0]);
    setCobConteudo('');
  }

  function cancelRoute() {
    setPendingRoute(null);
    setCobDestinatario('');
    setCobCanal('');
    setCobContatoCanal('');
    setCobConteudo('');
  }

  return (
    <div className="space-y-4">
      {/* ---- Patient Summary ---- */}
      <div className="tfd-card">
        <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Resumo do Paciente
        </h3>

        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              {item.pacienteNome}
            </p>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
              CPF: {formatCPF(item.pacienteCpf)}
            </p>
          </div>

          {item.prioridade !== 'NORMAL' && (
            <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: prio.bg, color: prio.text }}>
              {prio.label}
            </span>
          )}

          <div
            className="flex items-center gap-4 pt-2 mt-2 text-sm"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <div>
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>CID-10</span>
              <p className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{item.cidCodigo}</p>
            </div>
            <div className="flex-1">
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Descrição</span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{item.cidDescricao}</p>
            </div>
          </div>

          <div
            className="flex items-center gap-4 pt-2 mt-1 text-sm"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <div>
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dias na fila</span>
              <p className="font-semibold" style={{
                color: item.diasNaFila > 10 ? 'var(--tfd-status-danger)' : item.diasNaFila > 5 ? 'var(--tfd-status-warning)' : 'var(--tfd-text-primary)',
              }}>
                {item.diasNaFila} dias
              </p>
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Processo</span>
              <Link
                href={`/solicitacoes/${item.solicitacaoId}`}
                className="flex items-center gap-1 text-sm font-medium hover:underline"
                style={{ color: 'var(--tfd-primary-500)' }}
              >
                {item.numeroProcesso}
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Medical Opinion (read-only) ---- */}
      {item.parecerMedico && (
        <div className="tfd-card">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope size={16} style={{ color: 'var(--tfd-primary-500)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Parecer Médico</h3>
          </div>
          <div className="space-y-2">
            <span
              className="tfd-tag tfd-tag--rounded tfd-tag--dot"
              style={{
                backgroundColor: item.parecerMedico.status === 'DEFERIDO' ? '#DCFCE7' : '#FEE2E2',
                color: item.parecerMedico.status === 'DEFERIDO' ? '#15803D' : '#B91C1C',
              }}
            >
              {item.parecerMedico.status === 'DEFERIDO' ? 'Deferido' : 'Indeferido'}
            </span>
            <p className="text-sm"><strong style={{ color: 'var(--tfd-text-primary)' }}>{item.parecerMedico.medico}</strong></p>
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--tfd-surface-50)', color: 'var(--tfd-text-secondary)' }}>
              {item.parecerMedico.observacoes}
            </div>
          </div>
        </div>
      )}

      {/* ---- Decision Card ---- */}
      <div className="tfd-card">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Decisão</h3>

        {pendingRoute ? (
          /* ===== Prontos: rota selecionada → formulário de cobrança/proposta ===== */
          <div className="space-y-3">
            <div className="tfd-message tfd-message--info">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Send size={14} />
              </span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                <strong>{rotaLabelMap[pendingRoute]}</strong> — preencha os dados do encaminhamento/proposta antes de confirmar.
              </p>
            </div>

            <FormField label="Destinatário" required>
              <input
                type="text"
                className="tfd-input tfd-input--sm"
                placeholder="Ex: CNRAC, SETI, Hospital Dutra..."
                value={cobDestinatario}
                onChange={(e) => setCobDestinatario(e.target.value)}
              />
            </FormField>

            <FormField label="Canal de envio" required>
              <select
                className="tfd-input tfd-input--sm"
                disabled={canalLoading}
                value={cobCanal}
                onChange={(e) => { setCobCanal(e.target.value); setCobContatoCanal(''); }}
              >
                <option value="">{canalLoading ? 'Carregando...' : 'Selecione...'}</option>
                {canalOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            {cobCanal && (
              <FormField label={cobCanal === 'EMAIL' ? 'E-mail de contato' : cobCanal === 'SISTEMA' ? 'Identificação no sistema' : 'Número de contato'} required>
                {cobCanal === 'EMAIL' ? (
                  <input
                    type="email"
                    className="tfd-input tfd-input--sm"
                    placeholder="contato@orgao.gov.br"
                    value={cobContatoCanal}
                    onChange={(e) => setCobContatoCanal(e.target.value)}
                  />
                ) : cobCanal === 'SISTEMA' ? (
                  <input
                    type="text"
                    className="tfd-input tfd-input--sm"
                    placeholder="Ex: Protocolo CNRAC nº 12345"
                    value={cobContatoCanal}
                    onChange={(e) => setCobContatoCanal(e.target.value)}
                  />
                ) : (
                  <input
                    type="tel"
                    className="tfd-input tfd-input--sm"
                    placeholder="(00) 00000-0000"
                    value={cobContatoCanal}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                      if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
                      else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                      else if (v.length > 0) v = `(${v}`;
                      setCobContatoCanal(v);
                    }}
                  />
                )}
              </FormField>
            )}

            <FormField label="Data de envio" required>
              <input
                type="date"
                className="tfd-input tfd-input--sm"
                value={cobDataEnvio}
                onChange={(e) => setCobDataEnvio(e.target.value)}
              />
            </FormField>

            <FormField label="Conteúdo da proposta / Resumo">
              <textarea
                className="tfd-input tfd-input--sm"
                rows={3}
                placeholder="Descreva a proposta enviada, dados do paciente encaminhados, etc."
                value={cobConteudo}
                onChange={(e) => setCobConteudo(e.target.value)}
              />
            </FormField>

            <div className="flex gap-2 pt-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1"
                onClick={cancelRoute}
              >
                Voltar
              </button>
              <button
                className="tfd-btn tfd-btn-primary tfd-btn--sm flex-1"
                disabled={deciding || !cobDestinatario || !cobCanal || !cobContatoCanal}
                onClick={async () => {
                  setDeciding(true);
                  await onDecisionWithCobranca(pendingRoute, cobDestinatario, cobCanal, cobContatoCanal, cobDataEnvio, cobConteudo);
                  setDeciding(false);
                }}
              >
                <Send size={14} />
                {deciding ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        ) : (
          /* ===== Prontos para análise: botões de roteamento ===== */
          <div className="space-y-2">
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm w-full" disabled={deciding} onClick={() => handleDecision('APROVADO_DIRETO')}>
              <CheckCircle2 size={14} />
              {deciding ? 'Processando...' : 'Aprovar Diretamente'}
            </button>
            <button
              className="tfd-btn tfd-btn-outline tfd-btn--sm w-full"
              style={{ borderColor: '#1D4ED8', color: '#1D4ED8' }}
              onClick={() => startRoute('CNRAC')}
            >
              <Building2 size={14} />
              Encaminhar CNRAC
            </button>
            <button
              className="tfd-btn tfd-btn-outline tfd-btn--sm w-full"
              style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
              onClick={() => startRoute('SETI')}
            >
              <Heart size={14} />
              Encaminhar SETI
            </button>
            <button
              className="tfd-btn tfd-btn-outline tfd-btn--sm w-full"
              style={{ borderColor: '#C2410C', color: '#C2410C' }}
              onClick={() => startRoute('RESPOSTA_EXTERNA')}
            >
              <ExternalLink size={14} />
              Consultar SAAS/Dutra
            </button>
            <button
              className="tfd-btn tfd-btn-outline tfd-btn--sm w-full"
              style={{ borderColor: '#92400E', color: '#92400E' }}
              onClick={() => startRoute('SERVICO_SOCIAL')}
            >
              <Users size={14} />
              Encaminhar Serviço Social
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
