'use client';

import Link from 'next/link';
import { ArrowRight, Bookmark, Trash2, History } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { ASSUNTOS, ASSUNTOS_ORDEM, assuntoPorId } from '../assuntos';
import { MODELOS } from '../modelos';
import { excluirRelatorio, useRelatoriosSalvos } from '../salvos';

const COR = { ink: '#0F172A', texto: '#334155', apoio: '#475569', borda: '#E2E8F0', azul: '#146BFA', azulSuave: '#EFF6FF' };

/**
 * Entrada de Relatórios. Três caminhos, do mais guiado ao mais livre:
 * começar por uma pergunta pronta, reabrir um relatório salvo ou montar do
 * zero escolhendo o assunto.
 */
export default function Landing() {
  const salvos = useRelatoriosSalvos();

  return (
    <div className="pb-12">
      <PageHeader
        title="Relatórios"
        subtitle="Escolha o que você quer saber e o sistema monta o relatório para você."
      />

      {/* 1. Perguntas prontas */}
      <section aria-labelledby="titulo-modelos" className="mb-10">
        <h2 id="titulo-modelos" style={{ fontSize: 20, fontWeight: 700, color: COR.ink }}>Comece por uma pergunta</h2>
        <p style={{ fontSize: 15, color: COR.apoio, marginTop: 4 }}>
          Modelos prontos. Depois de abrir, você pode mudar período, informações e filtros.
        </p>
        <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {MODELOS.map((m) => {
            const a = assuntoPorId(m.config.assunto);
            const Icone = a.icone;
            return (
              <Link
                key={m.id}
                href={`/relatorios?modelo=${m.id}`}
                className="group flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: 'white', border: `1px solid ${COR.borda}`, borderRadius: 12, padding: 18, minHeight: 170, outlineColor: COR.azul }}
              >
                <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 700, color: COR.azul, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Icone size={16} /> {m.setor}
                </span>
                <span style={{ fontSize: 17.5, fontWeight: 700, color: COR.ink, marginTop: 8, lineHeight: 1.3 }}>{m.pergunta}</span>
                <span style={{ fontSize: 14.5, color: COR.apoio, marginTop: 6, lineHeight: 1.45 }}>{m.descricao}</span>
                <span className="mt-auto pt-3 inline-flex items-center gap-1.5" style={{ fontSize: 15, fontWeight: 600, color: '#1D4ED8' }}>
                  Abrir este relatório <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. Salvos */}
      <section aria-labelledby="titulo-salvos" className="mb-10">
        <h2 id="titulo-salvos" className="flex items-center gap-2" style={{ fontSize: 20, fontWeight: 700, color: COR.ink }}>
          <Bookmark size={19} /> Meus relatórios salvos
        </h2>
        {salvos.length === 0 ? (
          <p className="mt-3" style={{ fontSize: 15, color: COR.apoio, background: 'white', border: `1px dashed #CBD5E1`, borderRadius: 12, padding: 18 }}>
            Você ainda não salvou nenhum relatório. Ao montar um relatório que usa sempre, clique em <strong>Salvar relatório</strong>: da próxima vez é só abrir e trocar o período.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {salvos.map((r) => {
              const a = assuntoPorId(r.config.assunto);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3" style={{ background: 'white', border: `1px solid ${COR.borda}`, borderRadius: 12, padding: '12px 14px' }}>
                  <div className="flex-1 min-w-[200px]">
                    <p style={{ fontSize: 16, fontWeight: 700, color: COR.ink }}>{r.nome}</p>
                    <p style={{ fontSize: 14, color: COR.apoio }}>
                      {a.label} · atualizado em {new Date(r.atualizadoEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Link href={`/relatorios?salvo=${r.id}`} className="tfd-btn tfd-btn-primary" style={{ minHeight: 44, fontSize: 15 }}>
                    Abrir
                  </Link>
                  <button
                    type="button"
                    className="tfd-btn tfd-btn-ghost"
                    style={{ minHeight: 44, fontSize: 15, color: '#B91C1C' }}
                    onClick={() => {
                      if (window.confirm(`Excluir o relatório "${r.nome}"? Os dados do sistema não são apagados.`)) excluirRelatorio(r.id);
                    }}
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 3. Do zero */}
      <section aria-labelledby="titulo-zero" className="mb-10">
        <h2 id="titulo-zero" style={{ fontSize: 20, fontWeight: 700, color: COR.ink }}>Montar um relatório do zero</h2>
        <p style={{ fontSize: 15, color: COR.apoio, marginTop: 4 }}>Escolha sobre o que você quer informações.</p>
        <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {ASSUNTOS_ORDEM.map((id) => {
            const a = ASSUNTOS.find((x) => x.id === id)!;
            const Icone = a.icone;
            return (
              <Link
                key={a.id}
                href={`/relatorios?novo=${a.id}`}
                className="flex items-start gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: 'white', border: `1px solid ${COR.borda}`, borderRadius: 12, padding: 16, minHeight: 88, outlineColor: COR.azul }}
              >
                <span className="inline-flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 10, background: COR.azulSuave, color: COR.azul }}>
                  <Icone size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block" style={{ fontSize: 16, fontWeight: 700, color: COR.ink }}>{a.label}</span>
                  <span className="block" style={{ fontSize: 14, color: COR.apoio, marginTop: 2, lineHeight: 1.4 }}>{a.pergunta}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <Link href="/relatorios/anteriores" className="inline-flex items-center gap-2" style={{ fontSize: 15, color: COR.apoio, minHeight: 44 }}>
        <History size={16} /> Ver os relatórios anteriores (Financeiro, Faturamento, BPA, Gestão e Regulação)
      </Link>
    </div>
  );
}
