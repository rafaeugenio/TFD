'use client';

import Link from 'next/link';
import { Plus, Trash2, ChevronRight, Bookmark, History } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { ASSUNTOS_ORDEM, assuntoPorId } from '../assuntos';
import { MODELOS } from '../modelos';
import { excluirRelatorio, useRelatoriosSalvos } from '../salvos';
import type { Modelo } from '../tipos';
import { C } from './Etapas';

const secaoTitulo: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: C.ink };

/** Ordem dos grupos de modelos, pelo setor que mais usa cada um. */
const ORDEM_SETORES = ['Financeiro', 'Passagens', 'Ajuda de Custo', 'Regulação', 'Gestão'];

/**
 * Entrada de Relatórios. Ocupa a largura toda: modelos e atalhos por assunto
 * à esquerda, painel "Meus relatórios" à direita na altura da tela. Abaixo de
 * 1280px as duas colunas empilham.
 */
export default function Landing() {
  const salvos = useRelatoriosSalvos();

  // Ordem estável por setor, sem quebrar em grupos (grupos de um item só
  // deixavam linhas vazias na grade).
  const modelos = [...MODELOS].sort((a, b) => ORDEM_SETORES.indexOf(a.setor) - ORDEM_SETORES.indexOf(b.setor));

  return (
    <div className="pb-8">
      <PageHeader
        title="Relatórios"
        subtitle="Monte, salve e exporte relatórios do TFD."
        actions={
          <Link href="/relatorios?novo=1" className="tfd-btn tfd-btn-primary" style={{ minHeight: 40 }}>
            <Plus size={16} /> Criar relatório
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:min-h-[calc(100vh-190px)]">
        <div className="min-w-0 flex flex-col gap-8">
          {/* Modelos */}
          <section aria-labelledby="t-modelos">
            <h2 id="t-modelos" style={{ ...secaoTitulo, marginBottom: 12 }}>Começar de um modelo</h2>
            {/* 8 modelos: 2 colunas (4 linhas) ou 4 colunas (2 linhas), sempre fechando a grade. */}
            <ul className="grid gap-2 grid-cols-1 md:grid-cols-2 min-[1800px]:grid-cols-4">
              {modelos.map((m) => <ItemModelo key={m.id} modelo={m} />)}
            </ul>
          </section>

          {/* Assuntos: pula a primeira etapa do construtor */}
          <section aria-labelledby="t-assuntos">
            <h2 id="t-assuntos" style={{ ...secaoTitulo, marginBottom: 12 }}>Ou comece por um assunto</h2>
            {/* 9 assuntos: 3 colunas (3 linhas) a partir do tablet. */}
            <ul className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {ASSUNTOS_ORDEM.map((id) => {
                const a = assuntoPorId(id);
                const Icone = a.icone;
                return (
                  <li key={id}>
                    <Link
                      href={`/relatorios?novo=${id}`}
                      title={a.pergunta}
                      className="flex items-center gap-2.5 hover:bg-[#F5F9FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ minHeight: 48, padding: '0 14px', background: 'white', border: `1px solid ${C.borda}`, borderRadius: 10, outlineColor: C.azul }}
                    >
                      <Icone size={17} style={{ color: C.apoio, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>{a.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Meus relatórios */}
        <aside
          aria-labelledby="t-salvos"
          className="flex flex-col"
          style={{ background: 'white', border: `1px solid ${C.borda}`, borderRadius: 12 }}
        >
          <h2 id="t-salvos" className="flex items-center gap-2" style={{ ...secaoTitulo, padding: '16px 18px', borderBottom: `1px solid ${C.borda}` }}>
            <Bookmark size={16} style={{ color: C.azul }} /> Meus relatórios
            {salvos.length > 0 && <span style={{ fontSize: 13, fontWeight: 500, color: C.apoio }}>{salvos.length}</span>}
          </h2>

          {salvos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '32px 24px' }}>
              <Bookmark size={28} style={{ color: '#CBD5E1' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginTop: 10 }}>Nenhum relatório salvo</p>
              <p style={{ fontSize: 13.5, color: C.apoio, marginTop: 4, maxWidth: 260 }}>
                Salve um relatório na última etapa para reabrir depois e só trocar o período.
              </p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {salvos.map((r, i) => {
                const Icone = assuntoPorId(r.config.assunto).icone;
                return (
                  <li key={r.id} className="flex items-center" style={{ borderTop: i ? `1px solid ${C.borda}` : undefined }}>
                    <Link href={`/relatorios?salvo=${r.id}`} className="flex-1 min-w-0 flex items-center gap-3 hover:bg-[#F5F9FF]" style={{ minHeight: 56, padding: '0 18px' }}>
                      <Icone size={17} style={{ color: C.azul, flexShrink: 0 }} />
                      <span className="min-w-0">
                        <span className="block truncate" style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{r.nome}</span>
                        <span className="block" style={{ fontSize: 12.5, color: C.apoio }}>
                          {assuntoPorId(r.config.assunto).label} · {new Date(r.atualizadoEm).toLocaleDateString('pt-BR')}
                        </span>
                      </span>
                    </Link>
                    <button
                      type="button" aria-label={`Excluir ${r.nome}`} title="Excluir"
                      onClick={() => window.confirm(`Excluir "${r.nome}"?`) && excluirRelatorio(r.id)}
                      className="inline-flex items-center justify-center shrink-0"
                      style={{ width: 44, height: 44, color: C.apoio, marginRight: 6 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/relatorios/anteriores"
            className="flex items-center gap-2 hover:bg-[#F5F9FF]"
            style={{ minHeight: 48, padding: '0 18px', borderTop: `1px solid ${C.borda}`, fontSize: 13.5, color: C.apoio, borderRadius: '0 0 12px 12px' }}
          >
            <History size={15} /> Relatórios anteriores
          </Link>
        </aside>
      </div>
    </div>
  );
}

function ItemModelo({ modelo }: { modelo: Modelo }) {
  const Icone = assuntoPorId(modelo.config.assunto).icone;
  return (
    <li>
      <Link
        href={`/relatorios?modelo=${modelo.id}`}
        className="h-full flex items-center gap-3 hover:bg-[#F5F9FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ minHeight: 60, padding: '10px 14px', background: 'white', border: `1px solid ${C.borda}`, borderRadius: 10, outlineColor: C.azul }}
      >
        <Icone size={17} style={{ color: C.azul, flexShrink: 0 }} />
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: 14, fontWeight: 500, color: C.ink, lineHeight: 1.35 }}>{modelo.pergunta}</span>
          <span className="block" style={{ fontSize: 12.5, color: C.apoio, marginTop: 2 }}>{modelo.setor}</span>
        </span>
        <ChevronRight size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
      </Link>
    </li>
  );
}
