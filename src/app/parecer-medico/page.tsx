'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Stethoscope,
  User,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  ChevronRight,
  SendHorizonal,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarSolicitacoesPendentes, criarParecer } from '@/services/pareceres.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import type { DecisaoParecer, TipoDocumento, StatusSolicitacao } from '@/lib/supabase/database.types';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function formatCPF(cpf: string): string {
  if (!cpf) return '—';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const docTypeLabels: Record<string, string> = {
  LAUDO_MEDICO: 'Laudo Médico',
  EXAME: 'Exame',
  DOCUMENTO_PESSOAL: 'Doc. Pessoal',
  COMPROVANTE_RESIDENCIA: 'Comp. Residência',
  CARTAO_SUS: 'Cartão SUS',
  ENCAMINHAMENTO: 'Encaminhamento',
  OUTROS: 'Outros',
};

const prioridadeStyle: Record<string, { bg: string; text: string; label: string }> = {
  NORMAL: { bg: '#F0F2F8', text: '#6B7280', label: 'Normal' },
  URGENTE: { bg: '#FEF3C7', text: '#92400E', label: 'Urgente' },
  EMERGENCIAL: { bg: '#FEE2E2', text: '#B91C1C', label: 'Emergencial' },
};

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function ParecerMedicoPage() {
  const toast = useToast();
  const { user: currentUser } = useCurrentUser();
  const [search, setSearch] = useState('');

  /* ---- Data fetch ---- */
  const { data: solicitacoes, loading, refresh } = useSupabaseData(
    () => listarSolicitacoesPendentes({ search }),
    [search],
  );

  /* ---- Drawer state ---- */
  const [selectedSol, setSelectedSol] = useState<any>(null);
  const [decisao, setDecisao] = useState<DecisaoParecer | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [autorizaAcompanhante, setAutorizaAcompanhante] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ---- Devolver state ---- */
  const [devolverSol, setDevolverSol] = useState<any>(null);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('PARECER_MEDICO');

  function handleOpenParecer(sol: any) {
    setSelectedSol(sol);
    setDecisao('');
    setObservacoes('');
    setAutorizaAcompanhante(false);
  }

  function handleCloseParecer() {
    setSelectedSol(null);
    setDecisao('');
    setObservacoes('');
    setAutorizaAcompanhante(false);
  }

  async function handleSubmitParecer() {
    if (!selectedSol) return;

    if (!decisao) {
      toast.warning('Campo obrigatório', 'Selecione a decisão do parecer.');
      return;
    }

    if (!observacoes.trim()) {
      toast.warning('Campo obrigatório', 'Justifique a decisão do parecer.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await criarParecer({
        solicitacao_id: selectedSol.id,
        medico_auditor_id: currentUser?.id,
        decisao,
        observacoes_medicas: observacoes.trim(),
        autoriza_acompanhante: autorizaAcompanhante,
      });

      if (result.error) {
        toast.error('Erro ao registrar parecer', (result.error as any).message);
        setSubmitting(false);
        return;
      }

      const labels: Record<string, string> = {
        DEFERIDO: 'aprovada e encaminhada à Regulação',
        INDEFERIDO: 'indeferida',
        EXIGENCIA: 'devolvida com exigências',
      };

      toast.success('Parecer registrado!', `Solicitação ${labels[decisao]}.`);
      handleCloseParecer();
      refresh();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
    setSubmitting(false);
  }

  const pac = selectedSol?.pacientes;

  return (
    <>
      <PageHeader
        title="Parecer Médico"
        subtitle="Solicitações aguardando análise e decisão do médico auditor"
      />

      {/* ========== Summary ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}>
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Aguardando Parecer</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{solicitacoes.length}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Urgentes / Emergenciais</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-danger)' }}>
              {solicitacoes.filter((s: any) => s.prioridade === 'URGENTE' || s.prioridade === 'EMERGENCIAL').length}
            </p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#EBF0FF', color: '#4361EE' }}>
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Com Documentos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              {solicitacoes.filter((s: any) => (s.documentos ?? []).length > 0).length}
            </p>
          </div>
        </div>
      </div>

      {/* ========== Search ========== */}
      <div className="tfd-toolbar mb-4">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search size={16} className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }} />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar por processo ou paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Nº Processo</th>
                <th>Paciente</th>
                <th className="hidden md:table-cell">CID</th>
                <th className="hidden md:table-cell">Documentos</th>
                <th className="hidden lg:table-cell">Prioridade</th>
                <th className="hidden lg:table-cell">Data Solicitação</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                  </td>
                </tr>
              ) : solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 size={32} style={{ color: 'var(--tfd-status-success)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        Nenhuma solicitação pendente
                      </p>
                      <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                        Todas as solicitações foram analisadas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                solicitacoes.map((sol: any) => {
                  const prio = prioridadeStyle[sol.prioridade] ?? prioridadeStyle.NORMAL;
                  const docsCount = (sol.documentos ?? []).length;
                  const aguardandoRetorno = labelDestino(sol.id);

                  return (
                    <tr key={sol.id} style={{ opacity: aguardandoRetorno ? 0.5 : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined }}>
                      <td>
                        <Link
                          href={`/solicitacoes/${sol.id}`}
                          className="font-medium text-sm hover:underline"
                          style={{ color: 'var(--tfd-primary-500)' }}
                        >
                          {sol.numero_processo}
                        </Link>
                      </td>
                      <td className="max-w-[180px] truncate font-medium">
                        <div className="flex flex-col gap-0.5">
                          <span>{sol.pacientes?.nome_completo ?? '—'}</span>
                          {aguardandoRetorno && (
                            <span
                              className="tfd-tag tfd-tag--rounded"
                              style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.625rem' }}
                            >
                              Ag. retorno — {aguardandoRetorno}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell">
                        {sol.cid10_principal ? (
                          <code className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-primary)', fontFamily: 'var(--tfd-font-mono)' }}>
                            {sol.cid10_principal}
                          </code>
                        ) : (
                          <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-sm" style={{ color: docsCount > 0 ? 'var(--tfd-text-primary)' : 'var(--tfd-text-muted)' }}>
                          {docsCount} {docsCount === 1 ? 'documento' : 'documentos'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: prio.bg, color: prio.text }}>
                          {prio.label}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatDate(sol.created_at)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="tfd-btn tfd-btn-primary tfd-btn--sm"
                            onClick={() => handleOpenParecer(sol)}
                          >
                            <Stethoscope size={14} />
                            Analisar
                          </button>
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Devolver"
                            onClick={() => setDevolverSol(sol)}
                          >
                            <SendHorizonal size={15} />
                          </button>
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

      {/* ========== Parecer Drawer ========== */}
      <Drawer
        open={!!selectedSol}
        onClose={handleCloseParecer}
        title={`Parecer — ${selectedSol?.numero_processo ?? ''}`}
        subtitle={pac?.nome_completo ?? ''}
        width="580px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseParecer}>
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={handleSubmitParecer}
              disabled={submitting}
            >
              {submitting ? 'Registrando...' : 'Registrar Parecer'}
            </button>
          </>
        }
      >
        {selectedSol && (
          <>
            {/* ── Dados do Paciente ── */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              <User size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
              Dados do Paciente
            </h3>
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--tfd-text-secondary)' }}>Nome</span>
                <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{pac?.nome_completo ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--tfd-text-secondary)' }}>CPF</span>
                <span style={{ color: 'var(--tfd-text-primary)', fontFamily: 'var(--tfd-font-mono)' }}>{formatCPF(pac?.cpf ?? '')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--tfd-text-secondary)' }}>CNS</span>
                <span style={{ color: 'var(--tfd-text-primary)', fontFamily: 'var(--tfd-font-mono)' }}>{pac?.cns ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--tfd-text-secondary)' }}>Município</span>
                <span style={{ color: 'var(--tfd-text-primary)' }}>{pac?.municipio ?? '—'}</span>
              </div>
            </div>

            <hr className="tfd-divider" />

            {/* ── Diagnóstico ── */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              <Stethoscope size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
              Diagnóstico
            </h3>
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--tfd-text-secondary)' }}>CID-10</span>
                <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {selectedSol.cid10_principal ?? '—'}
                  {selectedSol.cid10_secundario ? ` / ${selectedSol.cid10_secundario}` : ''}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--tfd-text-secondary)' }}>Procedimento</span>
                <span style={{ color: 'var(--tfd-text-primary)' }}>{selectedSol.tipo_procedimento ?? '—'}</span>
              </div>
              {selectedSol.descricao_diagnostico && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>Descrição</p>
                  <p className="text-sm leading-relaxed p-2.5 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-primary)' }}>
                    {selectedSol.descricao_diagnostico}
                  </p>
                </div>
              )}
              {selectedSol.justificativa_tfd && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>Justificativa TFD</p>
                  <p className="text-sm leading-relaxed p-2.5 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-primary)' }}>
                    {selectedSol.justificativa_tfd}
                  </p>
                </div>
              )}
            </div>

            <hr className="tfd-divider" />

            {/* ── Documentos ── */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              <FileText size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
              Documentos ({(selectedSol.documentos ?? []).length})
            </h3>
            {(selectedSol.documentos ?? []).length === 0 ? (
              <p className="text-sm py-3 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhum documento anexado.
              </p>
            ) : (
              <div className="space-y-1.5 mb-4">
                {(selectedSol.documentos ?? []).map((doc: any) => (
                  <a
                    key={doc.id}
                    href={doc.url_arquivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2 rounded-lg transition-colors duration-150"
                    style={{ textDecoration: 'none', color: 'var(--tfd-text-primary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-100)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded shrink-0"
                      style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}>
                      <FileText size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.nome_arquivo}</p>
                      <p className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
                        {docTypeLabels[doc.tipo as TipoDocumento] ?? doc.tipo}
                      </p>
                    </div>
                    <ExternalLink size={13} style={{ color: 'var(--tfd-text-muted)' }} />
                  </a>
                ))}
              </div>
            )}

            <hr className="tfd-divider" />

            {/* ── Decisão do Parecer ── */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              <CheckCircle2 size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
              Decisão do Parecer
            </h3>

            <FormField label="Decisão" required>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    border: decisao === 'DEFERIDO' ? '2px solid #10B981' : '1px solid #E8ECF4',
                    backgroundColor: decisao === 'DEFERIDO' ? '#ECFDF5' : 'white',
                    color: decisao === 'DEFERIDO' ? '#059669' : '#6B7280',
                  }}
                  onClick={() => setDecisao('DEFERIDO')}
                >
                  <CheckCircle2 size={16} />
                  Aprovar
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-150"
                  style={{
                    border: decisao === 'INDEFERIDO' ? '2px solid #EF4444' : '1px solid #E8ECF4',
                    backgroundColor: decisao === 'INDEFERIDO' ? '#FEF2F2' : 'white',
                    color: decisao === 'INDEFERIDO' ? '#DC2626' : '#6B7280',
                  }}
                  onClick={() => setDecisao('INDEFERIDO')}
                >
                  <XCircle size={16} />
                  Reprovar
                </button>
              </div>
            </FormField>

            {selectedSol.necessidade_acompanhante && decisao === 'DEFERIDO' && (
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autorizaAcomp"
                  checked={autorizaAcompanhante}
                  onChange={(e) => setAutorizaAcompanhante(e.target.checked)}
                  style={{ accentColor: 'var(--tfd-primary-500)' }}
                />
                <label htmlFor="autorizaAcomp" className="tfd-label" style={{ marginBottom: 0 }}>
                  Autorizar acompanhante
                </label>
              </div>
            )}

            <FormField
              label={decisao === 'DEFERIDO' ? 'Justificativa da aprovação' : decisao === 'INDEFERIDO' ? 'Motivo da reprovação' : 'Observações do parecer'}
              required
            >
              <textarea
                className="tfd-input"
                rows={4}
                placeholder={
                  decisao === 'DEFERIDO'
                    ? 'Descreva por que a solicitação foi aprovada...'
                    : decisao === 'INDEFERIDO'
                      ? 'Descreva o motivo da reprovação...'
                      : 'Selecione a decisão acima para prosseguir...'
                }
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </FormField>
          </>
        )}
      </Drawer>

      {/* ========== Devolver Modal ========== */}
      <DevolverModal
        open={!!devolverSol}
        onClose={() => setDevolverSol(null)}
        setorAtual="PARECER_MEDICO"
        solicitacaoId={devolverSol?.id ?? ''}
        statusAtual={(devolverSol?.status as StatusSolicitacao) ?? 'NOVO'}
        label={`${devolverSol?.numero_processo ?? ''} — ${devolverSol?.pacientes?.nome_completo ?? 'Paciente'}`}
        onSuccess={() => { refresh(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />
    </>
  );
}
