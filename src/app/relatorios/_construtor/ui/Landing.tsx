'use client';

import Link from 'next/link';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { assuntoPorId } from '../assuntos';
import { MODELOS } from '../modelos';
import { excluirRelatorio, useRelatoriosSalvos } from '../salvos';
import { C } from './Etapas';

const secaoTitulo: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 10 };

/** Entrada de Relatórios: criar, começar de um modelo ou reabrir um salvo. */
export default function Landing() {
  const salvos = useRelatoriosSalvos();

  return (
    <div className="pb-12" style={{ maxWidth: 1080 }}>
      <PageHeader
        title="Relatórios"
        subtitle="Monte, salve e exporte relatórios do TFD."
        actions={
          <Link href="/relatorios?novo=1" className="tfd-btn tfd-btn-primary" style={{ minHeight: 40 }}>
            <Plus size={16} /> Criar relatório
          </Link>
        }
      />

      {salvos.length > 0 && (
        <section aria-labelledby="t-salvos" className="mb-8">
          <h2 id="t-salvos" style={secaoTitulo}>Meus relatórios</h2>
          <ul style={{ background: 'white', border: `1px solid ${C.borda}`, borderRadius: 12 }}>
            {salvos.map((r, i) => {
              const Icone = assuntoPorId(r.config.assunto).icone;
              return (
                <li key={r.id} className="flex items-center" style={{ borderTop: i ? `1px solid ${C.borda}` : undefined }}>
                  <Link href={`/relatorios?salvo=${r.id}`} className="flex-1 min-w-0 flex items-center gap-3 hover:bg-[#F5F9FF]" style={{ minHeight: 52, padding: '0 16px' }}>
                    <Icone size={17} style={{ color: C.azul, flexShrink: 0 }} />
                    <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{r.nome}</span>
                    <span className="hidden sm:inline" style={{ fontSize: 13, color: C.apoio }}>
                      {new Date(r.atualizadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </Link>
                  <button
                    type="button" aria-label={`Excluir ${r.nome}`} title="Excluir"
                    onClick={() => window.confirm(`Excluir "${r.nome}"?`) && excluirRelatorio(r.id)}
                    className="inline-flex items-center justify-center shrink-0"
                    style={{ width: 44, height: 44, color: C.apoio, marginRight: 4 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="t-modelos" className="mb-8">
        <h2 id="t-modelos" style={secaoTitulo}>Começar de um modelo</h2>
        <ul className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {MODELOS.map((m) => {
            const Icone = assuntoPorId(m.config.assunto).icone;
            return (
              <li key={m.id}>
                <Link
                  href={`/relatorios?modelo=${m.id}`}
                  className="flex items-center gap-3 hover:bg-[#F5F9FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ minHeight: 56, padding: '0 14px', background: 'white', border: `1px solid ${C.borda}`, borderRadius: 10, outlineColor: C.azul }}
                >
                  <Icone size={17} style={{ color: C.azul, flexShrink: 0 }} />
                  <span className="flex-1" style={{ fontSize: 14, fontWeight: 500, color: C.ink, lineHeight: 1.35 }}>{m.pergunta}</span>
                  <ChevronRight size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <Link href="/relatorios/anteriores" style={{ fontSize: 13.5, color: C.apoio, textDecoration: 'underline', textUnderlineOffset: 3 }}>
        Relatórios anteriores
      </Link>
    </div>
  );
}
