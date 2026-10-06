'use client';

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, CalendarDays, ChevronRight, Copy, Eye, Home, MoreVertical, RotateCcw, Save, Search, SlidersHorizontal, Trash2, X,
} from 'lucide-react';
import ConfirmDialog from '@/shared/components/confirm-dialog/ConfirmDialog';
import { useToast } from '@/shared/components/toast/Toast';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { BotaoBarra, CampoBarra, EditorFiltros, EditorPeriodo, Etiqueta } from './Barra';
import Painel from './Painel';
import Previa from './Previa';
import { AbasAssunto, MenuExportar } from './comum';
import { C, campoStyle } from './estilo';
import { ASSUNTOS, assuntoPorId } from '../assuntos';
import type { BaseRelatorios } from '../dataset';
import { descreverFiltro, descreverRelatorio } from '../descricao';
import { executarRelatorio, type ResultadoRelatorio } from '../motor';
import { dataBR, nomePeriodo } from '../periodo';
import { excluirRelatorio, salvarRelatorio } from '../salvos';
import { removerPendencias, validarSecoes, type Pendencia } from '../validacao';
import type { AssuntoId, ConfigRelatorio, RelatorioSalvo } from '../tipos';
import { cartao } from './Previa';

type PainelBarra = 'periodo' | 'filtros' | null;

