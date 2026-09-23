'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Plus, Search } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { MES_LABEL, fmtBRL } from '@/app/relatorios/_shared/format';
import { valorBpa, type LinhaBpa, type LinhaFaturamento, type ProcedimentoBpa } from '../dados';
import type { Frente } from '../store';
import Tabela from './Tabela';
import { colunasBpaAjuda, colunasBpaDeslocamento, colunasFaturamento } from './colunas';

interface Props {
  open: boolean;
  onClose: () => void;
  frente: Frente;
  /** Rótulo da competência, ex.: "setembro de 2026". */
  rotuloCompetencia: string;
  mesCompetencia: string;
  /** Linhas ainda não vinculadas a nenhuma competência. */
  disponiveisFaturamento: LinhaFaturamento[];
  disponiveisBpa: LinhaBpa[];
  sig: Record<string, number>;
  carregando: boolean;
  onVer: (solicitacaoId: string) => void;
  onIncluir: (chaves: string[], detalhe: string) => void;
}

const rotulo: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', marginBottom: 6 };
const campo: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, background: 'white', fontSize: 14, color: 'var(--tfd-text-primary)' };
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nomeMes = (aaaamm: string) => { const [a, m] = aaaamm.split('-').map(Number); return `${MES_LABEL[m - 1]} de ${a}`; };

/**
 * Tela para escolher as linhas que entram na competência. Mostra todas as
 * linhas de todos os meses que ainda não estão em nenhuma competência, com
 * busca e filtros, seleção de várias de uma vez e inclusão em lote.
 */
