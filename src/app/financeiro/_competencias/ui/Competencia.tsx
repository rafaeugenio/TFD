'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, Check, ChevronDown, ClipboardList, Download, Eye, FileSpreadsheet, FileText, HandCoins, History, Lock, LockOpen,
  Plane, Plus, ReceiptText, Search, Sheet, Trash2, Wallet,
} from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import ConfirmDialog from '@/shared/components/confirm-dialog/ConfirmDialog';
import Drawer from '@/shared/components/drawer/Drawer';
import { useToast } from '@/shared/components/toast/Toast';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { useObitos } from '@/app/fluxo-v2/_state/obitoStore';
import { MES_LABEL, fmtBRL, fmtDataBR, valorPorExtenso } from '@/app/relatorios/_shared/format';
import {
  carregarBpa, carregarDadosSolicitacoes, carregarFaturamento, carregarLancados, carregarReembolsos, carregarValoresSigtap, marcarLancado,
  montarLinhasObito, sigtapDasLinhas, valorBpa,
  type DadosSolicitacao, type LinhaBpa, type LinhaFaturamento, type LinhaObito, type LinhaReembolso, type ProcedimentoBpa,
} from '../dados';
import {
  FRENTES, MENSAGEM_CONFLITO, aberturaDaCompetencia, linhasDaCopia, chavesUsadas, competenciaCompleta, completarCopiaLegada, conferirFrenteAberta, copiaAtual,
  excluirCompetencia, fecharFrente, incluirLinhas, podeExcluirCompetencia, quantidadeLinhas, reabrirFrente, registrarDespesasObito,
  registrarReembolso, removerLinha, useCompetencias,
  type Competencia as TCompetencia, type CopiaNova, type EventoHistorico, type Fechamento, type Frente,
} from '../store';
import {
  procedimentosBpa, resumoCompetencia, totaisObito, totaisReembolso, totalFaturamento, vistaDaCopia, vistaDaOrigem,
  type Origem, type ResumoCompetencia, type Vista,
} from '../resumo';
import {
  gerarArquivo, planilhaBpaAjuda, planilhaBpaDeslocamento, planilhaFaturamento, planilhaObito, planilhaReembolso, registrarNoLog, type Formato,
} from '../exportar';
import AdicionarLinhas from './AdicionarLinhas';
import ErroLinhas from './ErroLinhas';
import Tabela, { type Coluna } from './Tabela';
import { DrawerDespesasObito, DrawerReembolso } from './Registros';
import { colunasBpaAjuda, colunasBpaDeslocamento, colunasFaturamento, colunasObito, colunasReembolso, type OpcoesColunas } from './colunas';

const cartao: React.CSSProperties = { background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, boxShadow: 'var(--tfd-shadow-sm)' };
const rotulo: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)', marginBottom: 6 };
const campo: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid var(--tfd-300)', borderRadius: 6, background: 'white', fontSize: 14, color: 'var(--tfd-text-primary)' };
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const nomeCompetencia = (c: Pick<TCompetencia, 'ano' | 'mes'>) => `${MES_LABEL[c.mes - 1].toLowerCase()} de ${c.ano}`;
const NOME_FRENTE: Record<Frente, string> = { faturamento: 'Faturamento', bpa: 'BPA', reembolso: 'Reembolso', obito: 'Óbito' };
const nomeFrente = (f: Frente) => NOME_FRENTE[f];
const ICONE_FRENTE: Record<Frente, React.ReactNode> = {
  faturamento: <FileText size={16} />, bpa: <ClipboardList size={16} />, reembolso: <HandCoins size={16} />, obito: <ReceiptText size={16} />,
};
/** dd/mm/aaaa hh:mm */
const dataHora = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

/** Linha aberta num drawer de registro (Reembolso ou Óbito). */
type Registrando =
  | { frente: 'reembolso'; linha: LinhaReembolso }
  | { frente: 'obito'; linha: LinhaObito; modo: 'ler' | 'editar' };

/**
 * Competência de um mês, com as frentes Faturamento, BPA, Reembolso e Óbito
 * em abas. Cada frente começa vazia, recebe linhas escolhidas, é fechada
 * (fica só leitura, mostrando a cópia gravada no fechamento) e pode ser
 * reaberta com motivo; tudo fica no histórico da frente.
 */