interface Props {
  /** Relatório salvo. Sem ele, a tela é de um relatório novo ainda não salvo. */
  relatorio?: RelatorioSalvo;
  /** Seções de partida de um relatório novo (escolhidas na janela de assunto). */
  secoesIniciais?: ConfigRelatorio[];
  base: BaseRelatorios;
  carregando: boolean;
  /** Abre o painel Personalizar ao entrar (edição). */
  abrirPersonalizar?: boolean;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function nomeSugerido(secoes: ConfigRelatorio[]): string {
  const rotulos = secoes.map((s) => assuntoPorId(s.assunto).label);
  const assuntos = rotulos.length > 2 ? `${rotulos.length} assuntos` : rotulos.join(' e ');
  return secoes[0] ? `${assuntos}, ${nomePeriodo(secoes[0].periodo).toLowerCase()}` : 'Novo relatório';
}

/** Resultado de cada seção, recalculado só para a seção cuja configuração (ou
 *  a busca, ou a base) mudou. Mexer em uma tabela não refaz as outras. */
function useResultados(secoes: ConfigRelatorio[], base: BaseRelatorios, busca: string, ativo: boolean): ResultadoRelatorio[] {
  const cache = useRef(new Map<ConfigRelatorio, { base: BaseRelatorios; busca: string; res: ResultadoRelatorio }>());
  return useMemo(() => {
    if (!ativo) return [];
    const novo = new Map<ConfigRelatorio, { base: BaseRelatorios; busca: string; res: ResultadoRelatorio }>();
    const saida = secoes.map((s) => {
      const antigo = cache.current.get(s);
      if (antigo && antigo.base === base && antigo.busca === busca) { novo.set(s, antigo); return antigo.res; }
      const res = executarRelatorio(s, base, busca);
      novo.set(s, { base, busca, res });
      return res;
    });
    cache.current = novo;
    return saida;
  }, [secoes, base, busca, ativo]);
}

/**
 * Tela única do relatório: criar, consultar e editar usam esta mesma tela.
 * - Barra de consulta (período, busca, filtros): "quais registros quero ver agora?".
 * - Painel Personalizar (assuntos, colunas, ordem, agrupamento): "como a tabela é montada?".
 * - Um só modelo de salvar: a faixa "Ajuste não salvo" vale para relatório novo,
 *   consulta e edição.
 */
export default function Detalhe({ relatorio, secoesIniciais, base, carregando, abrirPersonalizar }: Props) {
  const toast = useToast();
  const router = useRouter();
  const { user } = usePermissions();
  const painelId = useId();
  const nomeRef = useRef<HTMLInputElement>(null);

  const [secoes, setSecoes] = useState<ConfigRelatorio[]>(relatorio?.secoes ?? secoesIniciais ?? []);
  const [nome, setNome] = useState(relatorio?.nome ?? nomeSugerido(secoesIniciais ?? []));
  const [ativaEscolhida, setAtiva] = useState<AssuntoId | undefined>(secoes[0]?.assunto);
  const [busca, setBusca] = useState('');
  const buscaAdiada = useDeferredValue(busca);
  const [painelBarra, setPainelBarra] = useState<PainelBarra>(null);
  const [campoFiltro, setCampoFiltro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const pendencias = useMemo(() => validarSecoes(secoes), [secoes]);
  const [personalizar, setPersonalizar] = useState(() => Boolean(abrirPersonalizar) || !relatorio || validarSecoes(relatorio.secoes).length > 0);

  const validas = useMemo(() => secoes.filter((s) => ASSUNTOS.some((a) => a.id === s.assunto)), [secoes]);
  const ativa = validas.some((s) => s.assunto === ativaEscolhida) ? ativaEscolhida : validas[0]?.assunto;
  const config = validas.find((s) => s.assunto === ativa);
  const bloqueado = pendencias.length > 0;

  const resultados = useResultados(secoes, base, buscaAdiada, !bloqueado && secoes.length > 0);
  const resultado = config ? resultados[secoes.indexOf(config)] : undefined;
  const assunto = config ? assuntoPorId(config.assunto) : undefined;

  /** Ajuste na seção em foco. O período é comum: muda em todas. */
  const setConfig = (c: ConfigRelatorio) =>
    setSecoes((atuais) => atuais.map((s) => (s.assunto === c.assunto ? c : { ...s, periodo: c.periodo })));

  const secoesAlteradas = relatorio ? !igual(secoes, relatorio.secoes) : true;
  const nomeAlterado = relatorio ? nome.trim() !== relatorio.nome : true;
  const filtrosDe = (s: ConfigRelatorio) => s.filtros.filter((f) => f.valores.some((v) => v !== ''));
  const filtrosAtivos = config ? filtrosDe(config) : [];
  const temFiltroEmAlguma = secoes.some((s) => filtrosDe(s).length > 0);
  const campoGrupo = config && assunto && assunto.id !== 'financeiro'
    ? assunto.grupos.flatMap((g) => g.campos).find((c) => c.id === config.agruparPor && c.agrupavel)
    : undefined;

  const exportaveis = useMemo(
    () => (bloqueado ? [] : secoes.map((s, i) => ({ res: resultados[i], resumo: descreverRelatorio(s, resultados[i], false, buscaAdiada) }))).filter((x) => x.res),
    [bloqueado, secoes, resultados, buscaAdiada],
  );

  function salvar(comoNovo = false) {
    const n = nome.trim();
    if (!n) {
      toast.warning('Dê um nome ao relatório', 'Escreva o nome no título da página para salvar.');
      nomeRef.current?.focus();
      return;
    }
    if (comoNovo && relatorio) {
      const nomeNovo = n === relatorio.nome ? `${n} (cópia)` : n;
      const s = salvarRelatorio(nomeNovo, secoes, undefined, user?.id);
      toast.success('Salvo como novo relatório', s.nome);
      router.push(`/relatorios?salvo=${s.id}`);
      return;
    }
    const s = salvarRelatorio(n, secoes, relatorio?.id, user?.id);
    toast.success(relatorio ? 'Alterações salvas' : 'Relatório salvo', s.nome);
    if (!relatorio) router.replace(`/relatorios?salvo=${s.id}`);
  }

  function voltarAoSalvo() {
    if (!relatorio) return;
    setSecoes(relatorio.secoes);
    setNome(relatorio.nome);
  }

  function limpar() {
    setBusca('');
    setSecoes((atuais) => atuais.map((s) => (s.filtros.length ? { ...s, filtros: [] } : s)));
    setCampoFiltro('');
  }

  const alternarBarra = (p: Exclude<PainelBarra, null>) => setPainelBarra((atual) => (atual === p ? null : p));
  const aplicarRemocao = (p: Pendencia[]) => setSecoes((atuais) => removerPendencias(atuais, p));
  const semAjusteSalvo = !relatorio ? false : !secoesAlteradas;
  const subtitulo = !relatorio
    ? 'Relatório novo, ainda não salvo. Depois de salvar, só você vê este relatório.'
    : `${secoes.map((s) => ASSUNTOS.find((a) => a.id === s.assunto)?.label ?? s.assunto).join(' · ')}${relatorio.donoId ? ' · Só você vê este relatório' : ''} · atualizado em ${new Date(relatorio.atualizadoEm).toLocaleDateString('pt-BR')}`;
  const salvarDesativado = bloqueado || secoes.length === 0 || (relatorio ? semAjusteSalvo && !nomeAlterado : false);

  return (
    <div className="pb-10">
      {/* Cabeçalho */}
      <div className="mb-5 tfd-reveal">
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-[13px]" style={{ color: '#9CA3AF' }}>
            <li><Link href="/dashboard" aria-label="Início"><Home size={14} /></Link></li>
            <li className="flex items-center gap-1"><ChevronRight size={13} aria-hidden /> Gestão</li>
            <li className="flex items-center gap-1"><ChevronRight size={13} aria-hidden /> <Link href="/relatorios" className="hover:underline">Relatórios</Link></li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1" style={{ minWidth: 260 }}>
            <h1 className="m-0">
              <input
                ref={nomeRef}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-label="Nome do relatório"
                placeholder="Nome do relatório"
                maxLength={120}
                className="w-full focus-visible:outline focus-visible:outline-2 hover:border-[var(--tfd-300)]"
                style={{
                  fontSize: 24.5, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25, color: C.ink, background: 'transparent',
                  border: '1px solid transparent', borderRadius: 'var(--tfd-radius-md)', padding: '2px 8px', marginLeft: -9, outlineColor: C.azul,
                }}
              />
            </h1>
            <p className="mt-1" style={{ fontSize: 14, color: C.claro }}>{subtitulo}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button" className="tfd-btn tfd-btn-secondary"
              aria-expanded={personalizar} aria-controls={painelId}
              onClick={() => setPersonalizar((v) => !v)}
            >
              <SlidersHorizontal size={15} /> Personalizar
            </button>
            <MenuExportar titulo={nome.trim() || 'Relatório'} secoes={exportaveis} relatorioId={relatorio?.id} />
            <button type="button" className="tfd-btn tfd-btn-primary" disabled={salvarDesativado} onClick={() => salvar()}>
              <Save size={15} /> Salvar
            </button>
            {relatorio ? (
              <MenuMais
                desativarNovo={bloqueado || secoes.length === 0}
                onSalvarComoNovo={() => salvar(true)}
                onExcluir={() => setExcluindo(true)}
              />
            ) : (
              <Link href="/relatorios" className="tfd-btn tfd-btn-ghost">Cancelar</Link>
            )}
          </div>
        </div>
      </div>

      {/* Campos que não existem mais */}
      {bloqueado && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5" style={{ padding: '10px 14px', background: 'var(--tfd-warning-bg)', border: '1px solid var(--tfd-status-warning-border)', borderRadius: 'var(--tfd-radius-md)', fontSize: 14, color: 'var(--tfd-status-warning-strong)' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span className="flex-1 min-w-[240px]">
            Alguns campos deste relatório não existem mais: {pendencias.map((p) => p.descricao).join('; ')}.
            Os números ficam escondidos até o ajuste, para não mostrar resultado com filtro ou coluna perdida.
          </span>
          <button type="button" className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={() => aplicarRemocao(pendencias)}>Remover e continuar</button>
        </div>
      )}

      <div className="mb-5 empty:hidden">
        <AbasAssunto
          assuntos={validas.map((s) => s.assunto)}
          ativa={ativa ?? 'passagens'}
          onChange={(id) => { setAtiva(id); setCampoFiltro(''); }}
          contagens={bloqueado ? undefined : Object.fromEntries(resultados.map((r) => [r.assunto.id, r.totalRegistros]))}
        />
      </div>

      {/* Um só modelo de salvar */}
      {secoesAlteradas && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5" style={{ padding: '8px 12px 8px 14px', background: C.azulSuave, border: `1px solid ${C.azulBorda}`, borderRadius: 'var(--tfd-radius-md)', fontSize: 14, color: C.azulTexto }}>
          <Eye size={16} style={{ flexShrink: 0 }} />
          <span className="flex-1 min-w-[220px]">
            {relatorio
              ? 'Ajuste não salvo. O relatório salvo continua como estava.'
              : 'Relatório novo, ainda não salvo. Ajuste o que quiser e salve quando estiver pronto.'}
          </span>
          {relatorio && (
            <>
              <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={voltarAoSalvo}>
                <RotateCcw size={14} /> Voltar ao salvo
              </button>
              <button type="button" className="tfd-btn tfd-btn-secondary tfd-btn--sm" disabled={bloqueado || secoes.length === 0} onClick={() => salvar(true)}>
                <Copy size={14} /> Salvar como novo
              </button>
            </>
          )}
          <button type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm" disabled={salvarDesativado} onClick={() => salvar()}>
            <Save size={14} /> {relatorio ? 'Salvar no relatório' : 'Salvar relatório'}
          </button>
        </div>
      )}

      <div className={personalizar ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] items-start' : ''}>
        <div className="min-w-0 flex flex-col gap-5">
          {/* Barra de consulta */}
          {config && assunto && (
            <section aria-label="Ajustar a consulta" style={cartao}>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-3" style={{ padding: '0.875rem 1.25rem' }}>
                <CampoBarra rotulo="Período" icone={<CalendarDays size={12} />}>
                  <BotaoBarra ativo={painelBarra === 'periodo'} onClick={() => alternarBarra('periodo')}>{nomePeriodo(config.periodo)}</BotaoBarra>
                </CampoBarra>

                <CampoBarra rotulo="Buscar" icone={<Search size={12} />} className="w-full order-first sm:order-none sm:w-auto sm:flex-1" estilo={{ minWidth: 220, maxWidth: 420 }}>
                  <span className="relative block">
                    <Search size={16} className="absolute" style={{ left: 11, top: 10, color: C.claro }} aria-hidden />
                    <input
                      type="search" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar nas colunas da tabela"
                      placeholder="Buscar nas colunas da tabela..."
                      style={{ ...campoStyle, height: 36, padding: '0 10px 0 35px' }}
                    />
                  </span>
                </CampoBarra>

                <CampoBarra rotulo="Filtros" icone={<SlidersHorizontal size={12} />}>
                  <BotaoBarra ativo={painelBarra === 'filtros'} onClick={() => alternarBarra('filtros')}>
                    {filtrosAtivos.length ? `${filtrosAtivos.length} ${filtrosAtivos.length === 1 ? 'aplicado' : 'aplicados'}` : 'Adicionar filtro'}
                  </BotaoBarra>
                </CampoBarra>

                {(temFiltroEmAlguma || busca.trim()) && (
                  <button type="button" className="tfd-btn tfd-btn-ghost sm:ml-auto" onClick={limpar} title="Limpa os filtros e a busca. Colunas e agrupamento não mudam.">
                    <X size={15} /> Limpar
                  </button>
                )}
              </div>

              {painelBarra && (
                <div style={{ padding: '1rem 1.25rem 1.1rem', borderTop: `1px dashed ${C.borda}` }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                      {painelBarra === 'periodo' ? 'Período' : `Filtros de ${assunto.label.toLowerCase()}`}
                      {painelBarra === 'periodo' && validas.length > 1 && (
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: C.claro }}>O período vale para todos os assuntos.</span>
                      )}
                      {painelBarra === 'filtros' && validas.length > 1 && (
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: C.claro }}>Os filtros valem só para {assunto.label.toLowerCase()}. Troque de aba para filtrar outro assunto.</span>
                      )}
                    </p>
                    <button type="button" aria-label="Fechar" onClick={() => setPainelBarra(null)} className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ maxWidth: 760 }}>
                    {painelBarra === 'periodo' && <EditorPeriodo config={config} onChange={setConfig} />}
                    {painelBarra === 'filtros' && <EditorFiltros key={`${config.assunto}:${campoFiltro}`} campoInicial={campoFiltro} config={config} onChange={setConfig} base={base} />}
                  </div>
                </div>
              )}

              {/* O que os números significam, em uma linha. Filtros ativos removíveis. */}
              {resultado && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2" style={{ padding: '10px 1.25rem', borderTop: `1px dashed ${C.borda}`, fontSize: 13, color: C.apoio }}>
                  <span>
                    {campoGrupo ? `Cada linha é um total por ${campoGrupo.label.toLowerCase()}.` : `Cada linha é ${assunto.cadaLinha}`}
                    {' '}De {dataBR(resultado.periodo.inicio)} a {dataBR(resultado.periodo.fim)}
                    {assunto.id !== 'financeiro' && <>, data considerada: <strong style={{ fontWeight: 600, color: C.texto }}>{resultado.referencia.label.toLowerCase()}</strong></>}.
                  </span>
                  {filtrosAtivos.map((f) => {
                    const texto = descreverFiltro(resultado, f);
                    return texto ? (
                      <Etiqueta
                        key={f.campoId} texto={texto}
                        onAbrir={() => { setCampoFiltro(f.campoId); setPainelBarra('filtros'); }}
                        onRemover={() => setConfig({ ...config, filtros: config.filtros.filter((x) => x.campoId !== f.campoId) })}
                      />
                    ) : null;
                  })}
                  {busca.trim() && <Etiqueta texto={`Com "${busca.trim()}"`} onRemover={() => setBusca('')} />}
                </div>
              )}
            </section>
          )}

          {/* Tabela */}
          {config && resultado && !bloqueado && (
            <Previa key={config.assunto} rotulo={validas.length > 1 && assunto ? `Linhas de ${assunto.label.toLowerCase()}` : 'Linhas do relatório'} resultado={resultado} config={config} onChange={setConfig} carregando={carregando} />
          )}
          {bloqueado && (
            <p className="text-center" style={{ ...cartao, padding: '48px 20px', fontSize: 14, color: C.apoio }}>
              Ajuste os campos que não existem mais no painel Personalizar para ver a tabela.
            </p>
          )}
          {!bloqueado && secoes.length === 0 && (
            <p className="text-center" style={{ ...cartao, padding: '48px 20px', fontSize: 14, color: C.apoio }}>
              Escolha pelo menos um assunto no painel Personalizar.
            </p>
          )}
        </div>

        {personalizar && (
          <aside
            id={painelId} aria-label="Personalizar o relatório"
            className="max-xl:order-first xl:sticky xl:top-4 xl:overflow-y-auto"
            style={{ ...cartao, padding: 16, maxHeight: 'calc(100vh - 32px)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>Personalizar</h2>
              <button type="button" aria-label="Fechar o painel Personalizar" onClick={() => setPersonalizar(false)} className="tfd-btn tfd-btn-ghost tfd-btn--icon-only">
                <X size={16} />
              </button>
            </div>
            <Painel
              secoes={secoes}
              config={config}
              pendencias={pendencias}
              onSecoes={(s) => setSecoes(s)}
              onConfig={setConfig}
              onRemoverPendencias={aplicarRemocao}
            />
          </aside>
        )}
      </div>

      {relatorio && (
        <ConfirmDialog
          open={excluindo}
          tone="delete"
          title="Excluir relatório?"
          subject={relatorio.nome}
          description="Essa ação não pode ser desfeita."
          onClose={() => setExcluindo(false)}
          onConfirm={() => {
            excluirRelatorio(relatorio.id);
            setExcluindo(false);
            toast.success('Relatório excluído', relatorio.nome);
            router.push('/relatorios');
          }}
        />
      )}
    </div>
  );
}

