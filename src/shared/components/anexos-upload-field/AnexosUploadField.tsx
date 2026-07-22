'use client';

import { useEffect, useRef, useState } from 'react';
import { Paperclip, Trash2, Upload, ExternalLink } from 'lucide-react';
import FormSection from '@/shared/components/drawer/FormSection';
import { listarPorCategoria } from '@/services/tabelas-auxiliares.service';

/**
 * Item de anexo armazenado em estado local. Quando o caller submete o form,
 * deve transformar isso no shape final esperado pelo backend / mock (incluindo
 * URL real do storage, tamanho etc.). Aqui só guardamos o suficiente pra UI.
 */
export interface AnexoLocal {
  nome: string;
  /** MIME type vindo do File.type (ex.: "application/pdf"). */
  tipo: string;
  /** Código do tipo de documento (lookup `tipo_documento`). Opcional. */
  tipoDocumento?: string;
  /** File real, quando disponível — útil pra upload posterior. */
  file?: File;
}

interface TipoDocRow {
  codigo: string;
  nome: string;
}

interface Props {
  value: AnexoLocal[];
  onChange: (anexos: AnexoLocal[]) => void;
  /** Título da seção. Default: "Documentos anexos". */
  title?: string;
  /** Hint mostrado abaixo do título. Default genérico. */
  hint?: string;
  /** Tom visual do FormSection. Default: 'info'. */
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Desabilita o upload (somente leitura). */
  disabled?: boolean;
}

/**
 * Bloco reutilizável de upload de anexos (botão "Selecionar arquivos" +
 * lista de arquivos com tipo de documento). Espelha o componente original
 * do `_NewSolicitacaoDrawer` para ser usado em qualquer drawer do fluxo
 * (parecer, passagem, ajuda de custo, carimbo, agendamento, tentativa,
 * adicional). Anexos ficam em estado local controlado pelo caller — fica
 * por conta dele juntar com a entidade no save.
 */
export default function AnexosUploadField({
  value,
  onChange,
  title = 'Documentos anexos',
  hint = 'Opcional — múltiplos arquivos permitidos.',
  tone = 'info',
  disabled = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocRow[]>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await listarPorCategoria('tipo_documento');
      if (cancel) return;
      setTiposDocumento(((data as { codigo: string; nome: string }[]) ?? []).map((r) => ({ codigo: r.codigo, nome: r.nome })));
    })();
    return () => {
      cancel = true;
    };
  }, []);

  function handleFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const novos: AnexoLocal[] = Array.from(files).map((f) => ({
      nome: f.name,
      tipo: f.type || 'application/octet-stream',
      file: f,
    }));
    onChange([...value, ...novos]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <FormSection
      title={title}
      icon={<Paperclip size={12} />}
      tone={tone}
      hint={hint}
      disabled={disabled}
      action={
        <a
          href="/sistema/configuracoes"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] inline-flex items-center gap-1 hover:underline"
          style={{ color: 'var(--tfd-blue)' }}
        >
          <ExternalLink size={11} />
          Cadastrar novo tipo
        </a>
      }
    >
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
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#146BFA';
          e.currentTarget.style.background = '#EFF6FF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#CBD5E1';
          e.currentTarget.style.background = '#F8FAFC';
        }}
      >
        <Upload size={16} />
        <span className="text-[13px] font-medium">Selecionar arquivos</span>
        <span className="text-[11px]" style={{ color: '#94A3B8' }}>
          Selecione um ou mais arquivos. Pode adicionar mais depois.
        </span>
      </button>

      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-3">
          {value.map((a, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 px-3 py-2 text-[13px]"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6 }}
            >
              <Paperclip size={13} style={{ color: '#64748B', flexShrink: 0 }} />
              <span className="flex-1 min-w-0 truncate" style={{ color: '#1A1D2B' }}>
                {a.nome}
              </span>
              <select
                value={a.tipoDocumento ?? ''}
                onChange={(e) => {
                  const v = e.target.value || undefined;
                  onChange(value.map((it, i) => (i === idx ? { ...it, tipoDocumento: v } : it)));
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
                  <option key={t.codigo} value={t.codigo}>
                    {t.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
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
  );
}
