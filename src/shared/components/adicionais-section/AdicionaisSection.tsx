'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, CheckCircle2, XCircle, Trash2, FileText, Wallet, Upload } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { formatCurrency, formatDate, maskCurrency, parseCurrency } from '@/shared/pipes/formatters';
import {
  listarAdicionaisPorSolicitacao,
  criarAdicional,
  aprovarAdicional,
  indeferirAdicional,
  excluirAdicional,
  listarHistoricoAdicional,
  CATEGORIA_ADICIONAL_LABELS,
  STATUS_ADICIONAL_LABELS,
} from '@/services/adicionais.service';
import type { CategoriaAdicional, StatusAdicional } from '@/lib/supabase/database.types';
import { uploadDocumento } from '@/services/documentos.service';

interface AdicionaisSectionProps {
  solicitacaoId: string;
}

const STATUS_STYLE: Record<StatusAdicional, { bg: string; text: string }> = {
  PENDENTE_APROVACAO: { bg: '#FEF3C7', text: '#92400E' },
  APROVADO: { bg: '#DCFCE7', text: '#15803D' },
  INDEFERIDO: { bg: '#FEE2E2', text: '#B91C1C' },
  PAGO: { bg: '#DBEAFE', text: '#1D4ED8' },
};

type InlineAction =
  | { type: 'aprovar'; id: string }
  | { type: 'indeferir'; id: string }
  | { type: 'excluir'; id: string }
  | { type: 'historico'; id: string }
  | null;