/** Menu "mais ações" do cabeçalho: Salvar como novo e Excluir. */
function MenuMais({ onSalvarComoNovo, onExcluir, desativarNovo }: { onSalvarComoNovo: () => void; onExcluir: () => void; desativarNovo: boolean }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const item = 'flex items-center gap-3 text-left w-full hover:bg-[var(--tfd-surface-hover)] disabled:opacity-50';
  return (
    <div ref={ref} className="relative">
      <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" aria-label="Mais ações do relatório" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        <MoreVertical size={16} />
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 z-30 flex flex-col" style={{ top: 'calc(100% + 6px)', width: 220, padding: 6, background: 'white', border: `1px solid ${C.borda}`, borderRadius: 'var(--tfd-radius-md)', boxShadow: 'var(--tfd-shadow-md)' }}>
          <button type="button" role="menuitem" disabled={desativarNovo} className={item} style={{ minHeight: 40, padding: '0 10px', fontSize: 14, color: C.ink, borderRadius: 'var(--tfd-radius-sm)' }} onClick={() => { setAberto(false); onSalvarComoNovo(); }}>
            <Copy size={15} /> Salvar como novo
          </button>
          <button type="button" role="menuitem" className={item} style={{ minHeight: 40, padding: '0 10px', fontSize: 14, color: 'var(--tfd-danger)', borderRadius: 'var(--tfd-radius-sm)' }} onClick={() => { setAberto(false); onExcluir(); }}>
            <Trash2 size={15} /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}
