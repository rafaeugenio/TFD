'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, Loader2, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { buscarTimeline } from '@/services/auditoria.service';

interface TrilhaAuditoriaProps {
  solicitacaoId: string;
  /** Máximo de registros exibidos sem expandir. Default 5. */
  initialLimit?: number;
}

const ENTIDADE_LABEL: Record<string, string> = {
  solicitacoes: 'Solicitação',
  diagnosticos_clinicos: 'Diagnóstico',
  pareceres_medicos: 'Parecer Médico',
  regulacoes: 'Regulação',
  agendamentos: 'Agendamento',
  viagens: 'Passagem',
  ajuda_custo: 'Ajuda de Custo',
  permanencias: 'Permanência',
  prorrogacoes: 'Prorrogação',
  adicionais: 'Adicional',
  encerramentos: 'Encerramento',
  documentos: 'Documento',
};

const PERFIL_LABEL: Record<string, string> = {
  COORDENADOR: 'Coordenador',
  MEDICO: 'Médico',
  ASSISTENTE_SOCIAL: 'Assistente Social',
  JURIDICO: 'Jurídico',
  ADMIN: 'Administrador',
  REGULADOR: 'Regulador',
  AGENTE: 'Agente',
};

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return ts;
  }
}

export default function TrilhaAuditoria({ solicitacaoId, initialLimit = 5 }: TrilhaAuditoriaProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filtroEntidade, setFiltroEntidade] = useState<string>('');

  const carregar = useCallback(async () => {
    if (!solicitacaoId) return;
    setLoading(true);
    const { data } = await buscarTimeline(solicitacaoId);
    // Ordem reversa: mais recente primeiro
    const ordered = ((data as any[]) ?? []).slice().reverse();
    setLogs(ordered);
    setLoading(false);
  }, [solicitacaoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const entidadesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) set.add(l.entidade_alterada);
    return Array.from(set).sort();
  }, [logs]);

  const filtrados = useMemo(() => {
    if (!filtroEntidade) return logs;
    return logs.filter((l) => l.entidade_alterada === filtroEntidade);
  }, [logs, filtroEntidade]);

  const visiveis = expanded ? filtrados : filtrados.slice(0, initialLimit);

  return (
    <div className="tfd-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--tfd-text-primary)' }}>
          <Shield size={14} />
          Trilha de Auditoria
        </h3>
        <span className="text-[10px]" style={{ color: 'var(--tfd-text-muted)' }}>
          {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {entidadesDisponiveis.length > 1 && (
        <div className="flex items-center gap-1.5 mb-2">
          <Filter size={11} style={{ color: 'var(--tfd-text-muted)' }} />
          <select
            className="tfd-input tfd-input--sm"
            style={{ fontSize: '0.65rem', padding: '2px 6px' }}
            value={filtroEntidade}
            onChange={(e) => setFiltroEntidade(e.target.value)}
          >
            <option value="">Todas as entidades</option>
            {entidadesDisponiveis.map((ent) => (
              <option key={ent} value={ent}>{ENTIDADE_LABEL[ent] ?? ent}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
          Sem registros de auditoria ainda.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            {visiveis.map((log: any) => (
              <div
                key={log.id}
                className="text-[11px] p-2 rounded"
                style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                    {ENTIDADE_LABEL[log.entidade_alterada] ?? log.entidade_alterada}
                    {log.campo_alterado && <span style={{ color: 'var(--tfd-text-secondary)' }}> — {log.campo_alterado}</span>}
                  </span>
                  <span className="shrink-0 text-[9px]" style={{ color: 'var(--tfd-text-muted)' }}>
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>

                {log.campo_alterado && (log.valor_anterior || log.valor_novo) && (
                  <div className="mt-1 text-[10px]">
                    <span className="line-through" style={{ color: '#DC2626' }}>
                      {log.valor_anterior || '—'}
                    </span>
                    <span className="mx-1" style={{ color: 'var(--tfd-text-muted)' }}>→</span>
                    <span style={{ color: '#16A34A' }}>{log.valor_novo || '—'}</span>
                  </div>
                )}

                {!log.campo_alterado && (
                  <p className="mt-0.5 text-[10px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                    {log.acao}
                  </p>
                )}

                <p className="mt-1 text-[9px]" style={{ color: 'var(--tfd-text-muted)' }}>
                  por {log.usuarios?.nome_completo ?? '—'}
                  {log.perfil_usuario && <span> ({PERFIL_LABEL[log.perfil_usuario] ?? log.perfil_usuario})</span>}
                </p>
              </div>
            ))}
          </div>

          {filtrados.length > initialLimit && (
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost tfd-btn--sm w-full mt-2"
              style={{ fontSize: '0.65rem' }}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <><ChevronUp size={11} /> Recolher</>
              ) : (
                <><ChevronDown size={11} /> Ver todos ({filtrados.length})</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
