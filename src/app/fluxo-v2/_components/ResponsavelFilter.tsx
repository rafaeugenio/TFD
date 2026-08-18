'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { SolicitacaoMock, ResponsavelSolicitacao } from '@/core/mocks/fluxo-v2-v3-seed';
import { SEM_RESPONSAVEL, RESPONSAVEL_FILTRO_VAZIO, type ResponsavelFiltroValue } from '../_utils/derivarResponsavel';

export { SEM_RESPONSAVEL, RESPONSAVEL_FILTRO_VAZIO, type ResponsavelFiltroValue } from '../_utils/derivarResponsavel';

interface Props {
  /** Base completa (não filtrada) usada para derivar as opções — mesma
   *  lógica de `RegiaoRegionalMunicipioFilter`, pra opção não sumir quando
   *  outro filtro já reduziu a lista visível. */
  solicitacoes: SolicitacaoMock[];
  value: ResponsavelFiltroValue;
  onChange: (value: ResponsavelFiltroValue) => void;
}

/** Filtro por pessoa responsável, no mesmo padrão visual dos demais filtros
 *  de setor (status, carimbo, região). Sempre oferece "Sem responsável"
 *  quando alguma solicitação da fila ainda não tem um definido. */
export default function ResponsavelFilter({ solicitacoes, value, onChange }: Props) {
  const { responsaveis, temSemResponsavel } = useMemo(() => {
    const mapa = new Map<string, ResponsavelSolicitacao>();
    let semResponsavel = false;
    for (const s of solicitacoes) {
      if (s.responsaveisAtuais?.length) {
        for (const r of s.responsaveisAtuais) mapa.set(r.id, r);
      } else {
        semResponsavel = true;
      }
    }
    return {
      responsaveis: Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      temSemResponsavel: semResponsavel,
    };
  }, [solicitacoes]);

  const temFiltroAtivo = value !== RESPONSAVEL_FILTRO_VAZIO;

  return (
    <>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 36, padding: '0 12px',
          background: 'white', border: '1px solid var(--tfd-surface-border)',
          borderRadius: 8, fontSize: 13, color: '#1A1D2B', minWidth: 168,
        }}
        aria-label="Filtrar por responsável"
      >
        <option value="">Todos os responsáveis</option>
        {temSemResponsavel && <option value={SEM_RESPONSAVEL}>Sem responsável</option>}
        {responsaveis.map((r) => (
          <option key={r.id} value={r.id}>{r.nome}</option>
        ))}
      </select>

      {temFiltroAtivo && (
        <button
          type="button"
          onClick={() => onChange(RESPONSAVEL_FILTRO_VAZIO)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
          style={{ height: 36, padding: '0 10px', color: '#64748B' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#1A1D2B'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
        >
          <X size={13} />
          Limpar responsável
        </button>
      )}
    </>
  );
}
