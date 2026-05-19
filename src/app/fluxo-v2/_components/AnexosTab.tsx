'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownUp, FileText, Paperclip, Sparkles, ExternalLink } from 'lucide-react';
import { useLookup } from '@/shared/hooks/useLookup';
import { buscarPorSolicitacao } from '@/services/despachos-financeiros.service';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import {
  agregarAnexos,
  ordenarAnexos,
  ORIGEM_ANEXO_LABEL,
  type AnexoUnificado,
  type OrigemAnexo,
} from '../_utils/anexosUnificados';

/**
 * Aba "Anexos" — agregação unificada de todos os documentos vinculados
 * à solicitação, anexados manualmente ou gerados pelo sistema.
 *
 * Adição de novos anexos continua nos drawers de origem (abertura, adicional,
 * passagem). Esta aba é puramente de visualização/consulta.
 */
export default function AnexosTab({ s }: { s: SolicitacaoMock }) {
  const { options: tiposDocOptions } = useLookup('tipo_documento');
  const [ordemDesc, setOrdemDesc] = useState(true);
  const [filtroOrigem, setFiltroOrigem] = useState<OrigemAnexo | 'todas'>('todas');
  const [despachos, setDespachos] = useState<Array<{ id: string; numero?: string | null; createdAt: string }>>([]);

  // Mapa código → label dos tipos de documento (lookup `tipo_documento`)
  const catalogo = useMemo(() => {
    const m = new Map<string, string>();
    for (const opt of tiposDocOptions) m.set(opt.value, opt.label);
    return m;
  }, [tiposDocOptions]);

  // Carrega despachos vinculados (eles vivem no Supabase, não no state local)
  useEffect(() => {
    let cancelled = false;
    buscarPorSolicitacao(s.id)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const d = data as { id: string; created_at: string; numero_sei?: string | null };
        setDespachos([{ id: d.id, numero: d.numero_sei, createdAt: d.created_at }]);
      })
      .catch(() => {
        /* prototype — falha silenciosa */
      });
    return () => { cancelled = true; };
  }, [s.id]);

  const todos = useMemo(
    () => agregarAnexos(s, { tiposDocumentoCatalogo: catalogo, despachos }),
    [s, catalogo, despachos],
  );

  const filtrados = useMemo(() => {
    const base = filtroOrigem === 'todas' ? todos : todos.filter((a) => a.origem === filtroOrigem);
    return ordenarAnexos(base, ordemDesc);
  }, [todos, filtroOrigem, ordemDesc]);

  const contagemPorOrigem = useMemo(() => {
    const c: Record<OrigemAnexo | 'todas', number> = {
      todas: todos.length,
      abertura: 0, edicao: 0, adicional: 0, passagem: 0, parecer: 0, despacho: 0,
    };
    for (const a of todos) c[a.origem]++;
    return c;
  }, [todos]);

  if (todos.length === 0) {
    return <EmptyState />;
  }

  const origensDisponiveis: Array<OrigemAnexo | 'todas'> = [
    'todas',
    ...(Object.keys(ORIGEM_ANEXO_LABEL) as OrigemAnexo[]).filter((o) => contagemPorOrigem[o] > 0),
  ];

  return (
    <div>
      {/* Toolbar — filtros + ordenação */}
      <div
        className="flex items-center justify-between gap-3 flex-wrap mb-4 px-4 py-3"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
        }}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {origensDisponiveis.map((o) => {
            const ativo = filtroOrigem === o;
            const label = o === 'todas' ? 'Todos' : ORIGEM_ANEXO_LABEL[o];
            const count = contagemPorOrigem[o];
            return (
              <button
                key={o}
                type="button"
                onClick={() => setFiltroOrigem(o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                style={{
                  background: ativo ? '#146BFA' : 'transparent',
                  color: ativo ? 'white' : '#475569',
                  border: ativo ? '1px solid #146BFA' : '1px solid #E2E8F0',
                  borderRadius: 8,
                }}
              >
                {label}
                <span
                  className="font-mono text-[11px]"
                  style={{ color: ativo ? 'rgba(255,255,255,0.85)' : '#94A3B8' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setOrdemDesc((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-[#F8FAFC]"
          style={{
            background: 'transparent',
            color: '#475569',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
          }}
          title={ordemDesc ? 'Ordenando do mais recente ao mais antigo' : 'Ordenando do mais antigo ao mais recente'}
        >
          <ArrowDownUp size={13} strokeWidth={2.2} />
          {ordemDesc ? 'Mais recente primeiro' : 'Mais antigo primeiro'}
        </button>
      </div>

      {/* Tabela de anexos */}
      <div
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          className="grid items-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{
            gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.4fr) 130px 130px 40px',
            gap: 12,
            color: '#9CA3AF',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <span>Documento</span>
          <span>Tipo</span>
          <span>Origem</span>
          <span>Data</span>
          <span aria-hidden />
        </div>
        <ul>
          {filtrados.map((a) => (
            <li key={a.id}>
              <AnexoRow a={a} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AnexoRow({ a }: { a: AnexoUnificado }) {
  const conteudo = (
    <div
      className="grid items-center px-4 py-3 text-[13px] transition-colors hover:bg-[#F8FAFC]"
      style={{
        gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.4fr) 130px 130px 40px',
        gap: 12,
        borderBottom: '1px solid #F1F5F9',
        cursor: 'pointer',
      }}
    >
      <div className="min-w-0 flex items-center gap-2">
        {a.geradoPeloSistema ? (
          <Sparkles size={14} style={{ color: '#146BFA', flexShrink: 0 }} aria-label="Gerado pelo sistema" />
        ) : (
          <Paperclip size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
        )}
        <span className="truncate" style={{ color: '#1A1D2B', fontWeight: 500 }}>{a.nome}</span>
      </div>
      <span className="truncate" style={{ color: '#475569' }}>{a.tipoDocumento}</span>
      <OrigemBadge origem={a.origem} />
      <span className="font-mono text-[12px]" style={{ color: '#64748B' }}>
        {new Date(a.data).toLocaleDateString('pt-BR')}
      </span>
      <span aria-hidden style={{ color: '#94A3B8', justifySelf: 'end' }}>
        {a.rotaInterna ? <ExternalLink size={13} /> : <FileText size={13} />}
      </span>
    </div>
  );

  if (a.rotaInterna) {
    return (
      <Link href={a.rotaInterna} target="_blank" rel="noopener noreferrer">
        {conteudo}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.alert(`Abrir/baixar anexo: ${a.nome}`);
        }
      }}
      className="w-full text-left"
    >
      {conteudo}
    </button>
  );
}

function OrigemBadge({ origem }: { origem: OrigemAnexo }) {
  const styles: Record<OrigemAnexo, { bg: string; fg: string; bd: string }> = {
    abertura:  { bg: '#EFF6FF', fg: '#1D4ED8', bd: '#BFDBFE' },
    edicao:    { bg: '#F1F5F9', fg: '#475569', bd: '#E2E8F0' },
    adicional: { bg: '#FFFBEB', fg: '#92400E', bd: '#FDE68A' },
    passagem:  { bg: '#ECFDF5', fg: '#047857', bd: '#A7F3D0' },
    parecer:   { bg: '#F5F3FF', fg: '#6D28D9', bd: '#DDD6FE' },
    despacho:  { bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA' },
  };
  const st = styles[origem];
  return (
    <span
      className="inline-flex items-center px-2 py-[2px] text-[11px] font-semibold uppercase"
      style={{
        background: st.bg,
        color: st.fg,
        border: `1px solid ${st.bd}`,
        borderRadius: 6,
        letterSpacing: '0.04em',
        width: 'fit-content',
      }}
    >
      {ORIGEM_ANEXO_LABEL[origem]}
    </span>
  );
}

function EmptyState() {
  return (
    <div
      className="text-center py-16"
      style={{
        background: 'white',
        border: '1px dashed #E2E8F0',
        borderRadius: 10,
      }}
    >
      <Paperclip size={28} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
      <p className="text-[14px] font-medium" style={{ color: '#1A1D2B' }}>Nenhum anexo nesta solicitação</p>
      <p className="text-[12.5px] mt-1.5" style={{ color: '#6B7280', maxWidth: 380, margin: '6px auto 0' }}>
        Documentos anexados na abertura, em adicionais, passagens, ou gerados pelo sistema
        (parecer médico, despacho financeiro) aparecem aqui automaticamente.
      </p>
    </div>
  );
}