export default function AdicionaisSection({ solicitacaoId }: AdicionaisSectionProps) {
  const toast = useToast();
  const { user: currentUser } = useCurrentUser();

  const [adicionais, setAdicionais] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Novo adicional form
  const [novoCategoria, setNovoCategoria] = useState<CategoriaAdicional>('PASSAGEM_EXTRA');
  const [novoDescricao, setNovoDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novoData, setNovoData] = useState('');
  const [novoJustificativa, setNovoJustificativa] = useState('');
  const [novoDocFile, setNovoDocFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline actions
  const [inlineAction, setInlineAction] = useState<InlineAction>(null);
  const [indeferirMotivo, setIndeferirMotivo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  const carregar = useCallback(async () => {
    if (!solicitacaoId) return;
    setLoading(true);
    const { data } = await listarAdicionaisPorSolicitacao(solicitacaoId);
    setAdicionais((data as any[]) ?? []);
    setLoading(false);
  }, [solicitacaoId]);

  useEffect(() => { carregar(); }, [carregar]);

  function resetNovoForm() {
    setAdding(false);
    setNovoCategoria('PASSAGEM_EXTRA');
    setNovoDescricao('');
    setNovoValor('');
    setNovoData('');
    setNovoJustificativa('');
    setNovoDocFile(null);
  }

  function resetInline() {
    setInlineAction(null);
    setIndeferirMotivo('');
    setActionLoading(false);
    setHistorico([]);
  }

  async function handleSalvarNovo() {
    if (!novoDescricao.trim()) { toast.error('Obrigatório', 'Descreva o adicional.'); return; }
    if (!novoValor) { toast.error('Obrigatório', 'Informe o valor.'); return; }
    if (!novoData) { toast.error('Obrigatório', 'Informe a data de ocorrência.'); return; }
    if (!novoDocFile) { toast.error('Documento obrigatório', 'PA3: anexe o comprovante.'); return; }
    if (!currentUser) { toast.error('Usuário inválido', 'Sessão expirada.'); return; }

    setSaving(true);
    try {
      // 1) Upload do documento comprobatório primeiro
      const docResult = await uploadDocumento(solicitacaoId, novoDocFile, 'OUTROS');
      if (docResult.error) {
        toast.error('Erro ao anexar documento', (docResult.error as any).message ?? 'Tente novamente.');
        setSaving(false);
        return;
      }

      // 2) Cria o adicional referenciando o documento
      const { error } = await criarAdicional({
        solicitacao_id: solicitacaoId,
        categoria: novoCategoria,
        descricao: novoDescricao,
        valor: parseCurrency(novoValor),
        data_ocorrencia: novoData,
        documento_id: (docResult.data as any)?.id ?? null,
        status: 'PENDENTE_APROVACAO',
        justificativa_solicitacao: novoJustificativa || null,
        criado_por: currentUser.id,
      });

      if (error) {
        toast.error('Erro ao salvar', (error as any).message ?? 'Tente novamente.');
      } else {
        toast.success('Adicional registrado!', 'Aguardando aprovação da coordenação/médico.');
        resetNovoForm();
        carregar();
      }
    } catch (e: any) {
      toast.error('Erro inesperado', e.message ?? 'Tente novamente.');
    }
    setSaving(false);
  }

  async function handleAprovar(id: string) {
    if (!currentUser) return;
    setActionLoading(true);
    const { error } = await aprovarAdicional(id, currentUser.id, currentUser.perfil);
    if (error) toast.error('Erro', (error as any).message);
    else toast.success('Aprovado!', 'Entrará no próximo relatório de faturamento.');
    resetInline();
    carregar();
  }

  async function handleIndeferir(id: string) {
    if (!indeferirMotivo.trim()) { toast.error('Obrigatório', 'Informe o motivo.'); return; }
    if (!currentUser) return;
    setActionLoading(true);
    const { error } = await indeferirAdicional(id, currentUser.id, currentUser.perfil, indeferirMotivo);
    if (error) toast.error('Erro', (error as any).message);
    else toast.success('Indeferido', 'Decisão registrada.');
    resetInline();
    carregar();
  }

  async function handleExcluir(id: string) {
    setActionLoading(true);
    const { error } = await excluirAdicional(id);
    if (error) toast.error('Erro', (error as any).message);
    else toast.success('Excluído', 'Registro removido.');
    resetInline();
    carregar();
  }

  async function handleAbrirHistorico(id: string) {
    setInlineAction({ type: 'historico', id });
    setActionLoading(true);
    const { data } = await listarHistoricoAdicional(id);
    setHistorico((data as any[]) ?? []);
    setActionLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
          <Wallet size={14} className="inline mr-1.5" />
          Adicionais
        </h3>
        {!adding && (
          <button type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={() => setAdding(true)}>
            <Plus size={14} /> Novo
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
        </div>
      ) : adicionais.length === 0 && !adding ? (
        <p className="text-xs mb-4" style={{ color: 'var(--tfd-text-muted)' }}>Nenhum adicional registrado</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {adicionais.map((a: any) => {
            const style = STATUS_STYLE[a.status as StatusAdicional] ?? STATUS_STYLE.PENDENTE_APROVACAO;
            const isTarget = inlineAction?.id === a.id;
            return (
              <div key={a.id} className="rounded-lg px-3 py-2.5" style={{ border: `1px solid ${isTarget ? 'var(--tfd-primary-300)' : 'var(--tfd-surface-border)'}`, backgroundColor: isTarget ? 'var(--tfd-primary-50)' : 'var(--tfd-surface-50)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                        {CATEGORIA_ADICIONAL_LABELS[a.categoria as CategoriaAdicional] ?? a.categoria}
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
                        {formatCurrency(a.valor)}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{a.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: 'var(--tfd-text-muted)' }}>
                        {formatDate(a.data_ocorrencia)}
                      </span>
                      {a.documentos && (
                        <span className="text-[10px] inline-flex items-center gap-0.5" style={{ color: '#15803D' }}>
                          <FileText size={10} /> comprovante
                        </span>
                      )}
                      {a.numero_relatorio && (
                        <span className="text-[10px] font-semibold px-1 py-0.5 rounded" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
                          Rel: {a.numero_relatorio}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="tfd-tag tfd-tag--rounded shrink-0" style={{ backgroundColor: style.bg, color: style.text, fontSize: '0.6rem' }}>
                    {STATUS_ADICIONAL_LABELS[a.status as StatusAdicional] ?? a.status}
                  </span>
                </div>

                {a.justificativa_decisao && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                    Decisão: {a.justificativa_decisao}
                  </p>
                )}

                {/* Actions */}
                {!isTarget && (
                  <div className="flex items-center gap-1.5 pt-2 mt-2" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                    {a.status === 'PENDENTE_APROVACAO' && (
                      <>
                        <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: 'var(--tfd-status-success)', color: 'white', fontSize: '0.65rem', padding: '2px 6px' }} onClick={() => setInlineAction({ type: 'aprovar', id: a.id })}>
                          <CheckCircle2 size={11} /> Aprovar
                        </button>
                        <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '0.65rem', padding: '2px 6px' }} onClick={() => setInlineAction({ type: 'indeferir', id: a.id })}>
                          <XCircle size={11} /> Indeferir
                        </button>
                        <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: 'transparent', color: '#B91C1C', fontSize: '0.65rem', padding: '2px 6px' }} onClick={() => setInlineAction({ type: 'excluir', id: a.id })}>
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                    <button type="button" className="tfd-btn tfd-btn--sm tfd-btn-ghost" style={{ fontSize: '0.65rem', padding: '2px 6px' }} onClick={() => handleAbrirHistorico(a.id)}>
                      <FileText size={11} /> Histórico
                    </button>
                  </div>
                )}

                {/* Inline: Aprovar */}
                {isTarget && inlineAction?.type === 'aprovar' && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--tfd-primary-200)' }}>
                    <p className="text-xs mb-2" style={{ color: 'var(--tfd-text-primary)' }}>
                      Confirmar aprovação de <strong>{formatCurrency(a.valor)}</strong>?
                    </p>
                    <div className="flex gap-2">
                      <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInline}>Cancelar</button>
                      <button className="tfd-btn tfd-btn--sm flex-1" style={{ backgroundColor: 'var(--tfd-status-success)', color: 'white' }} disabled={actionLoading} onClick={() => handleAprovar(a.id)}>
                        {actionLoading ? 'Aprovando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline: Indeferir */}
                {isTarget && inlineAction?.type === 'indeferir' && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid #FCA5A5' }}>
                    <textarea className="tfd-input mb-2" rows={2} placeholder="Motivo do indeferimento..." value={indeferirMotivo} onChange={(e) => setIndeferirMotivo(e.target.value)} autoFocus />
                    <div className="flex gap-2">
                      <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInline}>Cancelar</button>
                      <button className="tfd-btn tfd-btn--sm flex-1" style={{ background: '#EF4444', color: 'white' }} disabled={actionLoading || !indeferirMotivo.trim()} onClick={() => handleIndeferir(a.id)}>
                        {actionLoading ? 'Indeferindo...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline: Excluir */}
                {isTarget && inlineAction?.type === 'excluir' && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid #FCA5A5' }}>
                    <p className="text-xs mb-2" style={{ color: '#B91C1C' }}>Excluir este adicional permanentemente?</p>
                    <div className="flex gap-2">
                      <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInline}>Cancelar</button>
                      <button className="tfd-btn tfd-btn--sm flex-1" style={{ background: '#EF4444', color: 'white' }} disabled={actionLoading} onClick={() => handleExcluir(a.id)}>
                        {actionLoading ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline: Histórico (AU1/AU2) */}
                {isTarget && inlineAction?.type === 'historico' && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--tfd-primary-200)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                        Histórico de Alterações
                      </p>
                      <button className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={resetInline}>Fechar</button>
                    </div>
                    {actionLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : historico.length === 0 ? (
                      <p className="text-[10px]" style={{ color: 'var(--tfd-text-muted)' }}>Sem registros de auditoria.</p>
                    ) : (
                      <div className="space-y-1">
                        {historico.map((log: any) => (
                          <div key={log.id} className="text-[10px] p-1.5 rounded" style={{ backgroundColor: 'white', border: '1px solid var(--tfd-surface-border)' }}>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                                {log.campo_alterado ?? log.acao}
                              </span>
                              <span style={{ color: 'var(--tfd-text-muted)' }}>
                                {log.timestamp ? new Date(log.timestamp).toLocaleString('pt-BR') : '—'}
                              </span>
                            </div>
                            {log.campo_alterado && (
                              <div>
                                <span className="line-through" style={{ color: '#DC2626' }}>{log.valor_anterior || '—'}</span>
                                <span className="mx-1" style={{ color: 'var(--tfd-text-muted)' }}>→</span>
                                <span style={{ color: '#16A34A' }}>{log.valor_novo || '—'}</span>
                              </div>
                            )}
                            <div style={{ color: 'var(--tfd-text-muted)' }}>
                              por {log.usuarios?.nome_completo ?? '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form: Novo adicional */}
      {adding && (
        <div className="rounded-lg px-3 py-3 mb-2 space-y-2" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <p className="text-xs font-semibold" style={{ color: '#1D4ED8' }}>Novo Adicional</p>
          <FormField label="Categoria" required>
            <select className="tfd-input tfd-input--sm" value={novoCategoria} onChange={(e) => setNovoCategoria(e.target.value as CategoriaAdicional)}>
              {Object.entries(CATEGORIA_ADICIONAL_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Descrição" required>
            <input type="text" className="tfd-input tfd-input--sm" placeholder="Ex: Taxa de bagagem extra vôo de retorno" value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Valor" required>
              <input type="text" className="tfd-input tfd-input--sm" placeholder="R$ 0,00" value={novoValor} onChange={(e) => setNovoValor(maskCurrency(e.target.value))} />
            </FormField>
            <FormField label="Data" required>
              <input type="date" className="tfd-input tfd-input--sm" value={novoData} onChange={(e) => setNovoData(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Justificativa">
            <textarea className="tfd-input tfd-input--sm" rows={2} placeholder="Por que este adicional é necessário?" value={novoJustificativa} onChange={(e) => setNovoJustificativa(e.target.value)} />
          </FormField>
          <FormField label="Documento comprobatório (PA3)" required>
            <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer" style={{ borderColor: novoDocFile ? '#16A34A' : 'var(--tfd-surface-border)', backgroundColor: novoDocFile ? '#F0FDF4' : 'white' }}>
              <Upload size={14} style={{ color: novoDocFile ? '#16A34A' : 'var(--tfd-primary-500)' }} />
              <span className="text-xs" style={{ color: novoDocFile ? '#15803D' : 'var(--tfd-primary-600)' }}>
                {novoDocFile ? novoDocFile.name : 'Selecionar arquivo (obrigatório)'}
              </span>
              <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setNovoDocFile(e.target.files?.[0] ?? null)} />
            </label>
          </FormField>
          <div className="flex gap-2 pt-1">
            <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={saving} onClick={resetNovoForm}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm flex-1" disabled={saving} onClick={handleSalvarNovo}>
              {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando...</> : 'Registrar Adicional'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
