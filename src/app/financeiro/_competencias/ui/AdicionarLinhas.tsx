'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ClipboardList, Plus, Search } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { MES_LABEL, fmtBRL } from '@/app/relatorios/_shared/format';
import { valorBpa, type LinhaBpa, type LinhaFaturamento, type LinhaObito, type LinhaReembolso, type ProcedimentoBpa } from '../dados';
import { MENSAGEM_CONFLITO, type Frente, type Resultado } from '../store';
import ErroLinhas from './ErroLinhas';
import Tabela from './Tabela';
import { colunasBpaAjuda, colunasBpaDeslocamento, colunasFaturamento, colunasObito, colunasReembolso } from './colunas';

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
  disponiveisReembolso: LinhaReembolso[];
  disponiveisObito: LinhaObito[];
  sig: Record<string, number>;
  carregando: boolean;
  /** A consulta das linhas falhou: mostra o erro em vez da lista vazia. */
  erro: boolean;
  onTentarNovamente: () => void;
  onVer: (solicitacaoId: string) => void;
  /** Grava a inclusão; recusa se a linha entrou em outra competência ou a aba foi fechada. */
  onIncluir: (chaves: string[], detalhe: string) => Resultado;
}

const rotulo: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', marginBottom: 6 };
const campo: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, background: 'white', fontSize: 14, color: 'var(--tfd-text-primary)' };
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nomeMes = (aaaamm: string) => { const [a, m] = aaaamm.split('-').map(Number); return `${MES_LABEL[m - 1]} de ${a}`; };

type Linha = LinhaFaturamento | LinhaBpa | LinhaReembolso | LinhaObito;

const TITULO: Record<Frente, string> = { faturamento: 'Faturamento', bpa: 'BPA', reembolso: 'Reembolso', obito: 'Óbito' };

/** Texto pesquisável da linha, conforme a aba. */
function textoBusca(l: Linha): string {
  if ('passageiro' in l) return `${l.passageiro} ${l.processo}`;
  if ('paciente' in l) return `${l.paciente} ${l.processo} ${l.documento}`;
  return `${l.nome} ${l.processo} ${l.documento}`;
}

/** Valor somado na seleção: passagem, SIGTAP ou valor da passagem reembolsada. Óbito não tem valor na inclusão. */
function valorDaLinha(l: Linha, sig: Record<string, number>): number {
  if ('valorPassagem' in l) return l.valorPassagem;
  if ('passageiro' in l) return l.valor;
  if ('paciente' in l) return 0;
  return valorBpa(l, sig);
}

const SUBTITULO: Record<Frente, string> = {
  faturamento: 'Aparecem só as linhas que ainda não estão em nenhuma competência, de qualquer mês.',
  bpa: 'Aparecem só as linhas que ainda não estão em nenhuma competência, de qualquer mês.',
  reembolso: 'Aparecem as passagens com status Reembolso que ainda não estão em nenhuma competência.',
  obito: 'Aparecem as solicitações sinalizadas com óbito que ainda não estão em nenhuma competência.',
};

