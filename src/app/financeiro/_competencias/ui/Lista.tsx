'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, FileText, ClipboardList, Lock, CalendarDays } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { Skeleton } from '@/components/ui/skeleton';
import { MES_LABEL } from '@/app/relatorios/_shared/format';
import { abrirCompetencia, type Competencia, type Frente } from '../store';
import { nomeCompetencia } from './Competencia';

const cartao: React.CSSProperties = { background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, boxShadow: 'var(--tfd-shadow-sm)' };
const th: React.CSSProperties = { padding: '14px 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', textAlign: 'left', background: 'var(--tfd-50)', borderBottom: '1px solid var(--tfd-surface-border)', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '12.6px 12px', fontSize: 13, color: 'var(--tfd-text-primary)', borderBottom: '1px solid var(--tfd-100)', verticalAlign: 'middle' };

function Situacao({ c, frente }: { c: Competencia; frente: Frente }) {
  const f = c.frentes[frente];
  return (
    <span className="inline-flex items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
      {f.status === 'aberta'
        ? <span className="tfd-badge" style={{ background: '#DCFCE7', color: '#15803D' }}>Aberta</span>
        : <span className="tfd-badge inline-flex items-center gap-1" style={{ background: 'var(--tfd-100)', color: 'var(--tfd-600)' }}><Lock size={10} /> Fechada</span>}
      <span style={{ color: 'var(--tfd-text-secondary)' }}>{f.itens.length} {f.itens.length === 1 ? 'linha' : 'linhas'}</span>
      {f.reaberturas > 0 && <span style={{ fontSize: 12, color: '#B45309' }}>reaberta {f.reaberturas}x</span>}
    </span>
  );
}

/** Entrada do Financeiro: competências abertas e fechadas, e abertura de uma nova. */
export default function Lista({ competencias, carregando }: { competencias: Competencia[]; carregando: boolean }) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const hoje = new Date();
  const [abrindo, setAbrindo] = useState(false);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const jaExiste = competencias.find((c) => c.ano === ano && c.mes === mes);

  const abrir = () => {
    const c = abrirCompetencia(ano, mes, user?.nome ?? 'Usuário');
    router.push(`/financeiro?c=${c.id}`);
  };

  return (
    <div className="pb-8">
      <PageHeader
        title="Financeiro"
        subtitle="Competências mensais de Faturamento e BPA. Cada competência recebe as linhas escolhidas e é fechada depois do envio."
        breadcrumbs={[{ label: 'Gestão' }]}
        actions={<button type="button" className="tfd-btn tfd-btn-primary" onClick={() => setAbrindo(true)}><CalendarPlus size={16} /> Abrir competência</button>}
      />

      {carregando ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : competencias.length === 0 ? (
        <section className="flex flex-col items-center justify-center text-center" style={{ ...cartao, padding: '56px 24px', minHeight: 'calc(100vh - 300px)' }}>
          <span className="inline-flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-500)' }}><CalendarDays size={26} /></span>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--tfd-text-primary)', marginTop: 14 }}>Nenhuma competência aberta ainda</p>
          <p style={{ fontSize: 14, color: 'var(--tfd-400)', marginTop: 4, maxWidth: 460 }}>Abra a competência do mês. Ela nasce vazia, com Faturamento e BPA separados, e você escolhe as linhas de cada um.</p>
          <button type="button" className="tfd-btn tfd-btn-primary mt-5" onClick={() => setAbrindo(true)}><CalendarPlus size={16} /> Abrir competência</button>
        </section>
      ) : (
        <section className="overflow-hidden" style={cartao}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Competência</th>
                <th style={th}><span className="inline-flex items-center gap-1.5"><FileText size={12} /> Faturamento</span></th>
                <th style={th}><span className="inline-flex items-center gap-1.5"><ClipboardList size={12} /> BPA</span></th>
                <th style={th}>Aberta em</th>
              </tr>
            </thead>
            <tbody>
              {competencias.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-[var(--tfd-surface-hover)]" onClick={() => router.push(`/financeiro?c=${c.id}`)}>
                  <td style={td}>
                    <a href={`/financeiro?c=${c.id}`} onClick={(e) => { e.preventDefault(); router.push(`/financeiro?c=${c.id}`); }} className="hover:underline" style={{ color: 'var(--tfd-blue-500)', fontWeight: 500, textTransform: 'capitalize' }}>
                      {nomeCompetencia(c)}
                    </a>
                  </td>
                  <td style={td}><Situacao c={c} frente="faturamento" /></td>
                  <td style={td}><Situacao c={c} frente="bpa" /></td>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--tfd-text-secondary)' }}>{new Date(c.criadaEm).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer style={{ padding: '10px 16px', background: 'var(--tfd-50)', borderTop: '1px solid var(--tfd-surface-border)', fontSize: 14, color: 'var(--tfd-text-secondary)' }}>
            {competencias.length} {competencias.length === 1 ? 'competência' : 'competências'}
          </footer>
        </section>
      )}

      {abrindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)' }} role="dialog" aria-modal="true" aria-labelledby="abrir-titulo">
          <div style={{ ...cartao, width: 'min(440px, 100%)', boxShadow: 'var(--tfd-shadow-lg)' }}>
            <div style={{ padding: '20px 22px' }}>
              <h2 id="abrir-titulo" style={{ fontSize: 17, fontWeight: 700, color: 'var(--tfd-text-primary)' }}>Abrir competência</h2>
              <p style={{ fontSize: 14, color: 'var(--tfd-text-secondary)', marginTop: 6 }}>Cria o Faturamento e o BPA do mês, vazios e abertos.</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <label>
                  <span className="block" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', marginBottom: 6 }}>Mês</span>
                  <select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, fontSize: 14 }}>
                    {MES_LABEL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </label>
                <label>
                  <span className="block" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', marginBottom: 6 }}>Ano</span>
                  <select value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, fontSize: 14 }}>
                    {[hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1].map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              {jaExiste && <p className="mt-3" style={{ fontSize: 13, color: '#B45309' }}>A competência de {nomeCompetencia(jaExiste)} já existe. Você será levado até ela.</p>}
            </div>
            <footer className="flex justify-end gap-2" style={{ padding: '12px 22px', borderTop: '1px solid var(--tfd-surface-border)', background: 'var(--tfd-50)', borderRadius: '0 0 8px 8px' }}>
              <button type="button" className="tfd-btn tfd-btn-ghost" onClick={() => setAbrindo(false)}>Cancelar</button>
              <button type="button" className="tfd-btn tfd-btn-primary" onClick={abrir}>{jaExiste ? 'Ir para a competência' : 'Abrir competência'}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
