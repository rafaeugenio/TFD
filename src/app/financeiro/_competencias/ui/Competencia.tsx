'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ClipboardList, FileText, History, Lock, LockOpen, Plane, Plus, Printer, Receipt, Search, Wallet } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { useToast } from '@/shared/components/toast/Toast';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { Skeleton } from '@/components/ui/skeleton';
import { MES_LABEL, fmtBRL, fmtDataBR, valorPorExtenso } from '@/app/relatorios/_shared/format';
import { TipoBeneficiarioBadge } from '@/app/relatorios/_shared/ReportTable';
import {
  carregarBpa, carregarFaturamento, carregarLancados, carregarValoresSigtap, marcarLancado, valorBpa,
  type LinhaBpa, type LinhaFaturamento, type ProcedimentoBpa,
} from '../dados';
import {
  chavesUsadas, fecharFrente, incluirLinhas, reabrirFrente, removerLinha, useCompetencias,
  type Competencia as TCompetencia, type EventoHistorico, type Frente,
} from '../store';
import AdicionarLinhas from './AdicionarLinhas';
import Tabela, { type Coluna } from './Tabela';
import { colunasBpaAjuda, colunasBpaDeslocamento, colunasFaturamento } from './colunas';

const cartao: React.CSSProperties = { background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, boxShadow: 'var(--tfd-shadow-sm)' };
const rotulo: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', marginBottom: 6 };
const campo: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, background: 'white', fontSize: 14, color: 'var(--tfd-text-primary)' };
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const nomeCompetencia = (c: Pick<TCompetencia, 'ano' | 'mes'>) => `${MES_LABEL[c.mes - 1].toLowerCase()} de ${c.ano}`;
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Competência de um mês, com as frentes Faturamento e BPA em abas. Cada
 * frente começa vazia, recebe linhas escolhidas, é fechada (fica só leitura)
 * e pode ser reaberta com motivo; tudo fica no histórico da frente.
 */