const RODAPE: Record<Frente, React.ReactNode> = {
  faturamento: <>Aparecem as mesmas linhas que o relatório de Faturamento listava, inclusive as de valor zero (R$ 0,00). Linhas de outro mês podem entrar nesta competência (por exemplo, um lançamento atrasado) e ficam com o selo &ldquo;Fora do período&rdquo;.</>,
  bpa: <>Aparecem as mesmas linhas que o relatório de BPA listava, inclusive as de valor zero (R$ 0,00). Linhas de outro mês podem entrar nesta competência (por exemplo, um lançamento atrasado) e ficam com o selo &ldquo;Fora do período&rdquo;.</>,
  reembolso: <>A data e o valor a receber são registrados depois, na linha da competência.</>,
  obito: <>A data do falecimento vem da sinalização de óbito na solicitação. As despesas e a data do pagamento são registradas depois, na linha da competência.</>,
};

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
  const [conflito, setConflito] = useState<string | null>(null);

  const todasDisponiveis: Linha[] = p.frente === 'faturamento' ? p.disponiveisFaturamento
    : p.frente === 'bpa' ? p.disponiveisBpa
    : p.frente === 'reembolso' ? p.disponiveisReembolso
    : p.disponiveisObito;
  const base = useMemo(
    () => (p.frente === 'bpa' ? p.disponiveisBpa.filter((l) => l.procedimento === procedimento) : todasDisponiveis),
    [p.frente, p.disponiveisBpa, procedimento, todasDisponiveis],
  );
  const meses = useMemo(() => [...new Set(base.map((l) => l.mesReferencia).filter(Boolean))].sort().reverse(), [base]);

  const filtradas = useMemo(() => {
    const t = norm(busca.trim());
    return base.filter((l) => {
      if (mes && l.mesReferencia !== mes) return false;
      if (!t) return true;
      return norm(textoBusca(l)).includes(t);
    });
  }, [base, busca, mes]);

  const selecionar = (chaves: string[], marcar: boolean) =>
    setSelecionadas((atual) => {
      const n = new Set(atual);
      chaves.forEach((k) => (marcar ? n.add(k) : n.delete(k)));
      return n;
    });

  const escolhidas = todasDisponiveis.filter((l) => selecionadas.has(l.chave));
  const valorEscolhido = escolhidas.reduce((s, l) => s + valorDaLinha(l, p.sig), 0);
  const outrosMeses = escolhidas.filter((l) => l.mesReferencia !== p.mesCompetencia).length;

  const fechar = () => { setSelecionadas(new Set()); setBusca(''); setMes(''); setConflito(null); p.onClose(); };
  const incluir = () => {
    // Histórico registra os processos afetados, nas duas abas.
    const processos = [...new Set(escolhidas.map((l) => l.processo).filter(Boolean))];
    const r = p.onIncluir(escolhidas.map((l) => l.chave), processos.length ? `Processos: ${processos.join(', ')}` : '');
    if (r.ok) { fechar(); return; }
    // Outra pessoa incluiu a linha ou fechou a aba: recusa e mantém a tela aberta.
    setConflito(MENSAGEM_CONFLITO[r.conflito]);
    setSelecionadas(new Set());
  };

  const opcoes = { mesCompetencia: p.mesCompetencia, onVer: p.onVer };
  // Sem nenhuma linha livre na aba, a mensagem é a geral; havendo linhas fora do filtro (inclusive do outro procedimento), a do filtro.
  const vazio = todasDisponiveis.length === 0 ? 'Todas as linhas já estão em alguma competência.' : 'Nenhuma linha disponível com esse filtro.';
  const tituloFrente = TITULO[p.frente];
  const comValor = p.frente !== 'obito';

  return (
    <Drawer
      open={p.open}
      onClose={fechar}
      width="min(1240px, 96vw)"
      title={`Adicionar linhas ao ${tituloFrente}`}
      subtitle={`Competência de ${p.rotuloCompetencia}. ${SUBTITULO[p.frente]}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <span style={{ fontSize: 14, color: 'var(--tfd-text-secondary)' }}>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>{selecionadas.size}</strong> {selecionadas.size === 1 ? 'linha selecionada' : 'linhas selecionadas'}
            {selecionadas.size > 0 && comValor && <> · {fmtBRL(valorEscolhido)}</>}
            {outrosMeses > 0 && <span style={{ color: 'var(--tfd-status-caution-accent)' }}> · {outrosMeses} de outro mês</span>}
          </span>
          {conflito && (
            <p role="alert" className="flex items-center gap-2 w-full" style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--tfd-danger-bg)', color: 'var(--tfd-status-danger)', fontSize: 13.5 }}>
              <AlertTriangle size={15} /> {conflito}
            </p>
          )}
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
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={p.frente === 'faturamento' || p.frente === 'reembolso' ? 'Nome do passageiro ou nº do processo...' : 'Nome, documento ou nº do processo...'} style={{ ...campo, width: '100%', paddingLeft: 35 }} />
          </span>
        </label>
        <label>
          <span style={rotulo}><CalendarDays size={12} /> {p.frente === 'obito' ? 'Mês do falecimento' : p.frente === 'reembolso' ? 'Mês do reembolso' : 'Mês de referência'}</span>
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ ...campo, minWidth: 200 }}>
            <option value="">Todos os meses</option>
            {meses.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        </label>
        {!p.erro && (
          <span className="ml-auto" style={{ fontSize: 13, color: 'var(--tfd-text-muted)', paddingBottom: 8 }}>
            {filtradas.length} {filtradas.length === 1 ? 'linha disponível' : 'linhas disponíveis'}
          </span>
        )}
      </div>

      <div style={{ border: '1px solid var(--tfd-surface-border)', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
        {p.carregando ? (
          <div className="flex flex-col gap-2" style={{ padding: 12 }} aria-busy="true" aria-label="Carregando linhas">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : p.erro ? (
          <ErroLinhas onTentarNovamente={p.onTentarNovamente} />
        ) : p.frente === 'faturamento' ? (
          <Tabela
            colunas={colunasFaturamento(opcoes)}
            linhas={filtradas as LinhaFaturamento[]}
            chave={(l) => l.chave}
            selecionadas={selecionadas}
            onSelecionar={selecionar}
            rotuloSelecao="Selecionar para incluir"
            vazio={vazio}
          />
        ) : p.frente === 'reembolso' ? (
          <Tabela
            colunas={colunasReembolso(opcoes)}
            linhas={filtradas as LinhaReembolso[]}
            chave={(l) => l.chave}
            selecionadas={selecionadas}
            onSelecionar={selecionar}
            rotuloSelecao="Selecionar para incluir"
            vazio={todasDisponiveis.length === 0 ? 'Nenhuma passagem com status Reembolso fora de competência.' : vazio}
          />
        ) : p.frente === 'obito' ? (
          <Tabela
            colunas={colunasObito(opcoes)}
            linhas={filtradas as LinhaObito[]}
            chave={(l) => l.chave}
            selecionadas={selecionadas}
            onSelecionar={selecionar}
            rotuloSelecao="Selecionar para incluir"
            vazio={todasDisponiveis.length === 0 ? 'Nenhuma solicitação sinalizada com óbito fora de competência.' : vazio}
          />
        ) : (
          <Tabela
            colunas={procedimento === 'ajuda_custo' ? colunasBpaAjuda(opcoes, p.sig) : colunasBpaDeslocamento(opcoes, p.sig)}
            linhas={filtradas as LinhaBpa[]}
            chave={(l) => l.chave}
            selecionadas={selecionadas}
            onSelecionar={selecionar}
            rotuloSelecao="Selecionar para incluir"
            vazio={vazio}
          />
        )}
      </div>
      <p className="mt-2" style={{ fontSize: 12.5, color: 'var(--tfd-text-muted)' }}>{RODAPE[p.frente]}</p>
    </Drawer>
  );
}
