'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownUp, FileText, Paperclip, Plus, Sparkles, ExternalLink, Trash2 } from 'lucide-react';
import { useLookup } from '@/shared/hooks/useLookup';
import { useToast } from '@/shared/components/toast/Toast';
import { buscarPorSolicitacao } from '@/services/despachos-financeiros.service';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import EnviarAnexoDrawer from './drawers/EnviarAnexoDrawer';
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
 * Envio e exclusão avulsos acontecem direto nesta aba, a qualquer momento
 * do fluxo (botão "Enviar anexo" + lixeira em cada linha removível).
 * Anexos de outros pontos do fluxo (abertura, adicional, passagem, parecer,
 * despacho) continuam só listados aqui.
 */
export default function AnexosTab({ s }: { s: SolicitacaoMock }) {
  const { options: tiposDocOptions } = useLookup('tipo_documento');
  const { addAnexos, removerAnexo } = useFluxoV2State();
  const toast = useToast();
  const [ordemDesc, setOrdemDesc] = useState(true);
  const [enviarOpen, setEnviarOpen] = useState(false);
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

  const ordenados = useMemo(() => ordenarAnexos(todos, ordemDesc), [todos, ordemDesc]);

  function handleEnviar(itens: { nome: string; tipo: string; tipoDocumento?: string }[]) {
    addAnexos(s.id, itens, 'avulso');
    toast.success(
      itens.length > 1 ? 'Anexos enviados' : 'Anexo enviado',
      itens.length > 1 ? `${itens.length} arquivos adicionados` : itens[0]?.nome,
    );
  }

  function handleExcluir(a: AnexoUnificado) {
    if (typeof window !== 'undefined' && !window.confirm(`Excluir o anexo "${a.nome}"?`)) return;
    removerAnexo(s.id, a.id);
    toast.success('Anexo excluído', a.nome);
  }

  return (
    <div>
      {/* Toolbar — envio + ordenação (sem filtros: a lista é curta) */}
      <div
        className="flex items-center justify-between gap-3 flex-wrap mb-4 px-4 py-3"
        style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setEnviarOpen(true)}
          className="tfd-btn tfd-btn-primary tfd-btn--sm"
        >
          <Plus size={13} /> Enviar anexo
        </button>

        {todos.length > 0 && (
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
        )}
      </div>

      {todos.length === 0 ? (
        <EmptyState />
      ) : (
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
              gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.4fr) 130px 130px 64px',
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
            {ordenados.map((a) => (
              <li key={a.id}>
                <AnexoRow a={a} onExcluir={() => handleExcluir(a)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <EnviarAnexoDrawer open={enviarOpen} onClose={() => setEnviarOpen(false)} onEnviar={handleEnviar} />
    </div>
  );
}

function AnexoRow({ a, onExcluir }: { a: AnexoUnificado; onExcluir: () => void }) {
  function abrir() {
    if (typeof window === 'undefined') return;
    if (a.rotaInterna) {
      window.open(a.rotaInterna, '_blank', 'noopener,noreferrer');
    } else {
      window.alert(`Abrir/baixar anexo: ${a.nome}`);
    }
  }

  const icone = a.geradoPeloSistema ? (
    <Sparkles size={14} style={{ color: '#146BFA', flexShrink: 0 }} aria-label="Gerado pelo sistema" />
  ) : (
    <Paperclip size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
  );

  return (
    <div
      className="grid items-center px-4 py-3 text-[13px] transition-colors hover:bg-[#F8FAFC]"
      style={{
        gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.4fr) 130px 130px 68px',
        gap: 12,
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      {a.rotaInterna ? (
        <Link
          href={a.rotaInterna}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex items-center gap-2"
        >
          {icone}
          <span className="truncate" style={{ color: '#1A1D2B', fontWeight: 500 }}>{a.nome}</span>
        </Link>
      ) : (
        <button type="button" onClick={abrir} className="min-w-0 flex items-center gap-2 text-left">
          {icone}
          <span className="truncate" style={{ color: '#1A1D2B', fontWeight: 500 }}>{a.nome}</span>
        </button>
      )}
      <span className="truncate" style={{ color: '#475569' }}>{a.tipoDocumento}</span>
      <OrigemBadge origem={a.origem} />
      <span className="font-mono text-[12px]" style={{ color: '#64748B' }}>
        {new Date(a.data).toLocaleDateString('pt-BR')}
      </span>
      <span className="flex items-center gap-1 justify-self-end">
        <button
          type="button"
          onClick={abrir}
          title="Abrir/baixar anexo"
          aria-label="Abrir ou baixar anexo"
          className="tfd-btn tfd-btn--text tfd-btn--sm tfd-btn--icon-only"
          style={{ color: '#94A3B8' }}
        >
          {a.rotaInterna ? <ExternalLink size={13} /> : <FileText size={13} />}
        </button>
        {a.removivel && (
          <button
            type="button"
            onClick={onExcluir}
            title="Excluir anexo"
            aria-label="Excluir anexo"
            className="tfd-btn tfd-btn--text tfd-btn--sm tfd-btn--icon-only"
            style={{ color: '#DC2626' }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </span>
    </div>
  );
}

function OrigemBadge({ origem }: { origem: OrigemAnexo }) {
  const styles: Record<OrigemAnexo, { bg: string; fg: string; bd: string }> = {
    abertura:    { bg: '#EFF6FF', fg: '#1D4ED8', bd: '#BFDBFE' },
    edicao:      { bg: '#F1F5F9', fg: '#475569', bd: '#E2E8F0' },
    adicional:   { bg: '#FFFBEB', fg: '#92400E', bd: '#FDE68A' },
    passagem:    { bg: '#ECFDF5', fg: '#047857', bd: '#A7F3D0' },
    parecer:     { bg: '#F5F3FF', fg: '#6D28D9', bd: '#DDD6FE' },
    despacho:    { bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA' },
    agendamento: { bg: '#ECFEFF', fg: '#0E7490', bd: '#A5F3FC' },
    tentativa:   { bg: '#F1F5F9', fg: '#475569', bd: '#E2E8F0' },
    ajuda_custo: { bg: '#ECFDF5', fg: '#047857', bd: '#A7F3D0' },
    carimbo:     { bg: '#EEF2FF', fg: '#4338CA', bd: '#C7D2FE' },
    avulso:      { bg: '#F1F5F9', fg: '#334155', bd: '#E2E8F0' },
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
