'use client';

import { ExternalLink, AlertCircle } from 'lucide-react';
import StatusDot from './StatusDot';
import {
  TIPO_PARECER_LABEL,
  type SolicitacaoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

interface Props {
  solicitacao: SolicitacaoMock;
  /** Quando true, destaca pareceres do tipo 'medif' visualmente. */
  destacarMedif?: boolean;
  label?: string;
}

const fmtData = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/**
 * Lista compacta de pareceres médicos como hyperlinks. Cada item abre a
 * página de impressão do parecer em nova aba (`/fluxo-v2/parecer-print/[id]`).
 *
 * Usado nos drawers de Carimbo, Tentativa e Passagem para o usuário do setor
 * conferir rapidamente o que o médico já decidiu.
 */
export default function ParecerLinkList({
  solicitacao: s,
  destacarMedif = false,
  label = 'Pareceres médicos',
}: Props) {
  // Ordem cronológica descendente — mais recente primeiro.
  const pareceres = [...s.pareceres].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  );

  return (
    <section className="mb-4">
      <div
        className="text-[11px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: '#6B7280' }}
      >
        {label}
      </div>

      {pareceres.length === 0 ? (
        <div
          className="px-3 py-2 text-[12px]"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, color: '#94A3B8' }}
        >
          Nenhum parecer registrado ainda.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {pareceres.map((p, idx) => {
            // Número do parecer = posição na ordem ASCENDENTE (mais antigo = #1).
            const num = s.pareceres.findIndex((x) => x.id === p.id) + 1;
            const isMedif = p.tipo === 'medif';
            const highlight = destacarMedif && isMedif;
            return (
              <li key={p.id}>
                <a
                  href={`/parecer/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-[#F1F5F9]"
                  style={{
                    background: highlight ? '#FFFBEB' : 'white',
                    border: '1px solid ' + (highlight ? '#FCD34D' : '#E2E8F0'),
                    borderLeft: highlight ? '3px solid #D97706' : '1px solid #E2E8F0',
                    borderRadius: 8,
                    color: '#1A1D2B',
                    textDecoration: 'none',
                  }}
                >
                  {highlight && (
                    <AlertCircle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
                  )}

                  <StatusDot tone={p.decisao === 'deferido' ? 'success' : 'danger'}>
                    {p.decisao === 'deferido' ? 'Deferido' : 'Indeferido'}
                  </StatusDot>

                  {p.tipo && (
                    <span
                      className="text-[11px] font-medium uppercase"
                      style={{
                        background: highlight ? '#FDE68A' : '#F1F5F9',
                        color: highlight ? '#92400E' : '#475569',
                        padding: '2px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isMedif ? 'MEDIF' : TIPO_PARECER_LABEL[p.tipo]}
                    </span>
                  )}

                  <span className="text-[12px] truncate" style={{ color: '#475569' }}>
                    Parecer #{num} — {p.medico} · {fmtData(p.data)}
                  </span>

                  <ExternalLink
                    size={12}
                    style={{ color: '#94A3B8', flexShrink: 0, marginLeft: 'auto' }}
                  />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* Banner de alerta Medif — usado pelo NewPassagemDrawer quando há parecer medif deferido. */
export function MedifBanner() {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 mb-3"
      style={{
        background: '#FFFBEB',
        border: '1px solid #FCD34D',
        borderRadius: 8,
      }}
    >
      <AlertCircle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
      <p className="text-[12px]" style={{ color: '#78350F', lineHeight: 1.4 }}>
        <strong>Atenção: Medif autorizado pelo médico TFD.</strong>{' '}
        Coordenar com a companhia aérea para assistência médica em voo (paciente ou acompanhante).
      </p>
    </div>
  );
}
