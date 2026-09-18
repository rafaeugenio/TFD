'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileBarChart2, History, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { assuntoPorId } from '../assuntos';
import { nomePeriodo } from '../periodo';
import { excluirRelatorio } from '../salvos';
import type { RelatorioSalvo } from '../tipos';
import { C } from './Etapas';

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Entrada de Relatórios: só os relatórios que o usuário criou. Criar um novo
 * é o único caminho para o cadastro em etapas. Cada linha abre o relatório
 * (tela de consulta) e tem Editar e Excluir.
 */
export default function Landing({ salvos, carregando }: { salvos: RelatorioSalvo[]; carregando: boolean }) {
  const [busca, setBusca] = useState('');
  const visiveis = salvos.filter((r) => {
    const t = normalizar(busca.trim());
    return !t || normalizar(`${r.nome} ${r.secoes.map((s) => assuntoPorId(s.assunto).label).join(' ')}`).includes(t);
  });

  return (
    <div className="pb-8 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <PageHeader
        title="Relatórios"
        subtitle="Os relatórios que você criou. Abra um para consultar, filtrar e exportar."
        actions={
          <Link href="/relatorios?novo=1" className="tfd-btn tfd-btn-primary" style={{ minHeight: 40 }}>
            <Plus size={16} /> Criar relatório
          </Link>
        }
      />

      <section
        aria-label="Meus relatórios"
        className="flex-1 flex flex-col"
        style={{ background: 'white', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}
      >
        {carregando ? (
          <div className="flex flex-col gap-3" style={{ padding: 20 }}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : salvos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px' }}>
            <FileBarChart2 size={32} style={{ color: '#94A3B8' }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 12 }}>Você ainda não criou nenhum relatório</p>
            <p style={{ fontSize: 14, color: C.apoio, marginTop: 4, maxWidth: 420 }}>
              Escolha o assunto, o período e as colunas uma vez. Depois é só abrir, ajustar o período e exportar.
            </p>
            <Link href="/relatorios?novo=1" className="tfd-btn tfd-btn-primary mt-5" style={{ minHeight: 40 }}>
              <Plus size={16} /> Criar relatório
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borda}` }}>
              <label className="relative flex-1" style={{ maxWidth: 360, minWidth: 200 }}>
                <span className="sr-only">Buscar relatório</span>
                <Search size={16} className="absolute" style={{ left: 12, top: 12, color: C.apoio }} />
                <input
                  value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome ou assunto"
                  style={{ width: '100%', minHeight: 40, padding: '0 12px 0 36px', border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 14 }}
                />
              </label>
              <span style={{ fontSize: 13.5, color: C.apoio }}>
                {salvos.length} {salvos.length === 1 ? 'relatório' : 'relatórios'}
              </span>
            </div>

            {/* Cabeçalho das colunas: só do tablet para cima */}
            <div
              className="hidden md:grid"
              style={{ gridTemplateColumns: 'minmax(0,2.2fr) minmax(0,1.3fr) 130px 196px', columnGap: 16, padding: '0 16px', background: C.fundo, borderBottom: `1px solid ${C.borda}`, fontSize: 13, fontWeight: 600, color: C.texto }}
            >
              <span style={{ padding: '10px 0' }}>Nome</span>
              <span style={{ padding: '10px 0' }}>Período</span>
              <span style={{ padding: '10px 0' }}>Atualizado em</span>
              <span style={{ padding: '10px 0', textAlign: 'right' }}>Ações</span>
            </div>

            <ul className="flex-1">
              {visiveis.map((r) => <ItemSalvo key={r.id} relatorio={r} />)}
              {visiveis.length === 0 && (
                <li className="text-center" style={{ padding: '40px 16px', fontSize: 14, color: C.apoio }}>
                  Nenhum relatório com &quot;{busca}&quot;.
                </li>
              )}
            </ul>
          </>
        )}
      </section>

      <Link href="/relatorios/anteriores" className="inline-flex items-center gap-2 self-start mt-3 hover:underline" style={{ minHeight: 40, fontSize: 13.5, color: C.apoio }}>
        <History size={15} /> Relatórios fixos anteriores
      </Link>
    </div>
  );
}

function ItemSalvo({ relatorio: r }: { relatorio: RelatorioSalvo }) {
  const assuntos = r.secoes.map((s) => assuntoPorId(s.assunto));
  const periodo = nomePeriodo(r.secoes[0].periodo);
  const Icone = assuntos[0].icone;
  return (
    <li
      className="relative grid items-center gap-x-4 gap-y-1 hover:bg-[#F5F9FF] grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_130px_196px]"
      style={{ padding: '10px 16px', borderBottom: `1px solid ${C.borda}` }}
    >
      <div className="min-w-0 flex items-center gap-3">
        <Icone size={18} style={{ color: C.azul, flexShrink: 0 }} />
        <div className="min-w-0">
          {/* O link cobre a linha toda; os botões de ação ficam por cima. */}
          <Link
            href={`/relatorios?salvo=${r.id}`}
            className="block truncate after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, outlineColor: C.azul }}
          >
            {r.nome}
          </Link>
          <span className="block truncate" style={{ fontSize: 13, color: C.apoio }}>
            {assuntos.map((a) => a.label).join(' · ')}
            <span className="md:hidden"> · {periodo}</span>
          </span>
        </div>
      </div>
      <span className="hidden md:block truncate" style={{ fontSize: 14, color: C.texto }}>{periodo}</span>
      <span className="hidden md:block" style={{ fontSize: 14, color: C.texto, fontVariantNumeric: 'tabular-nums' }}>
        {new Date(r.atualizadoEm).toLocaleDateString('pt-BR')}
      </span>
      <div className="relative z-10 flex items-center justify-end gap-1">
        <Link
          href={`/relatorios?editar=${r.id}`}
          aria-label={`Editar ${r.nome}`}
          className="inline-flex items-center gap-1.5 hover:bg-white focus-visible:outline focus-visible:outline-2"
          style={{ minHeight: 40, padding: '0 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: C.azulTexto, outlineColor: C.azul }}
        >
          <Pencil size={15} /> <span className="hidden sm:inline">Editar</span>
        </Link>
        <button
          type="button"
          aria-label={`Excluir ${r.nome}`}
          onClick={() => window.confirm(`Excluir o relatório "${r.nome}"? Essa ação não pode ser desfeita.`) && excluirRelatorio(r.id)}
          className="inline-flex items-center gap-1.5 hover:bg-white focus-visible:outline focus-visible:outline-2"
          style={{ minHeight: 40, padding: '0 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#B91C1C', outlineColor: C.azul }}
        >
          <Trash2 size={15} /> <span className="hidden sm:inline">Excluir</span>
        </button>
      </div>
    </li>
  );
}