export default function Competencia({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentUser();
  const quem = user?.nome ?? 'Usuário';
  const competencias = useCompetencias();
  const c = competencias.find((x) => x.id === id);

  const [frente, setFrente] = useState<Frente>('faturamento');
  const [carregando, setCarregando] = useState(true);
  const [fat, setFat] = useState<LinhaFaturamento[]>([]);
  const [bpa, setBpa] = useState<LinhaBpa[]>([]);
  const [sig, setSig] = useState<Record<string, number>>({});
  const [lancados, setLancados] = useState<Set<string>>(new Set());
  const [adicionando, setAdicionando] = useState(false);
  const [dialogo, setDialogo] = useState<'fechar' | 'reabrir' | null>(null);
  const [procedimento, setProcedimento] = useState<ProcedimentoBpa>('ajuda_custo');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [f, b, l] = await Promise.all([carregarFaturamento(), carregarBpa(), carregarLancados()]);
      const s = await carregarValoresSigtap(b);
      if (!ativo) return;
      setFat(f); setBpa(b); setLancados(l); setSig(s); setCarregando(false);
    })();
    return () => { ativo = false; };
  }, []);

  const f = c?.frentes[frente];
  const itens = useMemo(() => new Set(f?.itens.map((i) => i.chave) ?? []), [f]);
  const aposReabertura = useMemo(() => new Set(f?.itens.filter((i) => i.aposReabertura).map((i) => i.chave) ?? []), [f]);
  const usadasFat = useMemo(() => chavesUsadas(competencias, 'faturamento'), [competencias]);
  const usadasBpa = useMemo(() => chavesUsadas(competencias, 'bpa'), [competencias]);

  if (!c || !f) {
    return (
      <div className="text-center" style={{ padding: '64px 16px' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--tfd-text-primary)' }}>Competência não encontrada</p>
        <button type="button" className="tfd-btn tfd-btn-primary mt-4" onClick={() => router.push('/financeiro')}>Ver competências</button>
      </div>
    );
  }

  const nome = nomeCompetencia(c);
  const mesCompetencia = `${c.ano}-${String(c.mes).padStart(2, '0')}`;
  const aberta = f.status === 'aberta';
  const t = norm(busca.trim());

  const fatDaComp = fat.filter((l) => itens.has(l.chave)).filter((l) => !t || norm(`${l.passageiro} ${l.processo}`).includes(t));
  const bpaDaComp = bpa.filter((l) => itens.has(l.chave));
  const bpaVisiveis = bpaDaComp.filter((l) => l.procedimento === procedimento).filter((l) => !t || norm(`${l.nome} ${l.processo} ${l.documento}`).includes(t));

  const onVer = (sid: string) => router.push(`/fluxo-v2/solicitacoes/${sid}`);
  const remover = (chave: string) => {
    const l = frente === 'faturamento' ? fat.find((x) => x.chave === chave) : bpa.find((x) => x.chave === chave);
    const detalhe = l ? ('passageiro' in l ? `${l.processo} · ${l.passageiro}` : `${l.processo} · ${l.nome}`) : chave;
    removerLinha(c.id, frente, chave, quem, detalhe);
    toast.success('Linha removida da competência', 'Ela volta a ficar disponível para outras competências.');
  };
  const opcoes = { mesCompetencia, onVer, onRemover: aberta ? remover : undefined };

  const alternarLancado = async (l: LinhaBpa) => {
    const marcar = !lancados.has(l.chave);
    setLancados((s) => { const n = new Set(s); if (marcar) n.add(l.chave); else n.delete(l.chave); return n; });
    await marcarLancado(l, marcar);
  };
  const colunaLancado: Coluna<LinhaBpa> = {
    key: 'lancado', header: <span title="Lançada no BPA">BPA</span>, align: 'center', width: '52px',
    render: (l) => <input type="checkbox" aria-label="Lançada no BPA" title={aberta ? 'Marcar como lançada no BPA' : 'Competência fechada'} disabled={!aberta} checked={lancados.has(l.chave)} onChange={() => alternarLancado(l)} />,
  };

  // Totais do Faturamento: canceladas e demais regras seguem as do relatório atual.
  const valorBruto = fatDaComp.reduce((s, l) => s + l.valor, 0);
  const reembolsos = fatDaComp.filter((l) => l.valorReembolso > 0);
  const totalReembolsos = reembolsos.reduce((s, l) => s + l.valorReembolso, 0);
  const totalPagar = valorBruto - totalReembolsos;
  const lancadasBpa = bpaVisiveis.filter((l) => lancados.has(l.chave)).length;
  const valorBpaTotal = bpaVisiveis.reduce((s, l) => s + valorBpa(l, sig), 0);

  const qtd = (fr: Frente) => c.frentes[fr].itens.length;

  return (
    <div className="pb-10">
      <PageHeader
        title={`Competência de ${nome}`}
        subtitle="Escolha as linhas de cada frente, feche quando o envio estiver concluído e reabra só com motivo."
        breadcrumbs={[{ label: 'Gestão' }, { label: 'Financeiro', href: '/financeiro' }]}
        actions={<button type="button" className="tfd-btn tfd-btn-secondary" onClick={() => window.print()}><Printer size={15} /> Imprimir</button>}
      />

      {/* Abas por frente */}
      <div role="tablist" aria-label="Frentes da competência" className="flex gap-2 mb-5" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
        {(['faturamento', 'bpa'] as Frente[]).map((fr) => {
          const atual = fr === frente;
          const st = c.frentes[fr].status;
          return (
            <button
              key={fr} type="button" role="tab" aria-selected={atual}
              onClick={() => { setFrente(fr); setBusca(''); }}
              className="inline-flex items-center gap-2"
              style={{ padding: '1.1rem 1.1rem 1.25rem', fontSize: 14, fontWeight: 700, color: atual ? 'var(--tfd-blue-500)' : 'var(--tfd-text-secondary)', borderBottom: `2px solid ${atual ? 'var(--tfd-blue-500)' : 'transparent'}`, marginBottom: -1 }}
            >
              {fr === 'faturamento' ? <FileText size={16} /> : <ClipboardList size={16} />}
              {fr === 'faturamento' ? 'Faturamento' : 'BPA'}
              <span className={atual ? 'tfd-badge tfd-badge--primary' : 'tfd-badge'} style={atual ? undefined : { background: 'var(--tfd-100)', color: 'var(--tfd-600)' }}>{qtd(fr)}</span>
              <StatusChip status={st} />
            </button>
          );
        })}
      </div>

      {/* Situação da frente e ações */}
      <section className="mb-5" style={cartao}>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3" style={{ padding: '0.875rem 1.25rem' }}>
          {frente === 'bpa' && (
            <label>
              <span style={rotulo}><ClipboardList size={12} /> Procedimento</span>
              <select value={procedimento} onChange={(e) => setProcedimento(e.target.value as ProcedimentoBpa)} style={{ ...campo, minWidth: 180 }}>
                <option value="ajuda_custo">Ajuda de Custo</option>
                <option value="deslocamento">Deslocamentos</option>
              </select>
            </label>
          )}
          <label className="flex-1" style={{ minWidth: 220, maxWidth: 420 }}>
            <span style={rotulo}><Search size={12} /> Buscar</span>
            <span className="relative block">
              <Search size={16} className="absolute" style={{ left: 11, top: 10, color: 'var(--tfd-400)' }} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={frente === 'faturamento' ? 'Nome do passageiro ou nº do processo...' : 'Nome do beneficiário ou nº do processo...'} style={{ ...campo, width: '100%', paddingLeft: 35 }} />
            </span>
          </label>
          <span className="flex flex-wrap gap-2 ml-auto">
            {aberta ? (
              <>
                <button type="button" className="tfd-btn tfd-btn-secondary" onClick={() => setDialogo('fechar')} disabled={f.itens.length === 0} title={f.itens.length === 0 ? 'Inclua pelo menos uma linha antes de fechar' : undefined}>
                  <Lock size={15} /> Fechar competência
                </button>
                <button type="button" className="tfd-btn tfd-btn-primary" onClick={() => setAdicionando(true)}>
                  <Plus size={15} /> Adicionar linhas
                </button>
              </>
            ) : (
              <button type="button" className="tfd-btn tfd-btn-secondary" onClick={() => setDialogo('reabrir')}>
                <LockOpen size={15} /> Reabrir competência
              </button>
            )}
          </span>
        </div>
        {!aberta && (
          <div className="flex items-center gap-2" style={{ padding: '10px 1.25rem', borderTop: '1px dashed var(--tfd-surface-border)', fontSize: 13.5, color: 'var(--tfd-text-secondary)', background: 'var(--tfd-50)', borderRadius: '0 0 8px 8px' }}>
            <Lock size={14} style={{ color: 'var(--tfd-text-muted)' }} />
            Fechada em {f.fechadaEm ? dataHora(f.fechadaEm) : 'data não registrada'}. Só visualização: nenhuma linha pode ser incluída, removida ou marcada.
          </div>
        )}
        {aberta && f.reaberturas > 0 && (
          <div className="flex items-center gap-2" style={{ padding: '10px 1.25rem', borderTop: '1px dashed var(--tfd-surface-border)', fontSize: 13.5, color: '#92400E', background: '#FFFBEB', borderRadius: '0 0 8px 8px' }}>
            <AlertTriangle size={14} />
            Competência reaberta. Linhas incluídas depois da reabertura aparecem com fundo amarelo claro na tabela.
          </div>
        )}
      </section>

      {carregando ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /></div>
      ) : frente === 'faturamento' ? (
        <>
          <Indicadores itens={[
            { rotulo: 'Bilhetes emitidos', valor: String(fatDaComp.length), icone: <Plane size={12} /> },
            { rotulo: 'Valor bruto', valor: fmtBRL(valorBruto), icone: <Wallet size={12} /> },
            { rotulo: 'Reembolsos ao TFD', valor: fmtBRL(totalReembolsos), icone: <Receipt size={12} /> },
            { rotulo: 'Total a pagar', valor: fmtBRL(totalPagar) },
          ]} />
          <Secao titulo="Itens faturados" quantidade={fatDaComp.length}>
            <Tabela
              colunas={colunasFaturamento(opcoes)}
              linhas={fatDaComp}
              chave={(l) => l.chave}
              destaque={(l) => (aposReabertura.has(l.chave) ? { background: '#FFFBEB' } : undefined)}
              vazio={aberta ? <>Competência vazia. Use <strong>Adicionar linhas</strong> para escolher os itens de {nome}.</> : 'Nenhum item nesta competência.'}
            />
          </Secao>
          <Secao titulo="Reembolsos concedidos ao TFD" quantidade={reembolsos.length} subtitulo="Devoluções aplicadas pelo fornecedor nos itens desta competência">
            <Tabela
              colunas={[
                { key: 'dv', header: 'Data viagem', render: (l: LinhaFaturamento) => fmtDataBR(l.dataViagem) },
                { key: 'p', header: 'Passageiro', render: (l: LinhaFaturamento) => <span className="inline-flex items-center gap-1.5"><TipoBeneficiarioBadge tipo={l.beneficiario} />{l.passageiro}</span> },
                { key: 't', header: 'Trecho', render: (l: LinhaFaturamento) => `${l.origem} ⇄ ${l.destino}` },
                { key: 'pr', header: 'Processo', render: (l: LinhaFaturamento) => <span style={{ fontFamily: 'var(--tfd-mono)' }}>{l.processo}</span> },
                { key: 'tm', header: 'Tipo movim.', render: () => 'Reembolso' },
                { key: 'v', header: 'A reembolsar', align: 'right', render: (l: LinhaFaturamento) => <span style={{ fontFamily: 'var(--tfd-mono)' }}>{fmtBRL(l.valorReembolso)}</span> },
              ]}
              linhas={reembolsos}
              chave={(l) => l.chave}
              vazio="Nenhum reembolso registrado."
            />
          </Secao>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5" style={{ ...cartao, padding: '16px 20px', background: '#F0FDF4', borderColor: '#BBF7D0' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#15803D' }}>Total do faturamento</p>
              <p style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--tfd-text-secondary)' }}>{valorPorExtenso(totalPagar)}.</p>
            </div>
            <p style={{ fontFamily: 'var(--tfd-mono)', fontSize: 26, fontWeight: 700, color: '#15803D' }}>{fmtBRL(totalPagar)}</p>
          </div>
        </>
      ) : (
        <>
          <Indicadores itens={[
            { rotulo: 'Total de linhas', valor: String(bpaVisiveis.length), icone: <ClipboardList size={12} /> },
            { rotulo: 'Lançadas no BPA', valor: String(lancadasBpa), cor: '#15803D' },
            { rotulo: 'Pendentes', valor: String(bpaVisiveis.length - lancadasBpa), cor: '#C2410C' },
            { rotulo: 'Valor total SIGTAP', valor: fmtBRL(valorBpaTotal) },
          ]} />
          <Secao titulo="Itens para lançamento" quantidade={bpaVisiveis.length} subtitulo={procedimento === 'ajuda_custo' ? 'Ajuda de Custo' : 'Deslocamentos'}>
            <Tabela
              colunas={[colunaLancado, ...(procedimento === 'ajuda_custo' ? colunasBpaAjuda(opcoes, sig) : colunasBpaDeslocamento(opcoes, sig))]}
              linhas={bpaVisiveis}
              chave={(l) => l.chave}
              destaque={(l) => ({ ...(lancados.has(l.chave) ? { opacity: 0.6 } : {}), ...(aposReabertura.has(l.chave) ? { background: '#FFFBEB' } : {}) })}
              vazio={aberta ? <>Nenhuma linha de {procedimento === 'ajuda_custo' ? 'ajuda de custo' : 'deslocamento'} nesta competência. Use <strong>Adicionar linhas</strong>.</> : 'Nenhuma linha nesta competência.'}
            />
          </Secao>
        </>
      )}

      <Historico eventos={f.historico} frente={frente} />

      <AdicionarLinhas
        open={adicionando}
        onClose={() => setAdicionando(false)}
        frente={frente}
        rotuloCompetencia={nome}
        mesCompetencia={mesCompetencia}
        disponiveisFaturamento={fat.filter((l) => !usadasFat.has(l.chave))}
        disponiveisBpa={bpa.filter((l) => !usadasBpa.has(l.chave))}
        sig={sig}
        carregando={carregando}
        onVer={onVer}
        onIncluir={(chaves, detalhe) => {
          incluirLinhas(c.id, frente, chaves, quem, detalhe);
          toast.success(`${chaves.length} ${chaves.length === 1 ? 'linha incluída' : 'linhas incluídas'}`, `Competência de ${nome}, ${frente === 'faturamento' ? 'Faturamento' : 'BPA'}.`);
        }}
      />

      {dialogo && (
        <DialogoFrente
          modo={dialogo}
          frente={frente}
          nome={nome}
          quantidade={f.itens.length}
          onCancelar={() => setDialogo(null)}
          onConfirmar={(motivo) => {
            if (dialogo === 'fechar') {
              fecharFrente(c.id, frente, quem);
              toast.success('Competência fechada', `${frente === 'faturamento' ? 'Faturamento' : 'BPA'} de ${nome} agora é só visualização.`);
            } else {
              reabrirFrente(c.id, frente, quem, motivo);
              toast.warning('Competência reaberta', 'A reabertura e o motivo ficaram registrados no histórico.');
            }
            setDialogo(null);
          }}
        />
      )}
    </div>
  );
}

