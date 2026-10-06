'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Check, ChevronDown, ClipboardList, Download, Eye, FileSpreadsheet, FileText, History, Lock, LockOpen,
  Plane, Plus, Receipt, Search, Sheet, Trash2, Wallet,
} from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import ConfirmDialog from '@/shared/components/confirm-dialog/ConfirmDialog';
import Drawer from '@/shared/components/drawer/Drawer';
import { useToast } from '@/shared/components/toast/Toast';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { MES_LABEL, fmtBRL, fmtDataBR, valorPorExtenso } from '@/app/relatorios/_shared/format';
import { TipoBeneficiarioBadge } from '@/app/relatorios/_shared/ReportTable';
import {
  carregarBpa, carregarFaturamento, carregarLancados, carregarValoresSigtap, marcarLancado, sigtapDasLinhas, valorBpa,
  type LinhaBpa, type LinhaFaturamento, type ProcedimentoBpa,
} from '../dados';
import {
  MENSAGEM_CONFLITO, chavesUsadas, competenciaCompleta, completarCopiaLegada, conferirFrenteAberta, copiaAtual, excluirCompetencia,
  fecharFrente, incluirLinhas, podeExcluirCompetencia, quantidadeLinhas, reabrirFrente, removerLinha, useCompetencias,
  type Competencia as TCompetencia, type CopiaNova, type EventoHistorico, type Fechamento, type Frente,
} from '../store';
import {
  gerarArquivo, planilhaBpaAjuda, planilhaBpaDeslocamento, planilhaFaturamento, registrarNoLog, type Formato,
} from '../exportar';
import AdicionarLinhas from './AdicionarLinhas';
import ErroLinhas from './ErroLinhas';
import Tabela, { type Coluna } from './Tabela';
import { colunasBpaAjuda, colunasBpaDeslocamento, colunasFaturamento, type OpcoesColunas } from './colunas';

const cartao: React.CSSProperties = { background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, boxShadow: 'var(--tfd-shadow-sm)' };
const rotulo: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', marginBottom: 6 };
const campo: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, background: 'white', fontSize: 14, color: 'var(--tfd-text-primary)' };
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const nomeCompetencia = (c: Pick<TCompetencia, 'ano' | 'mes'>) => `${MES_LABEL[c.mes - 1].toLowerCase()} de ${c.ano}`;
const nomeFrente = (f: Frente) => (f === 'faturamento' ? 'Faturamento' : 'BPA');
/** dd/mm/aaaa hh:mm */
const dataHora = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

/** Totais do Faturamento: "Total a pagar" é o valor bruto menos os reembolsos ao TFD. */
function totaisFaturamento(linhas: LinhaFaturamento[]) {
  const valorBruto = linhas.reduce((s, l) => s + l.valor, 0);
  const reembolsos = linhas.filter((l) => l.valorReembolso > 0);
  const totalReembolsos = reembolsos.reduce((s, l) => s + l.valorReembolso, 0);
  return { valorBruto, reembolsos, totalReembolsos, totalPagar: valorBruto - totalReembolsos };
}

/** O que a aba mostra: com a aba aberta, a origem em tempo real; fechada, a cópia do fechamento. */
interface Vista {
  fat: LinhaFaturamento[];
  bpa: LinhaBpa[];
  sig: Record<string, number>;
  lancados: Set<string>;
  aposReabertura: Set<string>;
  mesCompetencia: string;
}

const vistaDaCopia = (x: Fechamento): Vista => ({
  fat: x.linhasFaturamento ?? [],
  bpa: x.linhasBpa ?? [],
  sig: x.sigtap ?? {},
  lancados: new Set(x.lancados ?? []),
  aposReabertura: new Set(x.aposReabertura),
  mesCompetencia: x.mesCompetencia,
});

/**
 * Competência de um mês, com as frentes Faturamento e BPA em abas. Cada
 * frente começa vazia, recebe linhas escolhidas, é fechada (fica só leitura,
 * mostrando a cópia gravada no fechamento) e pode ser reaberta com motivo;
 * tudo fica no histórico da frente.
 */
