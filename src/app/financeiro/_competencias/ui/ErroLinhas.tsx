'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * Falha ao consultar as linhas da competência. Fica separado do estado vazio
 * para que ninguém confunda "a consulta falhou" com "não há linhas".
 */
export default function ErroLinhas({ onTentarNovamente }: { onTentarNovamente: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px' }}>
      <span
        className="inline-flex items-center justify-center"
        style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--tfd-danger-bg)', color: 'var(--tfd-status-danger)' }}
      >
        <AlertTriangle size={22} />
      </span>
      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--tfd-text-primary)', marginTop: 12 }}>Não foi possível carregar as linhas.</p>
      <p style={{ fontSize: 13.5, color: 'var(--tfd-text-secondary)', marginTop: 4, maxWidth: 420 }}>
        Verifique a conexão e tente de novo. Enquanto as linhas não carregarem, a competência não pode ser fechada.
      </p>
      <button type="button" className="tfd-btn tfd-btn-secondary mt-4" onClick={onTentarNovamente}>
        <RotateCw size={15} /> Tentar novamente
      </button>
    </div>
  );
}
