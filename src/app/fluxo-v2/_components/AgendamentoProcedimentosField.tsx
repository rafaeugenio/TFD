'use client';

import { ExternalLink, CalendarPlus, Trash2 } from 'lucide-react';
import { type TipoProcedimento } from '@/core/mocks/fluxo-v2-v3-seed';

/**
 * Componente compartilhado de "Agendamento": seleção da unidade de saúde de
 * destino + lista repetível de procedimentos agendados (tipo + data),
 * permitindo cadastrar vários agendamentos na mesma unidade.
 *
 * Extraído de `solicitacoes/_NewSolicitacaoDrawer.tsx` para ser reaproveitado
 * também no cadastro de agendamento feito pela Regulação — as duas telas
 * usam exatamente o mesmo formulário.
 */

export interface AgendamentoLinha {
  id: string;
  tipoProcedimento: TipoProcedimento | '';
  data: string;
}

export function novaLinhaAgendamento(): AgendamentoLinha {
  return {
    id: `ag-${Math.random().toString(36).slice(2, 9)}`,
    tipoProcedimento: '',
    data: '',
  };
}

export interface UnidadeAgendamentoRow {
  id: string;
  nome: string;
  cnes: string | null;
  cidade: string;
  uf: string;
}

interface TipoProcedimentoOption {
  codigo: string;
  nome: string;
}

interface Props {
  unidadeId: string;
  onUnidadeIdChange: (id: string) => void;
  unidades: UnidadeAgendamentoRow[];
  loadingUnidades: boolean;
  linhas: AgendamentoLinha[];
  onLinhasChange: (linhas: AgendamentoLinha[]) => void;
  tiposProcedimento: TipoProcedimentoOption[];
  loadingTiposProc: boolean;
}

export default function AgendamentoProcedimentosField({
  unidadeId,
  onUnidadeIdChange,
  unidades,
  loadingUnidades,
  linhas,
  onLinhasChange,
  tiposProcedimento,
  loadingTiposProc,
}: Props) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* Unidade — compartilhada entre todos os procedimentos */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: '#94A3B8' }}>
            Selecione a unidade cadastrada
          </span>
          <a
            href="/unidades-saude"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] inline-flex items-center gap-1 hover:underline flex-shrink-0"
            style={{ color: 'var(--tfd-blue)' }}
          >
            <ExternalLink size={11} />
            Cadastrar nova unidade
          </a>
        </div>
        <select
          value={unidadeId}
          onChange={(e) => onUnidadeIdChange(e.target.value)}
          disabled={loadingUnidades}
          className="w-full px-3 py-2 text-[13px] min-w-0"
          style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
        >
          <option value="">
            {loadingUnidades
              ? 'Carregando unidades...'
              : unidades.length === 0
                ? 'Nenhuma unidade fora do Maranhão cadastrada — clique em "Cadastrar nova unidade"'
                : 'Selecione a unidade de saúde (fora do Maranhão)...'}
          </option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
              {u.cnes ? ` — CNES ${u.cnes}` : ''}
              {u.cidade ? ` (${u.cidade}${u.uf ? `/${u.uf}` : ''})` : ''}
            </option>
          ))}
        </select>
        <p className="text-[10.5px]" style={{ color: '#94A3B8' }}>
          O agendamento do TFD é sempre em unidade fora do Maranhão — o destino do tratamento.
        </p>
      </div>

      {/* Lista repetível de Procedimento + Data — múltiplos agendamentos na
          mesma unidade. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px]" style={{ color: '#94A3B8' }}>
          Procedimentos agendados {linhas.length > 1 ? `(${linhas.length})` : ''}
        </span>
        {linhas.map((linha, idx) => (
          <div
            key={linha.id}
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) 32px' }}
          >
            <select
              value={linha.tipoProcedimento}
              disabled={loadingTiposProc}
              onChange={(e) =>
                onLinhasChange(
                  linhas.map((l, i) =>
                    i === idx
                      ? { ...l, tipoProcedimento: e.target.value as TipoProcedimento | '' }
                      : l,
                  ),
                )
              }
              className="px-3 py-2 text-[13px]"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            >
              <option value="">
                {loadingTiposProc
                  ? 'Carregando tipos...'
                  : tiposProcedimento.length === 0
                    ? 'Nenhum tipo cadastrado'
                    : 'Tipo do procedimento...'}
              </option>
              {tiposProcedimento.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.nome}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={linha.data}
              onChange={(e) =>
                onLinhasChange(linhas.map((l, i) => (i === idx ? { ...l, data: e.target.value } : l)))
              }
              className="px-3 py-2 text-[13px]"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={() =>
                onLinhasChange(linhas.length === 1 ? [novaLinhaAgendamento()] : linhas.filter((_, i) => i !== idx))
              }
              className="tfd-btn tfd-btn--text tfd-btn--sm tfd-btn--icon-only"
              title={linhas.length === 1 ? 'Limpar' : 'Remover este agendamento'}
              aria-label="Remover agendamento"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onLinhasChange([...linhas, novaLinhaAgendamento()])}
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
          <CalendarPlus size={13} />
          Adicionar agendamento
        </button>
      </div>
    </div>
  );
}