export default function Competencia({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentUser();
  const quem = user?.nome ?? 'Usuário';
  const { can } = usePermissions();
  const competencias = useCompetencias();
  const c = competencias.find((x) => x.id === id);

  const [frente, setFrente] = useState<Frente>('faturamento');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [fat, setFat] = useState<LinhaFaturamento[]>([]);
  const [bpa, setBpa] = useState<LinhaBpa[]>([]);
  const [sig, setSig] = useState<Record<string, number>>({});
  const [lancados, setLancados] = useState<Set<string>>(new Set());
  const [adicionando, setAdicionando] = useState(false);
  const [dialogo, setDialogo] = useState<'fechar' | 'reabrir' | 'excluir' | null>(null);
  const [procedimento, setProcedimento] = useState<ProcedimentoBpa>('ajuda_custo');
  const [busca, setBusca] = useState('');
  const [consultando, setConsultando] = useState<Fechamento | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [f, b, l] = await Promise.all([carregarFaturamento(), carregarBpa(), carregarLancados()]);
        const s = await carregarValoresSigtap(b);
        if (!ativo) return;
        setFat(f); setBpa(b); setLancados(l); setSig(s); setErro(false);
      } catch {
        if (!ativo) return;
        setFat([]); setBpa([]); setLancados(new Set()); setSig({}); setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [tentativa]);

  const tentarNovamente = () => { setCarregando(true); setErro(false); setTentativa((n) => n + 1); };

  const usadasFat = useMemo(() => chavesUsadas(competencias, 'faturamento'), [competencias]);
  const usadasBpa = useMemo(() => chavesUsadas(competencias, 'bpa'), [competencias]);
  const mesCompetencia = c ? `${c.ano}-${String(c.mes).padStart(2, '0')}` : '';

  /** Cópia das linhas da frente como estão agora na origem (usada ao fechar). */
  const montarCopia = (fr: Frente): CopiaNova | null => {
    if (!c) return null;
    const fc = c.frentes[fr];
    const chaves = new Set(fc.itens.map((i) => i.chave));
    const apos = fc.itens.filter((i) => i.aposReabertura).map((i) => i.chave);
    if (fr === 'faturamento') {
      const linhas = fat.filter((l) => chaves.has(l.chave));
      const t = totaisFaturamento(linhas);
      return {
        mesCompetencia, linhasFaturamento: linhas, aposReabertura: apos,
        totais: { bilhetes: linhas.length, valorBruto: t.valorBruto, reembolsos: t.totalReembolsos, totalPagar: t.totalPagar },
      };
    }
    const linhas = bpa.filter((l) => chaves.has(l.chave));
    const s = sigtapDasLinhas(linhas, sig);
    const lanc = linhas.filter((l) => lancados.has(l.chave)).map((l) => l.chave);
    return {
      mesCompetencia, linhasBpa: linhas, sigtap: s, lancados: lanc, aposReabertura: apos,
      totais: { linhas: linhas.length, lancadas: lanc.length, valorSigtap: linhas.reduce((acc, l) => acc + valorBpa(l, s), 0) },
    };
  };

  // Frente fechada antes de existir a cópia: grava a cópia com os dados de agora, uma única vez.
  useEffect(() => {
    if (!c || carregando || erro) return;
    for (const fr of ['faturamento', 'bpa'] as Frente[]) {
      if (c.frentes[fr].status === 'fechada' && !copiaAtual(c.frentes[fr])) {
        const copia = montarCopia(fr);
        if (copia) completarCopiaLegada(c.id, fr, copia);
      }
    }
    // montarCopia lê o mesmo estado listado aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, carregando, erro, fat, bpa, sig, lancados]);

  if (!c) {
    return (
      <div className="text-center" style={{ padding: '64px 16px' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--tfd-text-primary)' }}>Competência não encontrada</p>
        <p style={{ fontSize: 14, color: 'var(--tfd-text-muted)', marginTop: 4 }}>Ela pode ter sido excluída.</p>
        <button type="button" className="tfd-btn tfd-btn-primary mt-4" onClick={() => router.push('/financeiro')}>Ver competências</button>
      </div>
    );
  }

  const f = c.frentes[frente];
  const nome = nomeCompetencia(c);
  const aberta = f.status === 'aberta';
  const copia = copiaAtual(f);
  // Permissões separadas por aba: "adicionar linhas" cobre incluir e remover.
  const podeLinhas = can(`competencia.${frente}.adicionar_linhas`);
  const podeFechar = can(`competencia.${frente}.fechar`);
  const podeReabrir = can(`competencia.${frente}.reabrir`);
  const podeExportar = can(`competencia.${frente}.exportar`);
  const podeMarcar = frente === 'bpa' && can('competencia.bpa.marcar_lancada');
  const podeExcluir = can('competencia.excluir');
  const editavel = aberta && podeLinhas;

  // Com a aba fechada, tudo vem da cópia; aberta, da origem.
  const itens = new Set(f.itens.map((i) => i.chave));
  const vista: Vista | null = aberta
    ? {
        fat: fat.filter((l) => itens.has(l.chave)),
        bpa: bpa.filter((l) => itens.has(l.chave)),
        sig,
        lancados,
        aposReabertura: new Set(f.itens.filter((i) => i.aposReabertura).map((i) => i.chave)),
        mesCompetencia,
      }
    : copia ? vistaDaCopia(copia) : null;
  // Aberta depende da consulta à origem; fechada só da cópia.
  const aguardando = aberta ? carregando : !copia && carregando;
  const falhou = aberta ? erro : !copia && erro;

  const t = norm(busca.trim());
  const fatVisiveis = (vista?.fat ?? []).filter((l) => !t || norm(`${l.passageiro} ${l.processo}`).includes(t));
  const bpaDaAba = vista?.bpa ?? [];
  const bpaVisiveis = bpaDaAba.filter((l) => l.procedimento === procedimento).filter((l) => !t || norm(`${l.nome} ${l.processo}`).includes(t));

  // Regras de fechamento: Faturamento com pelo menos uma linha; BPA só com todas lançadas.
  const linhasNaAba = frente === 'faturamento' ? (vista?.fat.length ?? 0) : bpaDaAba.length;
  const pendentesBpa = bpaDaAba.filter((l) => !lancados.has(l.chave)).length;
  const dicaFechar = erro
    ? 'Não foi possível carregar as linhas. Tente novamente antes de fechar'
    : carregando ? 'Carregando as linhas'
    : linhasNaAba === 0 ? 'Inclua pelo menos uma linha antes de fechar'
    : frente === 'bpa' && pendentesBpa > 0
      ? `Marque "Lançada no BPA" em todas as linhas antes de fechar. ${pendentesBpa === 1 ? 'Falta 1 linha' : `Faltam ${pendentesBpa} linhas`}`
      : undefined;

  const avisarConflito = (r: { ok: boolean; conflito?: keyof typeof MENSAGEM_CONFLITO }) => {
    if (!r.ok && r.conflito) toast.error('Ação não concluída', MENSAGEM_CONFLITO[r.conflito]);
    return r.ok;
  };

  const onVer = (sid: string) => router.push(`/fluxo-v2/solicitacoes/${sid}`);
  const remover = (chave: string) => {
    const l = frente === 'faturamento' ? fat.find((x) => x.chave === chave) : bpa.find((x) => x.chave === chave);
    const detalhe = l ? ('passageiro' in l ? `${l.processo} · ${l.passageiro}` : `${l.processo} · ${l.nome}`) : chave;
    if (!avisarConflito(removerLinha(c.id, frente, chave, quem, detalhe))) return;
    toast.success('Linha removida da competência', 'Ela volta a ficar disponível para outras competências.');
  };
  const opcoes: OpcoesColunas = { mesCompetencia: vista?.mesCompetencia ?? mesCompetencia, onVer, onRemover: editavel ? remover : undefined };

  const alternarLancado = async (l: LinhaBpa) => {
    if (!avisarConflito(conferirFrenteAberta(c.id, 'bpa'))) return;
    const marcar = !lancados.has(l.chave);
    const trocar = (s: Set<string>, sim: boolean) => { const n = new Set(s); if (sim) n.add(l.chave); else n.delete(l.chave); return n; };
    setLancados((s) => trocar(s, marcar));
    try {
      await marcarLancado(l, marcar);
    } catch {
      setLancados((s) => trocar(s, !marcar));
      toast.error('Não foi possível salvar a marcação', 'Tente de novo.');
    }
  };
  const colunaLancado: Coluna<LinhaBpa> = {
    key: 'lancado', header: <span title="Lançada no BPA">BPA</span>, align: 'center', width: '52px',
    render: (l) => {
      const marcada = vista?.lancados.has(l.chave) ?? false;
      // Sem permissão de marcar, a ação some e fica só a situação.
      if (aberta && !podeMarcar) {
        return marcada
          ? <span title="Lançada no BPA" style={{ color: 'var(--tfd-status-success-text)' }}><Check size={16} aria-hidden /><span className="sr-only">Lançada no BPA</span></span>
          : <span className="sr-only">Pendente</span>;
      }
      return <input type="checkbox" aria-label="Lançada no BPA" title={aberta ? 'Marcar como lançada no BPA' : 'Competência fechada'} disabled={!aberta} checked={marcada} onChange={() => alternarLancado(l)} />;
    },
  };

  const exportar = async (formato: Formato) => {
    if (!vista) return;
    const situacao = aberta ? 'Aberta (dados atuais da origem)' : `Fechada em ${f.fechadaEm ? dataHora(f.fechadaEm) : 'data não registrada'} (cópia do fechamento)`;
    const base = [
      { rotulo: 'Competência', valor: nome },
      { rotulo: 'Aba', valor: nomeFrente(frente) },
      { rotulo: 'Situação', valor: situacao },
      ...(frente === 'bpa' ? [{ rotulo: 'Procedimento', valor: procedimento === 'ajuda_custo' ? 'Ajuda de Custo' : 'Deslocamentos' }] : []),
      ...(busca.trim() ? [{ rotulo: 'Busca', valor: busca.trim() }] : []),
    ];
    let planilha;
    let quantidade: number;
    if (frente === 'faturamento') {
      const tt = totaisFaturamento(fatVisiveis);
      planilha = {
        ...planilhaFaturamento(fatVisiveis, vista.mesCompetencia, vista.aposReabertura),
        resumo: [...base, { rotulo: 'Bilhetes emitidos', valor: String(fatVisiveis.length) }, { rotulo: 'Valor bruto', valor: fmtBRL(tt.valorBruto) }, { rotulo: 'Reembolsos ao TFD', valor: fmtBRL(tt.totalReembolsos) }, { rotulo: 'Total a pagar', valor: fmtBRL(tt.totalPagar) }],
      };
      quantidade = fatVisiveis.length;
    } else {
      const total = bpaVisiveis.reduce((s, l) => s + valorBpa(l, vista.sig), 0);
      const lanc = bpaVisiveis.filter((l) => vista.lancados.has(l.chave)).length;
      const tabela = procedimento === 'ajuda_custo'
        ? planilhaBpaAjuda(bpaVisiveis, vista.sig, vista.lancados, vista.mesCompetencia)
        : planilhaBpaDeslocamento(bpaVisiveis, vista.sig, vista.lancados, vista.mesCompetencia);
      planilha = {
        ...tabela,
        resumo: [...base, { rotulo: 'Total de linhas', valor: String(bpaVisiveis.length) }, { rotulo: 'Lançadas no BPA', valor: String(lanc) }, { rotulo: 'Pendentes', valor: String(bpaVisiveis.length - lanc) }, { rotulo: 'Valor total SIGTAP', valor: fmtBRL(total) }],
      };
      quantidade = bpaVisiveis.length;
    }
    const sufixo = frente === 'bpa' ? ` ${procedimento === 'ajuda_custo' ? 'Ajuda de Custo' : 'Deslocamentos'}` : '';
    await gerarArquivo(formato, { ...planilha, titulo: `${nomeFrente(frente)}${sufixo} de ${nome}` });
    void registrarNoLog(user ? { id: user.id, perfil: user.perfil } : null, 'COMPETENCIA_EXPORTADA', c.id, {
      competencia: nome, aba: frente, formato, linhas: quantidade, situacao: aberta ? 'aberta' : 'fechada',
      procedimento: frente === 'bpa' ? procedimento : null, busca: busca.trim() || null,
    });
  };

  const linhasExportaveis = frente === 'faturamento' ? fatVisiveis.length : bpaVisiveis.length;
  const excluivel = podeExcluirCompetencia(c);
  const dicaExcluir = excluivel ? undefined : 'Só é possível excluir uma competência que nunca teve o Faturamento nem o BPA fechado';

  return (
    <div className="pb-10">
      <PageHeader
        title={`Competência de ${nome}`}
        subtitle="Escolha as linhas de cada frente, feche quando o envio estiver concluído e reabra só com motivo."
        breadcrumbs={[{ label: 'Gestão' }, { label: 'Financeiro', href: '/financeiro' }]}
        actions={
          <span className="flex flex-wrap gap-2">
            {podeExcluir && (
              <span className="inline-flex" title={dicaExcluir}>
                <button type="button" className="tfd-btn tfd-btn-secondary" disabled={!excluivel} onClick={() => setDialogo('excluir')} aria-describedby={dicaExcluir ? 'dica-excluir' : undefined}>
                  <Trash2 size={15} /> Excluir competência
                </button>
                {dicaExcluir && <span id="dica-excluir" className="sr-only">{dicaExcluir}</span>}
              </span>
            )}
            {podeExportar && (
              <MenuExportar
                desabilitado={aguardando || falhou || !vista || linhasExportaveis === 0}
                dica={linhasExportaveis === 0 && !aguardando ? 'Nenhuma linha para exportar com a busca e o filtro atuais' : undefined}
                onExportar={async (fmt) => {
                  try {
                    await exportar(fmt);
                  } catch {
                    toast.error('Não foi possível gerar o arquivo', 'Tente de novo.');
                  }
                }}
              />
            )}
          </span>
        }
      />

      {competenciaCompleta(c) && (
        <p className="mb-4 px-4 py-3" role="status" style={{ background: 'var(--tfd-success-bg)', border: '1px solid var(--tfd-status-success-border)', borderRadius: 8, fontSize: 14, color: 'var(--tfd-status-success-text)' }}>
          <strong>Competência completa.</strong> Faturamento e BPA estão fechados. Se uma das frentes for reaberta, a competência deixa de ser completa.
        </p>
      )}

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
              {nomeFrente(fr)}
              <span className={atual ? 'tfd-badge tfd-badge--primary' : 'tfd-badge'} style={atual ? undefined : { background: 'var(--tfd-100)', color: 'var(--tfd-600)' }}>{quantidadeLinhas(c.frentes[fr])}</span>
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
                {podeFechar && (
                  // A dica fica no invólucro: botão desabilitado não recebe o mouse em todos os navegadores.
                  <span className="inline-flex" title={dicaFechar}>
                    <button type="button" className="tfd-btn tfd-btn-secondary" onClick={() => setDialogo('fechar')} disabled={!!dicaFechar} aria-describedby={dicaFechar ? 'dica-fechar' : undefined}>
                      <Lock size={15} /> Fechar competência
                    </button>
                    {dicaFechar && <span id="dica-fechar" className="sr-only">{dicaFechar}</span>}
                  </span>
                )}
                {podeLinhas && (
                  <button type="button" className="tfd-btn tfd-btn-primary" onClick={() => setAdicionando(true)}>
                    <Plus size={15} /> Adicionar linhas
                  </button>
                )}
              </>
            ) : podeReabrir ? (
              <button type="button" className="tfd-btn tfd-btn-secondary" onClick={() => setDialogo('reabrir')}>
                <LockOpen size={15} /> Reabrir competência
              </button>
            ) : null}
          </span>
        </div>
        {aberta && frente === 'bpa' && podeFechar && !carregando && !erro && linhasNaAba > 0 && pendentesBpa > 0 && (
          <div className="flex items-center gap-2" style={{ padding: '10px 1.25rem', borderTop: '1px dashed var(--tfd-surface-border)', fontSize: 13.5, color: 'var(--tfd-text-secondary)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--tfd-status-warning-text)' }} />
            O BPA só pode ser fechado com todas as linhas marcadas como lançadas. {pendentesBpa === 1 ? 'Falta 1 linha' : `Faltam ${pendentesBpa} linhas`}, somando Ajuda de Custo e Deslocamentos.
          </div>
        )}
        {!aberta && (
          <div className="flex items-center gap-2" style={{ padding: '10px 1.25rem', borderTop: '1px dashed var(--tfd-surface-border)', fontSize: 13.5, color: 'var(--tfd-text-secondary)', background: 'var(--tfd-50)', borderRadius: '0 0 8px 8px' }}>
            <Lock size={14} style={{ color: 'var(--tfd-text-muted)' }} />
            Fechada em {f.fechadaEm ? dataHora(f.fechadaEm) : 'data não registrada'}. Só visualização: os dados abaixo são a cópia gravada no fechamento e não mudam se a origem mudar.
          </div>
        )}
        {aberta && f.reaberturas > 0 && (
          <div className="flex items-center gap-2" style={{ padding: '10px 1.25rem', borderTop: '1px dashed var(--tfd-surface-border)', fontSize: 13.5, color: 'var(--tfd-status-caution-text)', background: 'var(--tfd-status-caution-bg)', borderRadius: '0 0 8px 8px' }}>
            <AlertTriangle size={14} />
            Competência reaberta. Linhas incluídas depois da reabertura aparecem com fundo amarelo claro na tabela.
          </div>
        )}
      </section>

      {aguardando || (!aberta && !copia && !erro) ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /></div>
      ) : falhou || !vista ? (
        <section className="mb-5" style={cartao}><ErroLinhas onTentarNovamente={tentarNovamente} /></section>
      ) : frente === 'faturamento' ? (
        <ConteudoFaturamento
          linhas={fatVisiveis}
          opcoes={opcoes}
          aposReabertura={vista.aposReabertura}
          vazio={editavel ? <>Competência vazia. Use <strong>Adicionar linhas</strong> para escolher os itens de {nome}.</> : 'Nenhum item nesta competência.'}
        />
      ) : (
        <ConteudoBpa
          linhas={bpaVisiveis}
          procedimento={procedimento}
          opcoes={opcoes}
          vista={vista}
          colunaLancado={colunaLancado}
          vazio={editavel ? <>Nenhuma linha de {procedimento === 'ajuda_custo' ? 'ajuda de custo' : 'deslocamento'} nesta competência. Use <strong>Adicionar linhas</strong>.</> : 'Nenhuma linha nesta competência.'}
        />
      )}

      <Historico
        eventos={f.historico}
        frente={frente}
        onConsultar={(fid) => setConsultando(f.fechamentos.find((x) => x.id === fid) ?? null)}
        fechamentos={f.fechamentos}
      />

      <AdicionarLinhas
        open={adicionando && editavel}
        onClose={() => setAdicionando(false)}
        frente={frente}
        rotuloCompetencia={nome}
        mesCompetencia={mesCompetencia}
        disponiveisFaturamento={fat.filter((l) => !usadasFat.has(l.chave))}
        disponiveisBpa={bpa.filter((l) => !usadasBpa.has(l.chave))}
        sig={sig}
        carregando={carregando}
        erro={erro}
        onTentarNovamente={tentarNovamente}
        onVer={onVer}
        onIncluir={(chaves, detalhe) => {
          const r = incluirLinhas(c.id, frente, chaves, quem, detalhe);
          if (r.ok) toast.success(`${chaves.length} ${chaves.length === 1 ? 'linha incluída' : 'linhas incluídas'}`, `Competência de ${nome}, ${nomeFrente(frente)}.`);
          return r;
        }}
      />

      {((dialogo === 'fechar' && aberta && podeFechar && !dicaFechar) || (dialogo === 'reabrir' && !aberta && podeReabrir)) && (
        <DialogoFrente
          modo={dialogo}
          frente={frente}
          nome={nome}
          quantidade={linhasNaAba}
          onCancelar={() => setDialogo(null)}
          onConfirmar={(motivo) => {
            if (dialogo === 'fechar') {
              const nova = montarCopia(frente);
              if (nova && avisarConflito(fecharFrente(c.id, frente, quem, nova))) {
                toast.success('Competência fechada', `${nomeFrente(frente)} de ${nome} agora é só visualização, com a cópia do que foi enviado.`);
              }
            } else if (avisarConflito(reabrirFrente(c.id, frente, quem, motivo))) {
              toast.warning('Competência reaberta', 'A reabertura e o motivo ficaram registrados no histórico. A cópia do fechamento continua disponível para consulta.');
            }
            setDialogo(null);
          }}
        />
      )}

      <ConfirmDialog
        open={dialogo === 'excluir' && podeExcluir && excluivel}
        tone="delete"
        title={`Excluir a competência de ${nome}?`}
        description={`O Faturamento e o BPA de ${nome} deixam de existir e as ${c.frentes.faturamento.itens.length + c.frentes.bpa.itens.length} linhas incluídas voltam a ficar disponíveis para outras competências. A exclusão fica registrada no log do sistema.`}
        confirmLabel="Excluir competência"
        confirmIcon={<Trash2 size={15} />}
        onClose={() => setDialogo(null)}
        onConfirm={() => {
          const detalhes = { competencia: nome, linhas_faturamento: c.frentes.faturamento.itens.length, linhas_bpa: c.frentes.bpa.itens.length };
          setDialogo(null);
          if (!avisarConflito(excluirCompetencia(c.id))) return;
          void registrarNoLog(user ? { id: user.id, perfil: user.perfil } : null, 'COMPETENCIA_EXCLUIDA', c.id, detalhes);
          toast.success('Competência excluída', 'As linhas voltaram a ficar disponíveis.');
          router.push('/financeiro');
        }}
      />

      <ConsultaFechamento fechamento={consultando} frente={frente} nome={nome} onVer={onVer} onClose={() => setConsultando(null)} />
    </div>
  );
}

