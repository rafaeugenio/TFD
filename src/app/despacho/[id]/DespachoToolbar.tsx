'use client';

import { useState } from 'react';
import { Printer, Link2, Check, ArrowLeft, Pencil } from 'lucide-react';
import DespachoFinanceiroDrawer, {
  type AjudaCustoOption,
} from '@/shared/components/despacho/DespachoFinanceiroDrawer';

export default function DespachoToolbar({
  despachoId,
  corpoPadrao,
  ajudasCusto,
  nomePaciente,
}: {
  despachoId: string;
  corpoPadrao?: string;
  /** PBI 13195 — ajudas de custo da solicitação, para o select obrigatório. */
  ajudasCusto?: AjudaCustoOption[];
  nomePaciente?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const [editar, setEditar] = useState(false);

  async function copiarLink() {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copie o link do despacho:', window.location.href);
    }
  }

  return (
    <>
      <div className="print-toolbar no-print">
        <button
          type="button"
          onClick={() => {
            if (typeof window === 'undefined') return;
            if (window.history.length > 1) window.history.back();
            else window.location.href = '/fluxo-v2/solicitacoes';
          }}
          className="print-back"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={12} /> Voltar
        </button>

        <div className="print-toolbar-actions">
          <button type="button" className="print-btn print-btn-secondary" onClick={() => setEditar(true)}>
            <Pencil size={14} /> Editar despacho
          </button>
          <button type="button" className="print-btn print-btn-secondary" onClick={copiarLink}>
            {copiado ? <><Check size={14} /> Link copiado</> : <><Link2 size={14} /> Copiar link</>}
          </button>
          <button type="button" className="print-btn" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir / Salvar como PDF
          </button>
        </div>
      </div>

      <div className="no-print">
        <DespachoFinanceiroDrawer
          open={editar}
          despachoId={despachoId}
          corpoPadrao={corpoPadrao}
          ajudasCusto={ajudasCusto}
          nomePaciente={nomePaciente}
          onClose={() => setEditar(false)}
          aposSalvar={() => window.location.reload()}
        />
      </div>
    </>
  );
}