export default function AdicionarLinhas(p: Props) {
  const [busca, setBusca] = useState('');
  const [mes, setMes] = useState('');
  const [procedimento, setProcedimento] = useState<ProcedimentoBpa>('ajuda_custo');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const base = p.frente === 'faturamento' ? p.disponiveisFaturamento : p.disponiveisBpa.filter((l) => l.procedimento === procedimento);
  const dataDe = (l: LinhaFaturamento | LinhaBpa) => ('dataEmissao' in l ? l.dataEmissao : l.dataAtendimento);
  const meses = useMemo(() => [...new Set(base.map((l) => dataDe(l).slice(0, 7)).filter(Boolean))].sort().reverse(), [base]);

  const filtradas = useMemo(() => {
    const t = norm(busca.trim());
    return base.filter((l) => {
      if (mes && dataDe(l).slice(0, 7) !== mes) return false;
      if (!t) return true;
      const texto = 'passageiro' in l ? `${l.passageiro} ${l.processo}` : `${l.nome} ${l.processo} ${l.documento}`;
      return norm(texto).includes(t);
    });
  }, [base, busca, mes]);

  const selecionar = (chaves: string[], marcar: boolean) =>
    setSelecionadas((atual) => {
      const n = new Set(atual);
      chaves.forEach((k) => (marcar ? n.add(k) : n.delete(k)));
      return n;
    });

  const todasDisponiveis = p.frente === 'faturamento' ? p.disponiveisFaturamento : p.disponiveisBpa;
  const escolhidas = todasDisponiveis.filter((l) => selecionadas.has(l.chave));
  const valorEscolhido = escolhidas.reduce((s, l) => s + ('passageiro' in l ? l.valor : valorBpa(l, p.sig)), 0);
  const outrosMeses = escolhidas.filter((l) => dataDe(l).slice(0, 7) !== p.mesCompetencia).length;

  const fechar = () => { setSelecionadas(new Set()); setBusca(''); setMes(''); p.onClose(); };
  const incluir = () => {
    const detalhe = p.frente === 'faturamento'
      ? escolhidas.map((l) => ('processo' in l ? l.processo : '')).filter(Boolean).slice(0, 5).join(', ')
      : escolhidas.map((l) => ('nome' in l ? l.nome : '')).filter(Boolean).slice(0, 5).join(', ');
    p.onIncluir(escolhidas.map((l) => l.chave), detalhe + (escolhidas.length > 5 ? ` e mais ${escolhidas.length - 5}` : ''));
    fechar();
  };

  const opcoes = { mesCompetencia: p.mesCompetencia, onVer: p.onVer };
  const tituloFrente = p.frente === 'faturamento' ? 'Faturamento' : 'BPA';

  return (
    <Drawer
      open={p.open}
      onClose={fechar}
      width="min(1240px, 96vw)"
      title={`Adicionar linhas ao ${tituloFrente}`}
      subtitle={`Competência de ${p.rotuloCompetencia}. Aparecem só as linhas que ainda não estão em nenhuma competência, de qualquer mês.`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <span style={{ fontSize: 14, color: 'var(--tfd-text-secondary)' }}>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>{selecionadas.size}</strong> {selecionadas.size === 1 ? 'linha selecionada' : 'linhas selecionadas'}
            {selecionadas.size > 0 && <> · {fmtBRL(valorEscolhido)}</>}
            {outrosMeses > 0 && <span style={{ color: '#B45309' }}> · {outrosMeses} de outro mês</span>}
          </span>
          <span className="flex gap-2">
            {selecionadas.size > 0 && <button type="button" className="tfd-btn tfd-btn-ghost" onClick={() => setSelecionadas(new Set())}>Limpar seleção</button>}
            <button type="button" className="tfd-btn tfd-btn-ghost" onClick={fechar}>Cancelar</button>
            <button type="button" className="tfd-btn tfd-btn-primary" disabled={selecionadas.size === 0} onClick={incluir}>
              <Plus size={15} /> Incluir {selecionadas.size || ''} {selecionadas.size === 1 ? 'linha' : 'linhas'}
            </button>
          </span>
        </div>
      }
    >
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {p.frente === 'bpa' && (
          <label>
            <span style={rotulo}><ClipboardList size={12} /> Procedimento</span>
            <select value={procedimento} onChange={(e) => setProcedimento(e.target.value as ProcedimentoBpa)} style={{ ...campo, minWidth: 180 }}>
              <option value="ajuda_custo">Ajuda de Custo</option>
              <option value="deslocamento">Deslocamentos</option>
            </select>
          </label>
        )}
        <label className="flex-1" style={{ minWidth: 240, maxWidth: 420 }}>
          <span style={rotulo}><Search size={12} /> Buscar</span>
          <span className="relative block">
            <Search size={16} className="absolute" style={{ left: 11, top: 10, color: 'var(--tfd-400)' }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={p.frente === 'faturamento' ? 'Nome do passageiro ou nº do processo...' : 'Nome, documento ou nº do processo...'} style={{ ...campo, width: '100%', paddingLeft: 35 }} />
          </span>
        </label>
        <label>
          <span style={rotulo}><CalendarDays size={12} /> {p.frente === 'faturamento' ? 'Mês da emissão' : 'Mês do atendimento'}</span>
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ ...campo, minWidth: 200 }}>
            <option value="">Todos os meses</option>
            {meses.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        </label>
        <span className="ml-auto" style={{ fontSize: 13, color: 'var(--tfd-text-muted)', paddingBottom: 8 }}>
          {filtradas.length} {filtradas.length === 1 ? 'linha disponível' : 'linhas disponíveis'}
        </span>
      </div>

      <div style={{ border: '1px solid var(--tfd-surface-border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
        {p.carregando ? (
          <p style={{ padding: 40, textAlign: 'center', color: 'var(--tfd-text-muted)' }}>Carregando linhas...</p>
        ) : p.frente === 'faturamento' ? (
          <Tabela
            colunas={colunasFaturamento(opcoes)}
            linhas={filtradas as LinhaFaturamento[]}
            chave={(l) => l.chave}
            selecionadas={selecionadas}
            onSelecionar={selecionar}
            rotuloSelecao="Selecionar para incluir"
            vazio={busca || mes ? 'Nenhuma linha disponível com esse filtro.' : 'Todas as linhas já estão em alguma competência.'}
          />
        ) : (
          <Tabela
            colunas={procedimento === 'ajuda_custo' ? colunasBpaAjuda(opcoes, p.sig) : colunasBpaDeslocamento(opcoes, p.sig)}
            linhas={filtradas as LinhaBpa[]}
            chave={(l) => l.chave}
            selecionadas={selecionadas}
            onSelecionar={selecionar}
            rotuloSelecao="Selecionar para incluir"
            vazio={busca || mes ? 'Nenhuma linha disponível com esse filtro.' : 'Todas as linhas já estão em alguma competência.'}
          />
        )}
      </div>
      <p className="mt-2" style={{ fontSize: 12.5, color: 'var(--tfd-text-muted)' }}>
        Linhas de outro mês podem entrar nesta competência (por exemplo, um lançamento atrasado). Elas aparecem com o mês de origem em destaque.
      </p>
    </Drawer>
  );
}