/* ── Conteúdo das abas (também usado na consulta de um fechamento) ───────── */

function ConteudoFaturamento({ linhas, opcoes, aposReabertura, vazio }: {
  linhas: LinhaFaturamento[]; opcoes: OpcoesColunas; aposReabertura: Set<string>; vazio: React.ReactNode;
}) {
  const { valorBruto, reembolsos, totalReembolsos, totalPagar } = totaisFaturamento(linhas);
  return (
    <>
      <Indicadores itens={[
        { rotulo: 'Bilhetes emitidos', valor: String(linhas.length), icone: <Plane size={12} /> },
        { rotulo: 'Valor bruto', valor: fmtBRL(valorBruto), icone: <Wallet size={12} /> },
        { rotulo: 'Reembolsos ao TFD', valor: fmtBRL(totalReembolsos), icone: <Receipt size={12} /> },
        { rotulo: 'Total a pagar', valor: fmtBRL(totalPagar) },
      ]} />
      <Secao titulo="Itens faturados" quantidade={linhas.length}>
        <Tabela
          colunas={colunasFaturamento(opcoes)}
          linhas={linhas}
          chave={(l) => l.chave}
          destaque={(l) => (aposReabertura.has(l.chave) ? { background: 'var(--tfd-status-caution-bg)' } : undefined)}
          vazio={vazio}
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
          rotuloRegistros="reembolsos"
        />
      </Secao>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5" style={{ ...cartao, padding: '16px 20px', background: 'var(--tfd-success-bg)', borderColor: 'var(--tfd-status-success-border)' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--tfd-status-success-text)' }}>Total do faturamento</p>
          <p style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--tfd-text-secondary)' }}>{valorPorExtenso(totalPagar)}.</p>
        </div>
        <p style={{ fontFamily: 'var(--tfd-mono)', fontSize: 26, fontWeight: 700, color: 'var(--tfd-status-success-text)' }}>{fmtBRL(totalPagar)}</p>
      </div>
    </>
  );
}