function StatusChip({ status }: { status: 'aberta' | 'fechada' }) {
  return status === 'aberta'
    ? <span className="tfd-badge" style={{ background: '#DCFCE7', color: '#15803D' }}>Aberta</span>
    : <span className="tfd-badge inline-flex items-center gap-1" style={{ background: 'var(--tfd-100)', color: 'var(--tfd-600)' }}><Lock size={10} /> Fechada</span>;
}

function Indicadores({ itens }: { itens: { rotulo: string; valor: string; icone?: React.ReactNode; cor?: string }[] }) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden mb-5" style={{ ...cartao, background: 'var(--tfd-surface-border)' }}>
      {itens.map((i) => (
        <div key={i.rotulo} style={{ background: 'white', padding: '1.1rem 1.25rem' }}>
          <span className="inline-flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)' }}>
            {i.icone && <span style={{ color: 'var(--tfd-400)', display: 'inline-flex' }}>{i.icone}</span>}{i.rotulo}
          </span>
          <p style={{ fontFamily: 'var(--tfd-mono)', fontSize: '1.5rem', fontWeight: 700, color: i.cor ?? 'var(--tfd-text-primary)', marginTop: 6, whiteSpace: 'nowrap' }}>{i.valor}</p>
        </div>
      ))}
    </section>
  );
}

