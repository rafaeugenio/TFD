'use client';

import { Hash, Plus, Trash2 } from 'lucide-react';
import { novoProcessoSeiId } from '../_utils/processoSei';

/**
 * Campo repetível de "Processo SEI": a solicitação acumula processos novos
 * ao longo do tratamento (um por mês, tipicamente, quando o paciente fica
 * em acompanhamento por vários meses). O último item da lista é sempre o
 * vigente. Mesmo padrão de lista acumulável do `AgendamentoProcedimentosField`.
 */

export interface ProcessoSeiLinha {
  id: string;
  numero: string;
  url: string;
}

export function novaLinhaProcessoSei(): ProcessoSeiLinha {
  return { id: novoProcessoSeiId(), numero: '', url: '' };
}

interface Props {
  linhas: ProcessoSeiLinha[];
  onLinhasChange: (linhas: ProcessoSeiLinha[]) => void;
}

export default function ProcessosSeiField({ linhas, onLinhasChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px]" style={{ color: '#94A3B8' }}>
        {linhas.length > 1
          ? `Processos SEI (${linhas.length}) — o último da lista é o vigente`
          : 'Número e link do processo'}
      </span>
      {linhas.map((linha, idx) => {
        const urlInvalida = linha.url.trim().length > 0 && !/^https?:\/\//i.test(linha.url.trim());
        const vigente = idx === linhas.length - 1 && linhas.length > 1;
        return (
          <div key={linha.id} className="flex flex-col gap-1">
            <div
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr) 32px' }}
            >
              <input
                value={linha.numero}
                onChange={(e) =>
                  onLinhasChange(
                    linhas.map((l, i) => (i === idx ? { ...l, numero: e.target.value } : l)),
                  )
                }
                placeholder="ex.: 00100.000456/2026-12"
                className="px-3 py-2 text-[13px] font-mono"
                style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
              />
              <input
                value={linha.url}
                onChange={(e) =>
                  onLinhasChange(linhas.map((l, i) => (i === idx ? { ...l, url: e.target.value } : l)))
                }
                placeholder="https://sei.ses.ma.gov.br/processo/..."
                className="px-3 py-2 text-[13px]"
                style={{
                  background: 'white',
                  border: `1px solid ${urlInvalida ? '#FCA5A5' : 'var(--tfd-surface-border)'}`,
                  borderRadius: 8,
                }}
              />
              <button
                type="button"
                onClick={() =>
                  onLinhasChange(
                    linhas.length === 1 ? [novaLinhaProcessoSei()] : linhas.filter((_, i) => i !== idx),
                  )
                }
                className="tfd-btn tfd-btn--text tfd-btn--sm tfd-btn--icon-only"
                title={linhas.length === 1 ? 'Limpar' : 'Remover este processo'}
                aria-label="Remover processo SEI"
              >
                <Trash2 size={13} />
              </button>
            </div>
            {urlInvalida && (
              <p className="text-[11px]" style={{ color: '#B91C1C' }}>
                URL inválida — comece com http:// ou https://
              </p>
            )}
            {vigente && (
              <p className="text-[10.5px]" style={{ color: '#146BFA' }}>
                Vigente — é este que aparece no cabeçalho da solicitação.
              </p>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onLinhasChange([...linhas, novaLinhaProcessoSei()])}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 mt-1 text-[12.5px] font-medium transition-colors"
        style={{
          background: '#F8FAFC',
          border: '1px dashed #CBD5E1',
          borderRadius: 8,
          color: '#146BFA',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#EFF6FF';
          e.currentTarget.style.borderColor = '#146BFA';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#F8FAFC';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
      >
        <Hash size={13} />
        <Plus size={13} style={{ marginLeft: -6 }} />
        Adicionar processo SEI
      </button>
    </div>
  );
}
