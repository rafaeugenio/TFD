'use client';

import { Printer } from 'lucide-react';

/**
 * Botão de exportar / imprimir — usa window.print(). O CSS @media print
 * já esconde o próprio botão e renderiza somente a folha A4.
 */
export default function ExportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 50,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: '#146BFA',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(20,107,250,0.25)',
      }}
    >
      <Printer size={16} />
      Exportar / Imprimir
    </button>
  );
}
