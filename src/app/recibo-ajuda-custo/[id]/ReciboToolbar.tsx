'use client';

import { useState } from 'react';
import { Printer, Link2, Check, ArrowLeft } from 'lucide-react';

/**
 * Barra de ações do recibo de ajuda de custo (SEI), PBI 13279.
 * Diferente do despacho, o recibo não é persistido: não há "Editar" aqui,
 * cada acesso regenera o documento com os dados atuais da ajuda de custo.
 */
export default function ReciboToolbar() {
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt('Copie o link do recibo:', window.location.href);
    }
  }

  return (
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
        <button type="button" className="print-btn print-btn-secondary" onClick={copiarLink}>
          {copiado ? <><Check size={14} /> Link copiado</> : <><Link2 size={14} /> Copiar link</>}
        </button>
        <button type="button" className="print-btn" onClick={() => window.print()}>
          <Printer size={14} /> Imprimir / Salvar como PDF
        </button>
      </div>
    </div>
  );
}
