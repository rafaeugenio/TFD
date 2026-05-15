'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { buscarPorId, atualizarDespacho } from '@/services/despachos-financeiros.service';

interface Props {
  despachoId: string;
  onClose: () => void;
}

export default function EditarDespachoDrawer({ despachoId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [numeroSEI, setNumeroSEI] = useState('');
  const [texto, setTexto] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      const { data } = await buscarPorId(despachoId);
      if (!cancelado && data) {
        setNumeroSEI((data.numero_sei as string | null) ?? '');
        setTexto((data.texto_despacho as string | null) ?? '');
        setObservacoes((data.observacoes as string | null) ?? '');
      }
      if (!cancelado) setLoading(false);
    })();
    return () => { cancelado = true; };
  }, [despachoId]);

  async function salvar() {
    setSaving(true);
    await atualizarDespacho(despachoId, {
      numero_sei: numeroSEI.trim() || null,
      texto_despacho: texto.trim() || null,
      observacoes: observacoes.trim() || null,
    });
    setSaving(false);
    // Recarrega a página para refletir as mudanças renderizadas server-side
    window.location.reload();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 12, width: 'min(640px, 92vw)', padding: 24, maxHeight: '90vh', overflow: 'auto' }}
      >
        <h3 className="text-[18px] font-semibold mb-1" style={{ color: '#1A1D2B' }}>
          Editar despacho financeiro
        </h3>
        <p className="text-[12px] mb-4" style={{ color: '#6B7280' }}>
          Edite o texto, número SEI e observações. A versão impressa é atualizada
          automaticamente após salvar.
        </p>

        {/* Aviso template */}
        <div
          className="flex items-start gap-2 px-3 py-2 mb-4"
          style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8 }}
        >
          <AlertTriangle size={14} style={{ color: '#92400E', flexShrink: 0, marginTop: 2 }} />
          <span className="text-[11px] font-medium" style={{ color: '#92400E' }}>
            Aguardando template oficial do TFD/SES. Por enquanto o texto é livre —
            substitua aqui quando o template for fornecido.
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8" style={{ color: '#94A3B8' }}>
            <Loader2 size={16} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : (
          <>
            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
              Processo SEI (opcional)
            </label>
            <input
              type="text"
              placeholder="0000.0000/2026-00"
              value={numeroSEI}
              onChange={(e) => setNumeroSEI(e.target.value)}
              className="w-full px-3 py-2 text-[13px] mb-3"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />

            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
              Texto do despacho
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={10}
              placeholder="Texto do despacho (aguardando template oficial)…"
              className="w-full px-3 py-2 text-[13px] mb-3"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, fontFamily: 'inherit', lineHeight: 1.6 }}
            />

            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-[13px] mb-4"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="tfd-btn tfd-btn-ghost tfd-btn--sm"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={loading || saving}
            className="tfd-btn tfd-btn-primary tfd-btn--sm"
          >
            {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