export default function Competencia({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentUser();
  const quem = user?.nome ?? 'Usuário';
  const { can } = usePermissions();
  const competencias = useCompetencias();
  const obitosSinalizados = useObitos();
  const c = competencias.find((x) => x.id === id);

  const [frente, setFrente] = useState<Frente>('faturamento');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [fat, setFat] = useState<LinhaFaturamento[]>([]);
  const [bpa, setBpa] = useState<LinhaBpa[]>([]);
  const [sig, setSig] = useState<Record<string, number>>({});
  const [lancados, setLancados] = useState<Set<string>>(new Set());
  const [reembolsos, setReembolsos] = useState<LinhaReembolso[]>([]);
  const [dadosSol, setDadosSol] = useState<Map<string, DadosSolicitacao>>(new Map());
  const [adicionando, setAdicionando] = useState(false);
  const [dialogo, setDialogo] = useState<'fechar' | 'reabrir' | 'excluir' | null>(null);
  const [procedimento, setProcedimento] = useState<ProcedimentoBpa>('ajuda_custo');
  const [busca, setBusca] = useState('');
  const [consultando, setConsultando] = useState<Fechamento | null>(null);
  const [registrando, setRegistrando] = useState<Registrando | null>(null);

  // Ids sinalizados com óbito: quando mudam (sinalização feita em outra tela), busca de novo.
  const idsObito = useMemo(() => Object.keys(obitosSinalizados).sort().join(','), [obitosSinalizados]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [f, b, l, r, d] = await Promise.all([
          carregarFaturamento(), carregarBpa(), carregarLancados(), carregarReembolsos(),
          carregarDadosSolicitacoes(idsObito ? idsObito.split(',') : []),
        ]);
        const s = await carregarValoresSigtap(b);
        if (!ativo) return;
        setFat(f); setBpa(b); setLancados(l); setSig(s); setReembolsos(r); setDadosSol(d); setErro(false);
      } catch {
        if (!ativo) return;
        setFat([]); setBpa([]); setLancados(new Set()); setSig({}); setReembolsos([]); setDadosSol(new Map()); setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [tentativa, idsObito]);

  const tentarNovamente = () => { setCarregando(true); setErro(false); setTentativa((n) => n + 1); };

  const linhasObito = useMemo(() => montarLinhasObito(obitosSinalizados, dadosSol), [obitosSinalizados, dadosSol]);
  const origem: Origem = useMemo(
    () => ({ fat, bpa, sig, lancados, reembolsos, obitos: linhasObito }),
    [fat, bpa, sig, lancados, reembolsos, linhasObito],
  );
  const usadas = useMemo(
    () => Object.fromEntries(FRENTES.map((fr) => [fr, chavesUsadas(competencias, fr)])) as Record<Frente, Map<string, TCompetencia>>,
    [competencias],
  );
  const mesCompetencia = c ? `${c.ano}-${String(c.mes).padStart(2, '0')}` : '';

  /** Cópia das linhas da frente como estão agora na origem (usada ao fechar). */
  const montarCopia = (fr: Frente): CopiaNova | null => {
    if (!c) return null;
    const fc = c.frentes[fr];
    const v = vistaDaOrigem(c, fr, origem);
    const apos = fc.itens.filter((i) => i.aposReabertura).map((i) => i.chave);
    if (fr === 'faturamento') {
      const total = totalFaturamento(v.fat);
      return { mesCompetencia, linhasFaturamento: v.fat, aposReabertura: apos, totais: { bilhetes: v.fat.length, valorBruto: total, totalPagar: total } };
    }
    if (fr === 'reembolso') {
      const t = totaisReembolso(v.reembolsos, v.regReembolso);
      const registros = Object.fromEntries(v.reembolsos.filter((l) => v.regReembolso[l.chave]).map((l) => [l.chave, v.regReembolso[l.chave]]));
      return { mesCompetencia, linhasReembolso: v.reembolsos, registrosReembolso: registros, aposReabertura: apos, totais: { linhas: t.linhas, comValor: t.comValor, totalReceber: t.totalReceber } };
    }
    if (fr === 'obito') {
      const t = totaisObito(v.obitos, v.regObito);
      const registros = Object.fromEntries(v.obitos.filter((l) => v.regObito[l.chave]).map((l) => [l.chave, v.regObito[l.chave]]));
      return { mesCompetencia, linhasObito: v.obitos, registrosObito: registros, aposReabertura: apos, totais: { linhas: t.linhas, comDespesa: t.comDespesa, totalDespesas: t.totalDespesas } };
    }
    const s = sigtapDasLinhas(v.bpa, sig);
    const lanc = v.bpa.filter((l) => lancados.has(l.chave)).map((l) => l.chave);
    return {
      mesCompetencia, linhasBpa: v.bpa, sigtap: s, lancados: lanc, aposReabertura: apos,
      totais: { linhas: v.bpa.length, lancadas: lanc.length, valorSigtap: v.bpa.reduce((acc, l) => acc + valorBpa(l, s), 0), procedimentos: procedimentosBpa(v.bpa) },
    };
  };

  // Frente fechada antes de existir a cópia: grava a cópia com os dados de agora, uma única vez.
  useEffect(() => {
    if (!c || carregando || erro) return;
    for (const fr of FRENTES) {
      if (c.frentes[fr].status === 'fechada' && !copiaAtual(c.frentes[fr])) {
        const copia = montarCopia(fr);
        if (copia) completarCopiaLegada(c.id, fr, copia);
      }
    }
    // montarCopia lê o mesmo estado listado aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, carregando, erro, origem]);

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
  const podeRegistrarReembolso = can('competencia.reembolso.registrar_valor');
  const podeRegistrarDespesa = can('competencia.obito.registrar_despesa');
  const podeExcluir = can('competencia.excluir');
  const editavel = aberta && podeLinhas;

  // Com a aba fechada, tudo vem da cópia; aberta, da origem.
  const vista: Vista | null = aberta ? vistaDaOrigem(c, frente, origem) : copia ? vistaDaCopia(copia) : null;
  // Aberta depende da consulta à origem; fechada só da cópia.
  const aguardando = aberta ? carregando : !copia && carregando;
  const falhou = aberta ? erro : !copia && erro;

  const t = norm(busca.trim());
  const fatVisiveis = (vista?.fat ?? []).filter((l) => !t || norm(`${l.passageiro} ${l.processo}`).includes(t));
  const bpaDaAba = vista?.bpa ?? [];
  const bpaVisiveis = bpaDaAba.filter((l) => l.procedimento === procedimento).filter((l) => !t || norm(`${l.nome} ${l.processo}`).includes(t));
  const reembVisiveis = (vista?.reembolsos ?? []).filter((l) => !t || norm(`${l.passageiro} ${l.processo}`).includes(t));
  const obitoVisiveis = (vista?.obitos ?? []).filter((l) => !t || norm(`${l.paciente} ${l.processo} ${l.documento}`).includes(t));

  // Regras de fechamento: pelo menos uma linha; BPA só com todas lançadas;
  // Reembolso só com valor em todas; Óbito só com despesas em todas.
  const linhasNaAba = frente === 'faturamento' ? (vista?.fat.length ?? 0)
    : frente === 'bpa' ? bpaDaAba.length
    : frente === 'reembolso' ? (vista?.reembolsos.length ?? 0)
    : (vista?.obitos.length ?? 0);
  const pendentesBpa = bpaDaAba.filter((l) => !lancados.has(l.chave)).length;
  const pendentesReembolso = vista ? totaisReembolso(vista.reembolsos, vista.regReembolso).pendentes : 0;
  const pendentesObito = vista ? totaisObito(vista.obitos, vista.regObito).pendentes : 0;
  const falta = (n: number) => (n === 1 ? 'Falta 1 linha' : `Faltam ${n} linhas`);
  const dicaFechar = erro
    ? 'Não foi possível carregar as linhas. Tente novamente antes de fechar'
    : carregando ? 'Carregando as linhas'
    : linhasNaAba === 0 ? 'Inclua pelo menos uma linha antes de fechar'
    : frente === 'bpa' && pendentesBpa > 0 ? `Marque "Lançada no BPA" em todas as linhas antes de fechar. ${falta(pendentesBpa)}`
    : frente === 'reembolso' && pendentesReembolso > 0 ? `Registre a data e o valor do reembolso em todas as linhas antes de fechar. ${falta(pendentesReembolso)}`
    : frente === 'obito' && pendentesObito > 0 ? `Registre as despesas em todas as linhas antes de fechar. ${falta(pendentesObito)}`
    : undefined;

  const avisarConflito = (r: { ok: boolean; conflito?: keyof typeof MENSAGEM_CONFLITO }) => {
    if (!r.ok && r.conflito) toast.error('Ação não concluída', MENSAGEM_CONFLITO[r.conflito]);
    return r.ok;
  };

  const onVer = (sid: string) => router.push(`/fluxo-v2/solicitacoes/${sid}`);
  const detalheDaLinha = (chave: string) => {
    if (frente === 'faturamento') { const l = fat.find((x) => x.chave === chave); return l ? `${l.processo} · ${l.passageiro}` : chave; }
    if (frente === 'bpa') { const l = bpa.find((x) => x.chave === chave); return l ? `${l.processo} · ${l.nome}` : chave; }
    if (frente === 'reembolso') { const l = reembolsos.find((x) => x.chave === chave); return l ? `${l.processo} · ${l.passageiro}` : chave; }
    const l = linhasObito.find((x) => x.chave === chave);
    return l ? `${l.processo} · ${l.paciente}` : chave;
  };
  const remover = (chave: string) => {
    if (!avisarConflito(removerLinha(c.id, frente, chave, quem, detalheDaLinha(chave)))) return;
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
      const total = totalFaturamento(fatVisiveis);
      planilha = {
        ...planilhaFaturamento(fatVisiveis, vista.mesCompetencia, vista.aposReabertura),
        resumo: [...base, { rotulo: 'Bilhetes emitidos', valor: String(fatVisiveis.length) }, { rotulo: 'Total a pagar', valor: fmtBRL(total) }],
      };
      quantidade = fatVisiveis.length;
    } else if (frente === 'reembolso') {
      const tt = totaisReembolso(reembVisiveis, vista.regReembolso);
      planilha = {
        ...planilhaReembolso(reembVisiveis, vista.regReembolso, vista.aposReabertura),
        resumo: [...base, { rotulo: 'Linhas', valor: String(tt.linhas) }, { rotulo: 'Com valor registrado', valor: String(tt.comValor) }, { rotulo: 'Pendentes de valor', valor: String(tt.pendentes) }, { rotulo: 'Total a receber', valor: fmtBRL(tt.totalReceber) }],
      };
      quantidade = reembVisiveis.length;
    } else if (frente === 'obito') {
      const tt = totaisObito(obitoVisiveis, vista.regObito);
      planilha = {
        ...planilhaObito(obitoVisiveis, vista.regObito, vista.aposReabertura),
        resumo: [...base, { rotulo: 'Óbitos na competência', valor: String(tt.linhas) }, { rotulo: 'Com despesa registrada', valor: String(tt.comDespesa) }, { rotulo: 'Total de despesas', valor: fmtBRL(tt.totalDespesas) }],
      };
      quantidade = obitoVisiveis.length;
    } else {
      const total = bpaVisiveis.reduce((s, l) => s + valorBpa(l, vista.sig), 0);
      const lanc = bpaVisiveis.filter((l) => vista.lancados.has(l.chave)).length;
      const tabela = procedimento === 'ajuda_custo'
        ? planilhaBpaAjuda(bpaVisiveis, vista.sig, vista.lancados, vista.mesCompetencia)
        : planilhaBpaDeslocamento(bpaVisiveis, vista.sig, vista.lancados, vista.mesCompetencia);
      planilha = {
        ...tabela,
        resumo: [...base, { rotulo: 'Total de linhas', valor: String(bpaVisiveis.length) }, { rotulo: 'Lançadas no BPA', valor: String(lanc) }, { rotulo: 'Pendentes', valor: String(bpaVisiveis.length - lanc) }, { rotulo: 'Procedimentos', valor: String(procedimentosBpa(bpaVisiveis)) }, { rotulo: 'Valor total SIGTAP', valor: fmtBRL(total) }],
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

  const linhasExportaveis = frente === 'faturamento' ? fatVisiveis.length
    : frente === 'bpa' ? bpaVisiveis.length
    : frente === 'reembolso' ? reembVisiveis.length
    : obitoVisiveis.length;
  const excluivel = podeExcluirCompetencia(c);
  const dicaExcluir = excluivel ? undefined : 'Só é possível excluir uma competência que nunca teve nenhuma aba fechada';
  const totalItens = FRENTES.reduce((s, fr) => s + c.frentes[fr].itens.length, 0);
  const abertura = aberturaDaCompetencia(c);
  // Resumo do cabeçalho: abas fechadas usam a cópia; abertas dependem da consulta à origem.
  const resumoPronto = !carregando && !erro;
  const resumo = resumoPronto ? resumoCompetencia(c, origem) : null;

  const vazioPadrao = (texto: string) => (editavel ? <>{texto} Use <strong>Adicionar linhas</strong>.</> : 'Nenhuma linha nesta competência.');

  return (
    <div className="pb-10">
      <PageHeader
        title={`Competência de ${nome}`}
        subtitle={`Aberta por ${abertura.por} em ${new Date(abertura.em).toLocaleDateString('pt-BR')}.`}
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

      <PainelResumo resumo={resumo} carregando={carregando} erro={erro} onTentarNovamente={tentarNovamente} />

      {competenciaCompleta(c) && (
        <p className="mb-4 px-4 py-3" role="status" style={{ background: 'var(--tfd-success-bg)', border: '1px solid var(--tfd-status-success-border)', borderRadius: 8, fontSize: 14, color: 'var(--tfd-status-success-text)' }}>
          <strong>Competência completa.</strong> Faturamento e BPA estão fechados. Se uma das duas frentes for reaberta, a competência deixa de ser completa.
        </p>
      )}

      {/* Abas por frente */}
      <div role="tablist" aria-label="Frentes da competência" className="flex flex-wrap gap-2 mb-5" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
        {FRENTES.map((fr) => {
          const atual = fr === frente;
          const st = c.frentes[fr].status;
          return (
            <button
              key={fr} type="button" role="tab" aria-selected={atual}
              onClick={() => { setFrente(fr); setBusca(''); }}
              className="inline-flex items-center gap-2"
              style={{ padding: '1.1rem 1.1rem 1.25rem', fontSize: 14, fontWeight: 700, color: atual ? 'var(--tfd-blue-500)' : 'var(--tfd-text-secondary)', borderBottom: `2px solid ${atual ? 'var(--tfd-blue-500)' : 'transparent'}`, marginBottom: -1 }}
            >
              {ICONE_FRENTE[fr]}
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
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={frente === 'faturamento' || frente === 'reembolso' ? 'Nome do passageiro ou nº do processo...' : frente === 'obito' ? 'Nome do paciente, documento ou nº do processo...' : 'Nome do beneficiário ou nº do processo...'} style={{ ...campo, width: '100%', paddingLeft: 35 }} />
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
          <AvisoPendencia>O BPA só pode ser fechado com todas as linhas marcadas como lançadas. {falta(pendentesBpa)}, somando Ajuda de Custo e Deslocamentos.</AvisoPendencia>
        )}
        {aberta && frente === 'reembolso' && podeFechar && !carregando && !erro && pendentesReembolso > 0 && (
          <AvisoPendencia>O Reembolso só pode ser fechado com data e valor registrados em todas as linhas. {falta(pendentesReembolso)}.</AvisoPendencia>
        )}
        {aberta && frente === 'obito' && podeFechar && !carregando && !erro && pendentesObito > 0 && (
          <AvisoPendencia>O Óbito só pode ser fechado com as despesas registradas em todas as linhas. {falta(pendentesObito)}.</AvisoPendencia>
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
      ) : frente === 'reembolso' ? (
        <ConteudoReembolso
          linhas={reembVisiveis}
          opcoes={opcoes}
          vista={vista}
          onRegistrar={aberta && podeRegistrarReembolso ? (l) => setRegistrando({ frente: 'reembolso', linha: l }) : undefined}
          vazio={vazioPadrao('Nenhuma passagem com status Reembolso nesta competência.')}
        />
      ) : frente === 'obito' ? (
        <ConteudoObito
          linhas={obitoVisiveis}
          opcoes={opcoes}
          vista={vista}
          onDetalhar={(l) => setRegistrando({ frente: 'obito', linha: l, modo: 'ler' })}
          onRegistrar={aberta && podeRegistrarDespesa ? (l) => setRegistrando({ frente: 'obito', linha: l, modo: 'editar' }) : undefined}
          vazio={vazioPadrao('Nenhuma solicitação com óbito nesta competência.')}
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
        disponiveisFaturamento={fat.filter((l) => !usadas.faturamento.has(l.chave))}
        disponiveisBpa={bpa.filter((l) => !usadas.bpa.has(l.chave))}
        disponiveisReembolso={reembolsos.filter((l) => !usadas.reembolso.has(l.chave))}
        disponiveisObito={linhasObito.filter((l) => !usadas.obito.has(l.chave))}
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

      <DrawerReembolso
        linha={registrando?.frente === 'reembolso' ? registrando.linha : null}
        registro={registrando?.frente === 'reembolso' ? vista?.regReembolso[registrando.linha.chave] : undefined}
        onClose={() => setRegistrando(null)}
        onSalvar={(dados) => {
          if (registrando?.frente !== 'reembolso') return false;
          const l = registrando.linha;
          const detalhe = `${l.processo} · ${l.passageiro} · ${fmtBRL(dados.valor)} em ${fmtDataBR(dados.data)}`;
          if (!avisarConflito(registrarReembolso(c.id, l.chave, dados, quem, detalhe))) return false;
          toast.success('Reembolso registrado', `${fmtBRL(dados.valor)} a receber, ${l.passageiro}.`);
          return true;
        }}
      />

      <DrawerDespesasObito
        linha={registrando?.frente === 'obito' ? registrando.linha : null}
        registro={registrando?.frente === 'obito' ? vista?.regObito[registrando.linha.chave] : undefined}
        modo={registrando?.frente === 'obito' ? registrando.modo : 'ler'}
        onClose={() => setRegistrando(null)}
        onVer={onVer}
        onSalvar={aberta && podeRegistrarDespesa ? (dados) => {
          if (registrando?.frente !== 'obito') return false;
          const l = registrando.linha;
          const total = dados.despesas.reduce((s, d) => s + d.valor, 0);
          const detalhe = `${l.processo} · ${l.paciente} · ${dados.despesas.length} ${dados.despesas.length === 1 ? 'item' : 'itens'}, ${fmtBRL(total)}, pagamento em ${fmtDataBR(dados.dataPagamento)}`;
          if (!avisarConflito(registrarDespesasObito(c.id, l.chave, dados, quem, detalhe))) return false;
          toast.success('Despesas registradas', `${dados.despesas.length} ${dados.despesas.length === 1 ? 'item' : 'itens'}, total de ${fmtBRL(total)}.`);
          return true;
        } : undefined}
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
        description={`As abas Faturamento, BPA, Reembolso e Óbito de ${nome} deixam de existir e as ${totalItens} linhas incluídas voltam a ficar disponíveis para outras competências. A exclusão fica registrada no log do sistema.`}
        confirmLabel="Excluir competência"
        confirmIcon={<Trash2 size={15} />}
        onClose={() => setDialogo(null)}
        onConfirm={() => {
          const detalhes = {
            competencia: nome,
            linhas_faturamento: c.frentes.faturamento.itens.length, linhas_bpa: c.frentes.bpa.itens.length,
            linhas_reembolso: c.frentes.reembolso.itens.length, linhas_obito: c.frentes.obito.itens.length,
          };
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

function AvisoPendencia({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2" style={{ padding: '10px 1.25rem', borderTop: '1px dashed var(--tfd-surface-border)', fontSize: 13.5, color: 'var(--tfd-text-secondary)' }}>
      <AlertTriangle size={14} style={{ color: 'var(--tfd-status-warning-text)' }} />
      <span>{children}</span>
    </div>
  );
}

/* ── Resumo da competência (cabeçalho) ───────────────────────────────────── */

function PainelResumo({ resumo, carregando, erro, onTentarNovamente }: {
  resumo: ResumoCompetencia | null; carregando: boolean; erro: boolean; onTentarNovamente: () => void;
}) {
  if (carregando) return <Skeleton className="h-24 w-full mb-5" />;
  if (erro || !resumo) {
    return (
      <p className="mb-5 flex flex-wrap items-center gap-3" role="status" style={{ ...cartao, padding: '12px 16px', fontSize: 14, color: 'var(--tfd-text-secondary)' }}>
        <AlertTriangle size={15} style={{ color: 'var(--tfd-status-warning-text)' }} />
        Não foi possível montar o resumo da competência.
        <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onTentarNovamente}>Tentar novamente</button>
      </p>
    );
  }
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const itens: { rotulo: string; valor: string; apoio: string; destaque?: boolean }[] = [
    { rotulo: 'Faturamento', valor: fmtBRL(resumo.faturamento.total), apoio: plural(resumo.faturamento.bilhetes, 'bilhete', 'bilhetes') },
    { rotulo: 'Reembolso a receber', valor: fmtBRL(resumo.reembolso.totalReceber), apoio: plural(resumo.reembolso.linhas, 'passagem', 'passagens') },
    { rotulo: 'Total líquido', valor: fmtBRL(resumo.totalLiquido), apoio: 'Faturamento menos reembolso', destaque: true },
    { rotulo: 'BPA (SIGTAP)', valor: fmtBRL(resumo.bpa.valorSigtap), apoio: plural(resumo.bpa.linhas, 'linha', 'linhas') },
    { rotulo: 'Procedimentos BPA', valor: resumo.bpa.procedimentos.toLocaleString('pt-BR'), apoio: `${resumo.bpa.procedimentosAjudaCusto} ajuda de custo · ${resumo.bpa.procedimentosDeslocamento} deslocamento` },
    { rotulo: 'Pacientes únicos', valor: resumo.bpa.pacientesUnicos.toLocaleString('pt-BR'), apoio: 'Nas linhas do BPA' },
    { rotulo: 'Óbitos', valor: String(resumo.obito.linhas), apoio: `${fmtBRL(resumo.obito.totalDespesas)} em despesas` },
  ];
  return (
    <section aria-label="Resumo da competência" className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-px overflow-hidden mb-5" style={{ ...cartao, background: 'var(--tfd-surface-border)' }}>
      {itens.map((i) => (
        <div key={i.rotulo} style={{ background: i.destaque ? 'var(--tfd-blue-50)' : 'white', padding: '0.9rem 1rem' }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tfd-text-muted)' }}>{i.rotulo}</span>
          <p style={{ fontFamily: 'var(--tfd-mono)', fontSize: '1.125rem', fontWeight: 700, color: i.destaque ? 'var(--tfd-blue-700)' : 'var(--tfd-text-primary)', marginTop: 4, whiteSpace: 'nowrap' }}>{i.valor}</p>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--tfd-text-muted)', marginTop: 2 }}>{i.apoio}</span>
        </div>
      ))}
      {/* Completa a última linha da grade em telas de 2 e 4 colunas. */}
      <div className="xl:hidden" style={{ background: 'white' }} aria-hidden />
    </section>
  );
}


/* ── Conteúdo das abas (também usado na consulta de um fechamento) ───────── */

function ConteudoFaturamento({ linhas, opcoes, aposReabertura, vazio }: {
  linhas: LinhaFaturamento[]; opcoes: OpcoesColunas; aposReabertura: Set<string>; vazio: React.ReactNode;
}) {
  // O faturamento mostra o valor das passagens; o reembolso fica na aba Reembolso.
  const totalPagar = totalFaturamento(linhas);
  return (
    <>
      <Indicadores itens={[
        { rotulo: 'Bilhetes emitidos', valor: String(linhas.length), icone: <Plane size={12} /> },
        { rotulo: 'Total a pagar', valor: fmtBRL(totalPagar), icone: <Wallet size={12} /> },
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
        // Um procedimento por diária (com e sem pernoite) na ajuda de custo; a quantidade no deslocamento.
        { rotulo: 'Procedimentos', valor: procedimentosBpa(linhas).toLocaleString('pt-BR') },
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

function ConteudoReembolso({ linhas, opcoes, vista, onRegistrar, vazio }: {
  linhas: LinhaReembolso[]; opcoes: OpcoesColunas; vista: Vista; onRegistrar?: (l: LinhaReembolso) => void; vazio: React.ReactNode;
}) {
  const t = totaisReembolso(linhas, vista.regReembolso);
  return (
    <>
      <Indicadores itens={[
        { rotulo: 'Linhas', valor: String(t.linhas), icone: <HandCoins size={12} /> },
        { rotulo: 'Com valor registrado', valor: String(t.comValor), cor: 'var(--tfd-status-success-text)' },
        { rotulo: 'Pendentes de valor', valor: String(t.pendentes), cor: 'var(--tfd-status-warning-text)' },
        { rotulo: 'Total a receber', valor: fmtBRL(t.totalReceber) },
      ]} />
      <Secao titulo="Passagens com reembolso" quantidade={linhas.length} subtitulo="Valores que o TFD tem a receber de passagens não utilizadas">
        <Tabela
          colunas={colunasReembolso(opcoes, vista.regReembolso, onRegistrar)}
          linhas={linhas}
          chave={(l) => l.chave}
          destaque={(l) => (vista.aposReabertura.has(l.chave) ? { background: 'var(--tfd-status-caution-bg)' } : undefined)}
          vazio={vazio}
        />
      </Secao>
    </>
  );
}

function ConteudoObito({ linhas, opcoes, vista, onDetalhar, onRegistrar, vazio }: {
  linhas: LinhaObito[]; opcoes: OpcoesColunas; vista: Vista;
  onDetalhar: (l: LinhaObito) => void; onRegistrar?: (l: LinhaObito) => void; vazio: React.ReactNode;
}) {
  const t = totaisObito(linhas, vista.regObito);
  return (
    <>
      <Indicadores itens={[
        { rotulo: 'Óbitos na competência', valor: String(t.linhas), icone: <ReceiptText size={12} /> },
        { rotulo: 'Com despesa registrada', valor: String(t.comDespesa), cor: 'var(--tfd-status-success-text)' },
        { rotulo: 'Total de despesas', valor: fmtBRL(t.totalDespesas) },
      ]} />
      <Secao titulo="Despesas de óbito" quantidade={linhas.length} subtitulo="A data do falecimento vem da sinalização; a do pagamento, do registro das despesas">
        <Tabela
          colunas={colunasObito(opcoes, vista.regObito, { onDetalhar, onRegistrar })}
          linhas={linhas}
          chave={(l) => l.chave}
          destaque={(l) => (vista.aposReabertura.has(l.chave) ? { background: 'var(--tfd-status-caution-bg)' } : undefined)}
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
  const [detalhe, setDetalhe] = useState<LinhaObito | null>(null);
  const vista = fechamento ? vistaDaCopia(fechamento) : null;
  const opcoes: OpcoesColunas = { mesCompetencia: vista?.mesCompetencia, onVer };
  const colunaLancado: Coluna<LinhaBpa> = {
    key: 'lancado', header: <span title="Lançada no BPA">BPA</span>, align: 'center', width: '52px',
    render: (l) => <input type="checkbox" aria-label="Lançada no BPA" disabled checked={vista?.lancados.has(l.chave) ?? false} readOnly />,
  };
  const quantidade = fechamento ? linhasDaCopia(fechamento).length : 0;
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
      ) : frente === 'reembolso' ? (
        <ConteudoReembolso linhas={vista.reembolsos} opcoes={opcoes} vista={vista} vazio="Nenhuma linha neste fechamento." />
      ) : frente === 'obito' ? (
        <>
          <ConteudoObito linhas={vista.obitos} opcoes={opcoes} vista={vista} onDetalhar={setDetalhe} vazio="Nenhuma linha neste fechamento." />
          <DrawerDespesasObito linha={detalhe} registro={detalhe ? vista.regObito[detalhe.chave] : undefined} modo="ler" onClose={() => setDetalhe(null)} onVer={onVer} />
        </>
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

const COLUNAS_INDICADORES: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4', 5: 'grid-cols-2 lg:grid-cols-5' };

function Indicadores({ itens }: { itens: { rotulo: string; valor: string; icone?: React.ReactNode; cor?: string }[] }) {
  return (
    <section className={`grid ${COLUNAS_INDICADORES[itens.length] ?? 'grid-cols-2 lg:grid-cols-4'} gap-px overflow-hidden mb-5`} style={{ ...cartao, background: 'var(--tfd-surface-border)' }}>
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
  reembolso_registrado: 'Reembolso registrado',
  despesas_registradas: 'Despesas de óbito registradas',
};

const HISTORICO_DE: Record<Frente, string> = { faturamento: 'do Faturamento', bpa: 'do BPA', reembolso: 'do Reembolso', obito: 'do Óbito' };

function Historico({ eventos, frente, fechamentos, onConsultar }: {
  eventos: EventoHistorico[]; frente: Frente; fechamentos: Fechamento[]; onConsultar: (fechamentoId: string) => void;
}) {
  const existe = new Set(fechamentos.map((x) => x.id));
  return (
    <section className="overflow-hidden" style={cartao}>
      <header className="flex items-center gap-2.5" style={{ padding: '1.1rem 1.25rem 0.85rem' }}>
        <History size={16} style={{ color: 'var(--tfd-text-muted)' }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--tfd-text-primary)' }}>Histórico {HISTORICO_DE[frente]}</h3>
        <span style={{ fontSize: 13, color: 'var(--tfd-400)' }}>Registro de auditoria: quem fez, quando e o quê</span>
      </header>
      <ol style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
        {[...eventos].reverse().map((e) => (
          <li key={e.id} className="flex flex-wrap items-start gap-x-4 gap-y-1" style={{ padding: '10px 1.25rem', borderBottom: '1px solid var(--tfd-100)', fontSize: 13.5, background: e.tipo === 'reaberta' ? 'var(--tfd-status-caution-bg)' : undefined }}>
            <span style={{ fontFamily: 'var(--tfd-mono)', fontSize: 12.5, color: 'var(--tfd-text-muted)', minWidth: 120 }}>{dataHora(e.em)}</span>
            <span className="flex-1 min-w-[220px]">
              <strong style={{ fontWeight: 600, color: 'var(--tfd-text-primary)' }}>{TEXTO_EVENTO[e.tipo]}</strong>
              {e.quantidade != null && (e.tipo === 'linhas_incluidas' || e.tipo === 'linha_removida') && <> · {e.quantidade} {e.quantidade === 1 ? 'linha' : 'linhas'}</>}
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
