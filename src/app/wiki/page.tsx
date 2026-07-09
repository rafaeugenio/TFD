'use client';

import { ArrowUpRight, BookOpen, ChevronUp, ListTree, Search, SearchX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WikiTopic } from './data/wikiTopics';
import { searchTopics, topicsByCategory, WIKI_CATEGORIES, WIKI_TOPICS } from './data/wikiTopics';
import TopicArticle from './components/TopicArticle';
import WikiSidebar, { CATEGORY_ICONS } from './components/WikiSidebar';

/** Ordem linear dos tópicos (para "anterior/próximo"), seguindo as categorias. */
const ORDERED_TOPICS: WikiTopic[] = WIKI_CATEGORIES.flatMap((cat) => topicsByCategory(cat.id));

export default function WikiPage() {
  const [query, setQuery] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string | null>(ORDERED_TOPICS[0]?.id ?? null);
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mobileTocRef = useRef<HTMLDetailsElement>(null);

  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchTopics(query) : []), [query, searching]);

  const scrollToTopic = useCallback((topicId: string) => {
    setQuery('');
    if (mobileTocRef.current) mobileTocRef.current.open = false;
    // Aguarda o modo manual voltar a renderizar antes de rolar.
    requestAnimationFrame(() => {
      const el = document.getElementById(topicId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveTopicId(topicId);
      }
    });
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Tópico ativo conforme a rolagem (indicador no sumário).
  useEffect(() => {
    if (searching) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-wiki-topic]'));
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveTopicId(visible[0].target.getAttribute('data-wiki-topic'));
        }
      },
      { rootMargin: '-15% 0px -65% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [searching]);

  // Progresso de leitura + botão "voltar ao início".
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
      setShowBackToTop(window.scrollY > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      {/* Barra de progresso de leitura */}
      <div
        className="fixed inset-x-0 top-0 z-50 h-[3px]"
        style={{ background: 'transparent' }}
        aria-hidden="true"
      >
        <div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: 'var(--tfd-blue-500)',
            transition: 'width 120ms linear',
          }}
        />
      </div>

      {/* Hero funcional */}
      <header className="tfd-reveal mb-8 pt-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--tfd-blue-500)', color: '#fff' }}
            aria-hidden="true"
          >
            <BookOpen size={20} />
          </span>
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: 'var(--tfd-blue-600)' }}
            >
              TFD · SES-MA
            </p>
            <h1
              className="text-[24px] font-bold leading-tight tracking-[-0.02em]"
              style={{ color: 'var(--tfd-900)' }}
            >
              Guia do Usuário TFD
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed" style={{ color: 'var(--tfd-600)' }}>
          Manual de operação do sistema de Tratamento Fora do Domicílio: como navegar, executar os
          principais fluxos e evitar erros comuns em cadastros, solicitações, regulação, financeiro
          e encerramento.
        </p>

        {/* Busca local */}
        <div className="relative mt-5 max-w-[560px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--tfd-400)' }}
            aria-hidden="true"
          />
          <input
            type="text"
            role="searchbox"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no guia: parecer, passagem, encerramento..."
            aria-label="Buscar tópicos do guia"
            className="w-full rounded-xl border py-3 pl-10 pr-10 text-[14px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--tfd-blue-100)]"
            style={{
              borderColor: 'var(--tfd-surface-border)',
              background: 'var(--tfd-surface-card)',
              color: 'var(--tfd-900)',
            }}
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors"
              style={{ color: 'var(--tfd-500)' }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      {searching ? (
        /* ─────────────── Modo busca: cards de resultado ─────────────── */
        <section aria-label="Resultados da busca" aria-live="polite">
          <p className="mb-4 text-[13px]" style={{ color: 'var(--tfd-500)' }}>
            {results.length === 0
              ? 'Nenhum resultado'
              : `${results.length} tópico${results.length > 1 ? 's' : ''} encontrado${results.length > 1 ? 's' : ''}`}{' '}
            para <strong style={{ color: 'var(--tfd-800)' }}>&ldquo;{query.trim()}&rdquo;</strong>
          </p>

          {results.length === 0 ? (
            <div
              className="tfd-card flex flex-col items-center gap-3 px-6 py-14 text-center"
              role="status"
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: 'var(--tfd-50)', color: 'var(--tfd-400)' }}
                aria-hidden="true"
              >
                <SearchX size={22} />
              </span>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--tfd-900)' }}>
                  Nada encontrado no guia
                </p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--tfd-500)' }}>
                  Tente outra palavra, como &ldquo;parecer&rdquo;, &ldquo;diária&rdquo; ou
                  &ldquo;carimbo&rdquo;.
                </p>
              </div>
              <button type="button" className="tfd-btn tfd-btn-outline tfd-btn--sm" onClick={() => setQuery('')}>
                Limpar busca
              </button>
            </div>
          ) : (
            <ul className="tfd-stagger grid gap-3 sm:grid-cols-2">
              {results.map((topic) => {
                const cat = WIKI_CATEGORIES.find((c) => c.id === topic.categoria);
                const Icon = CATEGORY_ICONS[topic.categoria];
                return (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => scrollToTopic(topic.id)}
                      className="tfd-card group flex h-full w-full flex-col gap-2 p-4 text-left transition-shadow hover:shadow-[var(--tfd-shadow-md)]"
                    >
                      <span
                        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: 'var(--tfd-blue-600)' }}
                      >
                        <Icon size={12} aria-hidden="true" />
                        {cat?.titulo}
                      </span>
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[14px] font-semibold" style={{ color: 'var(--tfd-900)' }}>
                          {topic.titulo}
                        </span>
                        <ArrowUpRight
                          size={15}
                          className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ color: 'var(--tfd-blue-500)' }}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="text-[12.5px] leading-relaxed" style={{ color: 'var(--tfd-500)' }}>
                        {topic.descricao}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        /* ─────────────── Modo manual: sumário + tópicos ─────────────── */
        <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10">
          {/* Sumário fixo (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pb-8 pr-1">
              <WikiSidebar activeTopicId={activeTopicId} onNavigate={scrollToTopic} />
            </div>
          </aside>

          {/* Sumário compacto (mobile) */}
          <details
            ref={mobileTocRef}
            className="tfd-card mb-6 overflow-hidden p-0 lg:hidden"
          >
            <summary
              className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold"
              style={{ color: 'var(--tfd-800)' }}
            >
              <ListTree size={16} style={{ color: 'var(--tfd-blue-500)' }} aria-hidden="true" />
              Sumário do guia
            </summary>
            <div className="border-t px-3 pb-3 pt-2" style={{ borderColor: 'var(--tfd-surface-border)' }}>
              <WikiSidebar activeTopicId={activeTopicId} onNavigate={scrollToTopic} />
            </div>
          </details>

          {/* Conteúdo */}
          <main className="min-w-0 space-y-10 pb-16">
            {WIKI_CATEGORIES.map((cat) => {
              const topics = topicsByCategory(cat.id);
              const Icon = CATEGORY_ICONS[cat.id];
              return (
                <section key={cat.id} id={`categoria-${cat.id}`} aria-labelledby={`cat-${cat.id}`}>
                  <div className="mb-4 flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-600)' }}
                      aria-hidden="true"
                    >
                      <Icon size={17} />
                    </span>
                    <div>
                      <h2
                        id={`cat-${cat.id}`}
                        className="text-[17px] font-bold tracking-[-0.01em]"
                        style={{ color: 'var(--tfd-900)' }}
                      >
                        {cat.titulo}
                      </h2>
                      <p className="text-[13px]" style={{ color: 'var(--tfd-500)' }}>
                        {cat.descricao}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {topics.map((topic) => {
                      const idx = ORDERED_TOPICS.findIndex((t) => t.id === topic.id);
                      return (
                        <TopicArticle
                          key={topic.id}
                          topic={topic}
                          prev={ORDERED_TOPICS[idx - 1]}
                          next={ORDERED_TOPICS[idx + 1]}
                          onNavigate={scrollToTopic}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <footer
              className="border-t pt-6 text-[12px]"
              style={{ borderColor: 'var(--tfd-surface-border)', color: 'var(--tfd-400)' }}
            >
              Guia do Usuário TFD · {WIKI_TOPICS.length} tópicos · SES-MA / Citiesoft
            </footer>
          </main>
        </div>
      )}

      {/* Voltar ao início */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Voltar ao início da página"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5"
          style={{
            background: 'var(--tfd-surface-card)',
            borderColor: 'var(--tfd-surface-border)',
            color: 'var(--tfd-blue-600)',
            boxShadow: 'var(--tfd-shadow-lg)',
          }}
        >
          <ChevronUp size={20} />
        </button>
      )}
    </div>
  );
}
