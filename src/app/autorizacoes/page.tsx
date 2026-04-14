'use client';

/**
 * AZ1 — Caixa de entrada de autorizações da coordenação.
 *
 * Lista todas as solicitações de autorização (pendentes + histórico) e permite
 * à coordenadora aprovar ou negar cada uma com motivo. A decisão é registrada
 * em `log_auditoria` e também vira um evento na linha do tempo da solicitação
 * (AZ3) automaticamente.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Filter,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import {
  listarAutorizacoes,
  decidirAutorizacao,
  tipoAutorizacaoLabels,
  type AutorizacaoCoordenacao,
  type StatusAutorizacao,
} from '@/services/autorizacoes.service';
import { formatDateTime } from '@/shared/pipes/formatters';

const statusMeta: Record<StatusAutorizacao, { label: string; bg: string; color: string; icon: typeof Clock }> = {
  PENDENTE: { label: 'Pendente', bg: '#FEF3C7', color: '#92400E', icon: Clock },
  APROVADA: { label: 'Aprovada', bg: '#DCFCE7', color: '#15803D', icon: CheckCircle2 },
  NEGADA: { label: 'Negada', bg: '#FEE2E2', color: '#B91C1C', icon: XCircle },
};

export default function AutorizacoesPage() {
  const { user } = useCurrentUser();
  const [items, setItems] = useState<AutorizacaoCoordenacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<StatusAutorizacao | 'TODAS'>('PENDENTE');
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await listarAutorizacoes();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (filtro === 'TODAS') return items;
    return items.filter((it) => it.status === filtro);
  }, [items, filtro]);

  const pendCount = items.filter((it) => it.status === 'PENDENTE').length;
  const aproCount = items.filter((it) => it.status === 'APROVADA').length;
  const negCount = items.filter((it) => it.status === 'NEGADA').length;

  async function handleDecidir(item: AutorizacaoCoordenacao, decisao: 'APROVADA' | 'NEGADA') {
    if (!user) return;
    if (!motivo.trim()) return;
    if (!item.solicitacaoId) return;

    await decidirAutorizacao({
      logId: item.id,
      decisao,
      decisaoMotivo: motivo.trim(),
      decididoPorId: user.id,
      decididoPorPerfil: user.perfil ?? 'COORDENACAO_ESTADUAL',
      solicitacaoId: item.solicitacaoId,
    });

    setDecidingId(null);
    setMotivo('');
    reload();
  }

  return (
    <>
      <PageHeader
        title="Autorizações da Coordenação"
        subtitle="Caixa de entrada de exceções solicitadas pelos setores"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Pendentes</p>
            <p className="tfd-kpi-value tfd-number">{loading ? '—' : pendCount}</p>
            <p className="tfd-kpi-sub">aguardando decisão</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--amber">
            <Clock size={22} />
          </div>
        </div>
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Aprovadas</p>
            <p className="tfd-kpi-value tfd-number">{loading ? '—' : aproCount}</p>
            <p className="tfd-kpi-sub">no histórico</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--green">
            <CheckCircle2 size={22} />
          </div>
        </div>
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Negadas</p>
            <p className="tfd-kpi-value tfd-number">{loading ? '—' : negCount}</p>
            <p className="tfd-kpi-sub">no histórico</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--violet">
            <XCircle size={22} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="tfd-card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={14} style={{ color: 'var(--tfd-text-muted)' }} />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--tfd-text-secondary)' }}
          >
            Filtrar:
          </span>
          {(['PENDENTE', 'APROVADA', 'NEGADA', 'TODAS'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="tfd-btn tfd-btn--sm"
              onClick={() => setFiltro(f)}
              style={{
                backgroundColor:
                  filtro === f ? 'var(--tfd-primary-50)' : 'transparent',
                color:
                  filtro === f
                    ? 'var(--tfd-primary-700)'
                    : 'var(--tfd-text-secondary)',
                borderColor:
                  filtro === f ? 'var(--tfd-primary-200)' : 'transparent',
                fontWeight: filtro === f ? 600 : 400,
              }}
            >
              {f === 'TODAS' ? 'Todas' : statusMeta[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="tfd-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              size={24}
              className="animate-spin"
              style={{ color: 'var(--tfd-primary-500)' }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck
              size={36}
              className="mx-auto mb-2"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Nenhuma autorização {filtro !== 'TODAS' ? statusMeta[filtro as StatusAutorizacao].label.toLowerCase() : 'encontrada'}.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => {
              const meta = statusMeta[item.status];
              const StatusIcon = meta.icon;
              const isDeciding = decidingId === item.id;

              return (
                <li
                  key={item.id}
                  className="rounded-lg p-4"
                  style={{ border: '1px solid var(--tfd-surface-border)' }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          <StatusIcon size={11} />
                          {meta.label}
                        </span>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: 'var(--tfd-text-primary)' }}
                        >
                          {tipoAutorizacaoLabels[item.tipo]}
                        </span>
                        {item.numeroProcesso && item.solicitacaoId && (
                          <Link
                            href={`/solicitacoes/${item.solicitacaoId}`}
                            className="text-xs font-medium hover:underline"
                            style={{ color: 'var(--tfd-primary-500)' }}
                          >
                            {item.numeroProcesso}
                          </Link>
                        )}
                      </div>
                      {item.pacienteNome && (
                        <p
                          className="text-xs mb-1"
                          style={{ color: 'var(--tfd-text-muted)' }}
                        >
                          Paciente: {item.pacienteNome}
                        </p>
                      )}
                      <p
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: 'var(--tfd-text-secondary)' }}
                      >
                        {item.justificativa}
                      </p>
                      <p
                        className="text-[11px] mt-2"
                        style={{ color: 'var(--tfd-text-muted)' }}
                      >
                        Solicitado por {item.solicitadoPorNome ?? '—'} em{' '}
                        {formatDateTime(item.createdAt)}
                      </p>
                      {item.decisaoMotivo && (
                        <div
                          className="mt-2 p-2 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--tfd-surface-50)',
                            color: 'var(--tfd-text-secondary)',
                          }}
                        >
                          <span className="font-semibold">Decisão:</span>{' '}
                          {item.decisaoMotivo}
                          {item.decididoEm && (
                            <span
                              className="block mt-0.5"
                              style={{ color: 'var(--tfd-text-muted)' }}
                            >
                              em {formatDateTime(item.decididoEm)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {item.status === 'PENDENTE' && !isDeciding && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="tfd-btn tfd-btn-outline tfd-btn--sm"
                          onClick={() => {
                            setDecidingId(item.id);
                            setMotivo('');
                          }}
                          style={{
                            color: 'var(--tfd-status-success)',
                            borderColor: 'var(--tfd-status-success)',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          Aprovar
                        </button>
                        <button
                          type="button"
                          className="tfd-btn tfd-btn-outline tfd-btn--sm"
                          onClick={() => {
                            setDecidingId(item.id);
                            setMotivo('');
                          }}
                          style={{
                            color: 'var(--tfd-status-danger)',
                            borderColor: 'var(--tfd-status-danger)',
                          }}
                        >
                          <XCircle size={13} />
                          Negar
                        </button>
                      </div>
                    )}
                  </div>

                  {isDeciding && (
                    <div
                      className="mt-3 pt-3"
                      style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                    >
                      <label
                        className="text-xs font-medium block mb-1.5"
                        style={{ color: 'var(--tfd-text-secondary)' }}
                      >
                        Motivo da decisão
                      </label>
                      <textarea
                        className="tfd-input"
                        rows={2}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Registre o contexto da decisão…"
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button
                          type="button"
                          className="tfd-btn tfd-btn-ghost tfd-btn--sm"
                          onClick={() => {
                            setDecidingId(null);
                            setMotivo('');
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="tfd-btn tfd-btn--sm"
                          onClick={() => handleDecidir(item, 'NEGADA')}
                          disabled={!motivo.trim()}
                          style={{
                            backgroundColor: 'var(--tfd-status-danger)',
                            color: 'white',
                          }}
                        >
                          <XCircle size={13} />
                          Negar
                        </button>
                        <button
                          type="button"
                          className="tfd-btn tfd-btn-primary tfd-btn--sm"
                          onClick={() => handleDecidir(item, 'APROVADA')}
                          disabled={!motivo.trim()}
                        >
                          <CheckCircle2 size={13} />
                          Aprovar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
