'use client';

import { useRef, useState } from 'react';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormSection from '@/shared/components/drawer/FormSection';
import { useLookup } from '@/shared/hooks/useLookup';

interface ArquivoSelecionado {
  nome: string;
  tipo: string;
  tipoDocumento?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onEnviar: (itens: ArquivoSelecionado[]) => void;
}

/**
 * Envio de anexo avulso — disponível a qualquer momento a partir da aba
 * Anexos, independentemente do setor em que a solicitação estiver. Pede o
 * tipo do anexo, como já acontece nos outros pontos de upload do sistema
 * (`NewSolicitacaoDrawer`, `NewEditarSolicitacaoDrawer`).
 */
export default function EnviarAnexoDrawer({ open, onClose, onEnviar }: Props) {
  const { options: tiposDocumento } = useLookup('tipo_documento');
  const [arquivos, setArquivos] = useState<ArquivoSelecionado[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setArquivos([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const novos = Array.from(files).map((f) => ({
      nome: f.name,
      tipo: f.type || 'application/octet-stream',
    }));
    setArquivos((prev) => [...prev, ...novos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleEnviar() {
    if (arquivos.length === 0) return;
    onEnviar(arquivos);
    reset();
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Enviar anexo"
      subtitle="O anexo entra na solicitação a partir de agora, independentemente do setor atual."
      width="min(560px, 95vw)"
      footer={
        <>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={() => { reset(); onClose(); }}>
            Cancelar
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            disabled={arquivos.length === 0}
            onClick={handleEnviar}
          >
            Enviar {arquivos.length > 1 ? `(${arquivos.length})` : ''}
          </button>
        </>
      }
    >
      <FormSection title="Arquivos" icon={<Paperclip size={12} />} hint="Selecione um ou mais arquivos e informe o tipo de cada um.">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFilesPicked(e.target.files)}
          className="hidden"
          aria-hidden
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-1 py-5 transition-colors"
          style={{
            background: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            borderRadius: 8,
            color: '#475569',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#146BFA'; e.currentTarget.style.background = '#EFF6FF'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
        >
          <Upload size={16} />
          <span className="text-[13px] font-medium">Selecionar arquivos</span>
          <span className="text-[11px]" style={{ color: '#94A3B8' }}>
            Pode selecionar mais de um arquivo de uma vez.
          </span>
        </button>

        {arquivos.length > 0 && (
          <ul className="flex flex-col gap-1.5 mt-3">
            {arquivos.map((a, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2 px-3 py-2 text-[13px]"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}
              >
                <Paperclip size={13} style={{ color: '#64748B' }} />
                <span className="flex-1 min-w-0 truncate" style={{ color: '#1A1D2B' }}>
                  {a.nome}
                </span>
                <select
                  value={a.tipoDocumento ?? ''}
                  onChange={(e) => {
                    const v = e.target.value || undefined;
                    setArquivos((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, tipoDocumento: v } : it)),
                    );
                  }}
                  className="px-2 py-1 text-[12px] shrink-0"
                  style={{
                    background: 'white',
                    border: '1px solid var(--tfd-surface-border)',
                    borderRadius: 6,
                    maxWidth: 220,
                  }}
                  title="Tipo do documento"
                >
                  <option value="">Tipo do documento...</option>
                  {tiposDocumento.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setArquivos((prev) => prev.filter((_, i) => i !== idx))}
                  className="tfd-btn tfd-btn--text tfd-btn--sm tfd-btn--icon-only"
                  aria-label="Remover"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FormSection>
    </Drawer>
  );
}
