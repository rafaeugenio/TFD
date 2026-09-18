'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileBarChart2, History, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { assuntoPorId } from '../assuntos';
import { nomePeriodo } from '../periodo';
import { excluirRelatorio } from '../salvos';
import type { RelatorioSalvo } from '../tipos';
import { C } from './Etapas';
import { cartao } from './Previa';

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

  const th: React.CSSProperties = { padding: '14px 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.apoio, textAlign: 'left', whiteSpace: 'nowrap' };

  return (
    <div className="pb-8">
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios criados por você. Abra um para consultar, filtrar e exportar."
        breadcrumbs={[{ label: 'Gestão' }]}
        actions={
          <Link href="/relatorios?novo=1" className="tfd-btn tfd-btn-primary">
            <Plus size={16} /> Criar relatório
          </Link>
        }
      />

      {carregando ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-72" />
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : salvos.length === 0 ? (
        <section
          aria-label="Meus relatórios"
          className="flex flex-col items-center justify-center text-center"
          style={{ ...cartao, padding: '56px 24px', minHeight: 'calc(100vh - 300px)' }}
        >
          <span className="inline-flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: '50%', background: C.azulSuave, color: C.azul }}>
            <FileBarChart2 size={26} />
          </span>
          <p style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginTop: 14 }}>Você ainda não criou nenhum relatório</p>
          <p style={{ fontSize: 14, color: C.claro, marginTop: 4, maxWidth: 440 }}>
            Escolha o assunto, o período e as colunas uma vez. Depois é só abrir, ajustar o período e exportar.
          </p>
          <Link href="/relatorios?novo=1" className="tfd-btn tfd-btn-primary mt-5">
            <Plus size={16} /> Criar relatório
          </Link>
        </section>
      ) : (
        <>
          <label className="relative block mb-4" style={{ width: 'min(100%, 280px)' }}>
            <span className="sr-only">Buscar relatório</span>
            <Search size={16} className="absolute" style={{ left: 11, top: 10, color: C.claro }} />
            <input
              value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou assunto..."
              style={{ width: '100%', height: 36, padding: '0 10px 0 35px', border: `1px solid ${C.campo}`, borderRadius: 'var(--tfd-radius-md)', fontSize: 14, color: C.ink, background: 'white' }}
            />
          </label>

          <section aria-label="Meus relatórios" className="overflow-hidden" style={cartao}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead style={{ background: C.fundo, borderBottom: `1px solid ${C.borda}` }}>
                <tr>
                  <th scope="col" style={th}>Nome</th>
                  <th scope="col" className="hidden md:table-cell" style={th}>Assuntos</th>
                  <th scope="col" className="hidden md:table-cell" style={th}>Período</th>
                  <th scope="col" className="hidden lg:table-cell" style={th}>Atualizado em</th>
                  <th scope="col" style={{ ...th, textAlign: 'center', width: 110 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r) => <ItemSalvo key={r.id} relatorio={r} />)}
                {visiveis.length === 0 && (
                  <tr><td colSpan={5} className="text-center" style={{ padding: '40px 16px', fontSize: 14, color: C.apoio }}>Nenhum relatório com &quot;{busca}&quot;.</td></tr>
                )}
              </tbody>
            </table>
            <footer style={{ padding: '10.5px 17.5px', background: C.fundo, borderTop: `1px solid ${C.borda}`, fontSize: 14, color: C.texto }}>
              Mostrando {visiveis.length ? 1 : 0} a {visiveis.length} de {salvos.length} {salvos.length === 1 ? 'relatório' : 'relatórios'}
            </footer>
          </section>
        </>
      )}

      <Link href="/relatorios/anteriores" className="inline-flex items-center gap-2 mt-3 hover:underline" style={{ minHeight: 36, fontSize: 13, color: C.apoio }}>
        <History size={15} /> Relatórios fixos anteriores
      </Link>
    </div>
  );
}

function ItemSalvo({ relatorio: r }: { relatorio: RelatorioSalvo }) {
  const router = useRouter();
  const assuntos = r.secoes.map((s) => assuntoPorId(s.assunto));
  const periodo = nomePeriodo(r.secoes[0].periodo);
  const td: React.CSSProperties = { padding: '12.6px 12px', fontSize: 13, color: C.ink, borderBottom: '1px solid var(--tfd-100)', verticalAlign: 'middle' };
  const abrir = () => router.push(`/relatorios?salvo=${r.id}`);
  return (
    <tr className="cursor-pointer hover:bg-[var(--tfd-surface-hover)]" onClick={abrir}>
      <td style={td}>
        <Link
          href={`/relatorios?salvo=${r.id}`} onClick={(e) => e.stopPropagation()}
          className="hover:underline focus-visible:outline focus-visible:outline-2"
          style={{ fontSize: 13, fontWeight: 500, color: C.azul, outlineColor: C.azul }}
        >
          {r.nome}
        </Link>
        <span className="block md:hidden" style={{ fontSize: 12, color: C.claro, marginTop: 2 }}>
          {assuntos.map((a) => a.label).join(' · ')} · {periodo}
        </span>
      </td>
      <td className="hidden md:table-cell" style={td}>
        <span className="flex flex-wrap gap-1">
          {assuntos.map((a) => <span key={a.id} className="tfd-badge" style={{ background: 'var(--tfd-100)', color: 'var(--tfd-600)' }}>{a.label}</span>)}
        </span>
      </td>
      <td className="hidden md:table-cell" style={{ ...td, whiteSpace: 'nowrap' }}>{periodo}</td>
      <td className="hidden lg:table-cell" style={{ ...td, whiteSpace: 'nowrap' }}>{new Date(r.atualizadoEm).toLocaleDateString('pt-BR')}</td>
      <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/relatorios?editar=${r.id}`} aria-label={`Editar ${r.nome}`} title="Editar"
          className="inline-flex items-center justify-center hover:bg-[var(--tfd-100)]"
          style={{ width: 34, height: 34, borderRadius: 'var(--tfd-radius-md)', color: C.texto }}
        >
          <Pencil size={16} />
        </Link>
        <button
          type="button" aria-label={`Excluir ${r.nome}`} title="Excluir"
          onClick={() => window.confirm(`Excluir o relatório "${r.nome}"? Essa ação não pode ser desfeita.`) && excluirRelatorio(r.id)}
          className="inline-flex items-center justify-center hover:bg-[var(--tfd-danger-bg,#FEF2F2)]"
          style={{ width: 34, height: 34, borderRadius: 'var(--tfd-radius-md)', color: 'var(--tfd-danger)', marginLeft: 4 }}
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}