function Secao({ titulo, quantidade, subtitulo, children }: { titulo: string; quantidade: number; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 overflow-hidden" style={cartao}>
      <header className="flex flex-wrap items-center gap-2.5" style={{ padding: '1.1rem 1.25rem 0.85rem' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--tfd-text-primary)' }}>{titulo}</h3>
        <span className="tfd-badge tfd-badge--primary">{quantidade}</span>
        {subtitulo && <span style={{ fontSize: 13, color: 'var(--tfd-400)' }}>{subtitulo}</span>}
      </header>
      {children}
    </section>
  );
}

const TEXTO_EVENTO: Record<EventoHistorico['tipo'], string> = {
  aberta: 'Competência aberta',
  linhas_incluidas: 'Linhas incluídas',
  linha_removida: 'Linha removida',
  fechada: 'Competência fechada',
  reaberta: 'Competência reaberta',
};

function Historico({ eventos, frente }: { eventos: EventoHistorico[]; frente: Frente }) {
  return (
    <section className="overflow-hidden" style={cartao}>
      <header className="flex items-center gap-2.5" style={{ padding: '1.1rem 1.25rem 0.85rem' }}>
        <History size={16} style={{ color: 'var(--tfd-text-muted)' }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--tfd-text-primary)' }}>Histórico {frente === 'faturamento' ? 'do Faturamento' : 'do BPA'}</h3>
        <span style={{ fontSize: 13, color: 'var(--tfd-400)' }}>Registro de auditoria: quem fez, quando e o quê</span>
      </header>
      <ol style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
        {[...eventos].reverse().map((e) => (
          <li key={e.id} className="flex flex-wrap items-start gap-x-4 gap-y-1" style={{ padding: '10px 1.25rem', borderBottom: '1px solid var(--tfd-100)', fontSize: 13.5, background: e.tipo === 'reaberta' ? '#FFFBEB' : undefined }}>
            <span style={{ fontFamily: 'var(--tfd-mono)', fontSize: 12.5, color: 'var(--tfd-text-muted)', minWidth: 120 }}>{dataHora(e.em)}</span>
            <span className="flex-1 min-w-[220px]">
              <strong style={{ fontWeight: 600, color: 'var(--tfd-text-primary)' }}>{TEXTO_EVENTO[e.tipo]}</strong>
              {e.quantidade != null && e.tipo !== 'fechada' && <> · {e.quantidade} {e.quantidade === 1 ? 'linha' : 'linhas'}</>}
              {e.tipo === 'fechada' && e.quantidade != null && <> com {e.quantidade} {e.quantidade === 1 ? 'linha' : 'linhas'}</>}
              {e.detalhe && <span className="block" style={{ fontSize: 12.5, color: 'var(--tfd-text-muted)' }}>{e.detalhe}</span>}
              {e.motivo && <span className="block" style={{ fontSize: 13, color: '#92400E' }}>Motivo: {e.motivo}</span>}
            </span>
            <span style={{ fontSize: 13, color: 'var(--tfd-text-secondary)' }}>{e.por}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DialogoFrente({ modo, frente, nome, quantidade, onCancelar, onConfirmar }: {
  modo: 'fechar' | 'reabrir'; frente: Frente; nome: string; quantidade: number;
  onCancelar: () => void; onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [ciente, setCiente] = useState(false);
  const nomeFrente = frente === 'faturamento' ? 'Faturamento' : 'BPA';
  const podeConfirmar = modo === 'fechar' || (motivo.trim().length >= 10 && ciente);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCancelar]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)' }} role="dialog" aria-modal="true" aria-labelledby="dlg-titulo">
      <div style={{ ...cartao, width: 'min(520px, 100%)', boxShadow: 'var(--tfd-shadow-lg)' }}>
        <div style={{ padding: '20px 22px' }}>
          <h2 id="dlg-titulo" className="flex items-center gap-2" style={{ fontSize: 17, fontWeight: 700, color: 'var(--tfd-text-primary)' }}>
            {modo === 'fechar' ? <Lock size={18} /> : <AlertTriangle size={18} style={{ color: '#D97706' }} />}
            {modo === 'fechar' ? `Fechar ${nomeFrente} de ${nome}?` : `Reabrir ${nomeFrente} de ${nome}?`}
          </h2>
          {modo === 'fechar' ? (
            <p style={{ fontSize: 14, color: 'var(--tfd-text-secondary)', marginTop: 10, lineHeight: 1.5 }}>
              A competência fica trancada com as {quantidade} {quantidade === 1 ? 'linha' : 'linhas'} de hoje. Depois de fechada, só dá para visualizar os valores: nada pode ser incluído, removido ou marcado. Para mudar, será preciso reabrir com motivo.
            </p>
          ) : (
            <>
              <ul style={{ fontSize: 14, color: 'var(--tfd-text-secondary)', marginTop: 10, lineHeight: 1.5, paddingLeft: 18, listStyle: 'disc' }}>
                <li>Os valores já enviados podem mudar se linhas forem incluídas ou removidas.</li>
                <li>A reabertura, o motivo e tudo o que for feito depois ficam no histórico de auditoria.</li>
                <li>Linhas incluídas após a reabertura ficam destacadas na tabela.</li>
              </ul>
              <label className="block mt-4">
                <span style={rotulo}>Motivo da reabertura *</span>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex.: auditoria da SES pediu inclusão de passagem emitida em atraso." style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, fontSize: 14 }} />
                <span style={{ fontSize: 12, color: motivo.trim().length >= 10 ? 'var(--tfd-text-muted)' : '#B45309' }}>Mínimo de 10 caracteres.</span>
              </label>
              <label className="flex items-start gap-2 mt-3" style={{ fontSize: 13.5, color: 'var(--tfd-text-primary)' }}>
                <input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} style={{ marginTop: 3 }} />
                Entendo que a reabertura fica registrada e que os valores desta competência podem mudar.
              </label>
            </>
          )}
        </div>
        <footer className="flex justify-end gap-2" style={{ padding: '12px 22px', borderTop: '1px solid var(--tfd-surface-border)', background: 'var(--tfd-50)', borderRadius: '0 0 8px 8px' }}>
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onCancelar}>Cancelar</button>
          <button type="button" className="tfd-btn tfd-btn-primary" disabled={!podeConfirmar} onClick={() => onConfirmar(motivo.trim())}>
            {modo === 'fechar' ? <><Lock size={15} /> Fechar competência</> : <><LockOpen size={15} /> Reabrir competência</>}
          </button>
        </footer>
      </div>
    </div>
  );
}