function ConteudoBpa({ linhas, procedimento, opcoes, vista, colunaLancado, vazio }: {
  linhas: LinhaBpa[]; procedimento: ProcedimentoBpa; opcoes: OpcoesColunas; vista: Vista; colunaLancado: Coluna<LinhaBpa>; vazio: React.ReactNode;
}) {
  const lancadas = linhas.filter((l) => vista.lancados.has(l.chave)).length;
  const total = linhas.reduce((s, l) => s + valorBpa(l, vista.sig), 0);
  return (
    <>
      <Indicadores itens={[
        { rotulo: 'Total de linhas', valor: String(linhas.length), icone: <ClipboardList size={12} /> },
        { rotulo: 'Lançadas no BPA', valor: String(lancadas), cor: 'var(--tfd-status-success-text)' },
        { rotulo: 'Pendentes', valor: String(linhas.length - lancadas), cor: 'var(--tfd-status-warning-text)' },
        { rotulo: 'Valor total SIGTAP', valor: fmtBRL(total) },
      ]} />
      <Secao titulo="Itens para lançamento" quantidade={linhas.length} subtitulo={procedimento === 'ajuda_custo' ? 'Ajuda de Custo' : 'Deslocamentos'}>
        <Tabela
          colunas={[colunaLancado, ...(procedimento === 'ajuda_custo' ? colunasBpaAjuda(opcoes, vista.sig) : colunasBpaDeslocamento(opcoes, vista.sig))]}
          linhas={linhas}
          chave={(l) => l.chave}
          destaque={(l) => ({ ...(vista.lancados.has(l.chave) ? { opacity: 0.6 } : {}), ...(vista.aposReabertura.has(l.chave) ? { background: 'var(--tfd-status-caution-bg)' } : {}) })}
          vazio={vazio}
        />
      </Secao>
    </>
  );
}

