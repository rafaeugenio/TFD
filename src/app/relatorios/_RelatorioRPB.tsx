'use client';

import { useMemo, useState } from 'react';
import { Calendar, ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import {
  ReportToolbar,
  FilterField,
  PillButton,
  PrintButton,
  ReportHero,
  TableCard,
  ReportPrintStyles,
} from './_shared/ReportShell';
import { MES_LABEL, MES_LABEL_SHORT, anosDisponiveis } from './_shared/format';

type RPBTipo = 'ajuda_custo' | 'passagem';

export default function RelatorioRPB() {
  const hoje = new Date();
  const [tipo, setTipo] = useState<RPBTipo>('ajuda_custo');
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1); // 0 = ano inteiro
  const [loading] = useState(false);

  const periodo = useMemo(() => {
    if (mes === 0) {
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31`, label: `Ano de ${ano}` };
    }
    const lastDay = new Date(ano, mes, 0).getDate();
    const mm = String(mes).padStart(2, '0');
    return {
      inicio: `${ano}-${mm}-01`,
      fim: `${ano}-${mm}-${String(lastDay).padStart(2, '0')}`,
      label: `${MES_LABEL[mes - 1]} de ${ano}`,
    };
  }, [ano, mes]);

  return (
    <div className="space-y-4">
      <ReportPrintStyles />

      <ReportToolbar
        filters={
          <>
            <FilterField label="Tipo" icon={<ClipboardList size={11} />}>
              <select
                className="tfd-input"
                style={{ minWidth: 160 }}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as RPBTipo)}
              >
                <option value="ajuda_custo">Ajuda de Custo</option>
                <option value="passagem">Passagens</option>
              </select>
            </FilterField>

            <FilterField label="Ano" icon={<Calendar size={11} />}>
              <select
                className="tfd-input"
                style={{ minWidth: 100 }}
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value, 10))}
              >
                {anosDisponiveis().map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Mês">
              <div className="flex items-center gap-1 flex-wrap">
                <PillButton active={mes === 0} onClick={() => setMes(0)}>Ano inteiro</PillButton>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <PillButton key={m} active={mes === m} onClick={() => setMes(m)}>
                    {MES_LABEL_SHORT[m - 1]}
                  </PillButton>
                ))}
              </div>
            </FilterField>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost"
              onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth() + 1); }}
              title="Voltar para o mês atual"
            >
              <RefreshCw size={13} /> Mês atual
            </button>
            <PrintButton />
          </>
        }
      />

      <ReportHero
        titulo={`Relatório RPB — ${tipo === 'ajuda_custo' ? 'Ajuda de Custo' : 'Passagens'}`}
        periodoLabel={periodo.label}
      />

      <TableCard title="Itens para lançamento" count={0}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
          </div>
        ) : (
          <div className="text-center text-[13px] py-10" style={{ color: '#94A3B8' }}>
            Carregamento de dados implementado na próxima task.
          </div>
        )}
      </TableCard>
    </div>
  );
}