/** Consulta do que foi enviado num fechamento anterior (ou no atual). */
function ConsultaFechamento({ fechamento, frente, nome, onVer, onClose }: {
  fechamento: Fechamento | null; frente: Frente; nome: string; onVer: (sid: string) => void; onClose: () => void;
}) {
  const [procedimento, setProcedimento] = useState<ProcedimentoBpa>('ajuda_custo');
  const vista = fechamento ? vistaDaCopia(fechamento) : null;
  const opcoes: OpcoesColunas = { mesCompetencia: vista?.mesCompetencia, onVer };
  const colunaLancado: Coluna<LinhaBpa> = {
    key: 'lancado', header: <span title="Lançada no BPA">BPA</span>, align: 'center', width: '52px',
    render: (l) => <input type="checkbox" aria-label="Lançada no BPA" disabled checked={vista?.lancados.has(l.chave) ?? false} readOnly />,
  };
  const quantidade = fechamento ? (fechamento.linhasFaturamento ?? fechamento.linhasBpa ?? []).length : 0;
  return (
    <Drawer
      open={!!fechamento}
      onClose={onClose}
      width="min(1240px, 96vw)"
      title={`O que foi enviado: ${nomeFrente(frente)} de ${nome}`}
      subtitle={fechamento
        ? `Cópia gravada no fechamento de ${dataHora(fechamento.em)} por ${fechamento.por}, com ${quantidade} ${quantidade === 1 ? 'linha' : 'linhas'}.${fechamento.reabertaEm ? ` Reaberta em ${dataHora(fechamento.reabertaEm)}.` : ''}`
        : undefined}
    >
      {fechamento?.legado && (
        <p className="mb-4 flex items-center gap-2" style={{ fontSize: 13.5, color: 'var(--tfd-status-caution-text)', background: 'var(--tfd-status-caution-bg)', padding: '8px 12px', borderRadius: 6 }}>
          <AlertTriangle size={14} /> Fechamento anterior à cópia automática: os dados foram copiados na primeira consulta depois da mudança.
        </p>
      )}
      {vista && (frente === 'faturamento' ? (
        <ConteudoFaturamento linhas={vista.fat} opcoes={opcoes} aposReabertura={vista.aposReabertura} vazio="Nenhum item neste fechamento." />
      ) : (
        <>
          <label className="block mb-4" style={{ width: 'fit-content' }}>
            <span style={rotulo}><ClipboardList size={12} /> Procedimento</span>
            <select value={procedimento} onChange={(e) => setProcedimento(e.target.value as ProcedimentoBpa)} style={{ ...campo, minWidth: 180 }}>
              <option value="ajuda_custo">Ajuda de Custo</option>
              <option value="deslocamento">Deslocamentos</option>
            </select>
          </label>
          <ConteudoBpa
            linhas={vista.bpa.filter((l) => l.procedimento === procedimento)}
            procedimento={procedimento}
            opcoes={opcoes}
            vista={vista}
            colunaLancado={colunaLancado}
            vazio="Nenhuma linha deste procedimento no fechamento."
          />
        </>
      ))}
    </Drawer>
  );
}

const FORMATOS: { id: Formato; rotulo: string; apoio: string; icone: React.ReactNode }[] = [
  { id: 'pdf', rotulo: 'PDF', apoio: 'para imprimir ou anexar', icone: <FileText size={16} /> },
  { id: 'csv', rotulo: 'CSV', apoio: 'texto separado por ponto e vírgula', icone: <Sheet size={16} /> },
  { id: 'xlsx', rotulo: 'Excel', apoio: 'planilha com valores numéricos', icone: <FileSpreadsheet size={16} /> },
];

/** Menu "Exportar" da aba: exporta o que está na tela, com a busca e o filtro atuais. */
function MenuExportar({ desabilitado, dica, onExportar }: { desabilitado: boolean; dica?: string; onExportar: (f: Formato) => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  return (
    <div ref={ref} className="relative" title={dica}>
      <button
        type="button" className="tfd-btn tfd-btn-primary"
        aria-haspopup="menu" aria-expanded={aberto} disabled={desabilitado || gerando}
        onClick={() => setAberto((v) => !v)}
      >
        <Download size={15} /> {gerando ? 'Gerando...' : 'Exportar'} <ChevronDown size={15} />
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-30 flex flex-col gap-1"
          style={{ top: 'calc(100% + 6px)', width: 'min(320px, calc(100vw - 32px))', padding: 6, background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, boxShadow: 'var(--tfd-shadow-md)' }}
        >
          {FORMATOS.map((fm, i) => (
            <button
              key={fm.id} type="button" role="menuitem" autoFocus={i === 0}
              onClick={async () => {
                setAberto(false);
                setGerando(true);
                try { await onExportar(fm.id); } finally { setGerando(false); }
              }}
              className="flex items-center gap-3 text-left hover:bg-[var(--tfd-surface-hover)]"
              style={{ minHeight: 40, padding: '0 10px', borderRadius: 6 }}
            >
              <span style={{ color: 'var(--tfd-blue-500)', display: 'inline-flex' }}>{fm.icone}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tfd-text-primary)' }}>{fm.rotulo}</span>
              <span style={{ fontSize: 13, color: 'var(--tfd-text-muted)' }}>{fm.apoio}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: 'aberta' | 'fechada' }) {
  return status === 'aberta'
    ? <span className="tfd-badge tfd-badge--success">Aberta</span>
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

function Historico({ eventos, frente, fechamentos, onConsultar }: {
  eventos: EventoHistorico[]; frente: Frente; fechamentos: Fechamento[]; onConsultar: (fechamentoId: string) => void;
}) {
  const existe = new Set(fechamentos.map((x) => x.id));
  return (
    <section className="overflow-hidden" style={cartao}>
      <header className="flex items-center gap-2.5" style={{ padding: '1.1rem 1.25rem 0.85rem' }}>
        <History size={16} style={{ color: 'var(--tfd-text-muted)' }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--tfd-text-primary)' }}>Histórico {frente === 'faturamento' ? 'do Faturamento' : 'do BPA'}</h3>
        <span style={{ fontSize: 13, color: 'var(--tfd-400)' }}>Registro de auditoria: quem fez, quando e o quê</span>
      </header>
      <ol style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
        {[...eventos].reverse().map((e) => (
          <li key={e.id} className="flex flex-wrap items-start gap-x-4 gap-y-1" style={{ padding: '10px 1.25rem', borderBottom: '1px solid var(--tfd-100)', fontSize: 13.5, background: e.tipo === 'reaberta' ? 'var(--tfd-status-caution-bg)' : undefined }}>
            <span style={{ fontFamily: 'var(--tfd-mono)', fontSize: 12.5, color: 'var(--tfd-text-muted)', minWidth: 120 }}>{dataHora(e.em)}</span>
            <span className="flex-1 min-w-[220px]">
              <strong style={{ fontWeight: 600, color: 'var(--tfd-text-primary)' }}>{TEXTO_EVENTO[e.tipo]}</strong>
              {e.quantidade != null && e.tipo !== 'fechada' && <> · {e.quantidade} {e.quantidade === 1 ? 'linha' : 'linhas'}</>}
              {e.tipo === 'fechada' && e.quantidade != null && <> com {e.quantidade} {e.quantidade === 1 ? 'linha' : 'linhas'}</>}
              {e.detalhe && <span className="block" style={{ fontSize: 12.5, color: 'var(--tfd-text-muted)' }}>{e.detalhe}</span>}
              {e.motivo && <span className="block" style={{ fontSize: 13, color: 'var(--tfd-status-caution-text)' }}>Motivo: {e.motivo}</span>}
              {e.tipo === 'fechada' && e.fechamentoId && existe.has(e.fechamentoId) && (
                <button type="button" className="inline-flex items-center gap-1 mt-1 hover:underline" style={{ fontSize: 13, color: 'var(--tfd-blue-500)', fontWeight: 500 }} onClick={() => onConsultar(e.fechamentoId!)}>
                  <Eye size={14} /> Ver o que foi enviado
                </button>
              )}
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
  const motivoOk = motivo.trim().length >= 10;
  const podeConfirmar = modo === 'fechar' || (motivoOk && ciente);

  if (modo === 'fechar') {
    return (
      <ConfirmDialog
        open
        tone="edit"
        icon={Lock}
        title={`Fechar ${nomeFrente(frente)} de ${nome}?`}
        description={`A competência fica trancada com as ${quantidade} ${quantidade === 1 ? 'linha' : 'linhas'} de hoje, e o sistema guarda uma cópia de cada linha com os valores atuais. Depois de fechada, a tela mostra sempre essa cópia, mesmo que a origem mude: nada pode ser incluído, removido ou marcado. Para mudar, será preciso reabrir com motivo.`}
        confirmLabel="Fechar competência"
        confirmIcon={<Lock size={15} />}
        onClose={onCancelar}
        onConfirm={() => onConfirmar('')}
      />
    );
  }

  return (
    <ConfirmDialog
      open
      tone="warning"
      title={`Reabrir ${nomeFrente(frente)} de ${nome}?`}
      confirmLabel="Reabrir competência"
      confirmIcon={<LockOpen size={15} />}
      confirmDisabled={!podeConfirmar}
      onClose={onCancelar}
      onConfirm={() => { if (podeConfirmar) onConfirmar(motivo.trim()); }}
    >
      <ul style={{ fontSize: 14, color: 'var(--tfd-text-secondary)', lineHeight: 1.5, paddingLeft: 18, listStyle: 'disc' }}>
        <li>A aba volta a mostrar os dados atuais da origem, e os valores podem mudar.</li>
        <li>A cópia do que foi enviado continua guardada e pode ser consultada no histórico.</li>
        <li>A reabertura, o motivo e tudo o que for feito depois ficam no histórico de auditoria.</li>
        <li>Linhas incluídas após a reabertura ficam destacadas na tabela.</li>
      </ul>
      <label className="block mt-4">
        <span style={rotulo}>Motivo da reabertura *</span>
        <textarea
          data-autofocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          required
          aria-describedby="motivo-minimo"
          placeholder="Ex.: auditoria da SES pediu inclusão de passagem emitida em atraso."
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, fontSize: 14 }}
        />
        <span id="motivo-minimo" style={{ fontSize: 12, color: motivoOk ? 'var(--tfd-text-muted)' : 'var(--tfd-status-caution-accent)' }}>Mínimo de 10 caracteres.</span>
      </label>
      <label className="flex items-start gap-2 mt-3" style={{ fontSize: 13.5, color: 'var(--tfd-text-primary)' }}>
        <input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} style={{ marginTop: 3 }} />
        Entendo que a reabertura fica registrada e que os valores desta competência podem mudar.
      </label>
    </ConfirmDialog>
  );
}
