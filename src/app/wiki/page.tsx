'use client';

import { ArrowRight, ArrowUpRight, Search, SearchX, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CHAPTER_ICONS } from './components/chapterIcons';
import {
  chapterOfTopic,
  chapterTopics,
  searchTopics,
  WIKI_CHAPTERS,
} from './data/wikiTopics';

/**
 * Home do Guia do Usuário TFD: hero funcional + capítulos por módulo.
 * Cada capítulo leva à sua própria página em /wiki/[capitulo].
 */
export default function WikiHomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchTopics(query) : []), [query, searching]);

  const openTopic = (topicId: string) => {
    const chapter = chapterOfTopic(topicId);
    if (chapter) router.push(`/wiki/${chapter.id}#${topicId}`);
  };

  return (
    <div className="mx-auto w-full max-w-[880px]">
      {/* Hero */}
      <header className="tfd-reveal pb-10 pt-8 text-center sm:pt-14">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'var(--tfd-blue-600)' }}
        >
          TFD · SES-MA
        </p>
        <h1
          className="mt-2 text-[32px] font-bold tracking-[-0.02em] sm:text-[38px]"
          style={{ color: 'var(--tfd-900)' }}
        >
          Guia do Usuário TFD
        </h1>
        <p className="mx-auto mt-2 max-w-[480px] text-[14.5px]" style={{ color: 'var(--tfd-500)' }}>
          Aprenda a operar o sistema de Tratamento Fora do Domicílio, capítulo por capítulo.
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            href={`/wiki/${WIKI_CHAPTERS[0].id}`}
            className="tfd-btn tfd-btn-primary inline-flex items-center gap-2"
          >
            Começar do início
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        {/* Busca local */}
        <div className="relative mx-auto mt-8 max-w-[520px] text-left">
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
            placeholder="Buscar no manual: parecer, passagem, encerramento..."
            aria-label="Buscar tópicos do manual"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1"
              style={{ color: 'var(--tfd-500)' }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      {searching ? (
        /* ───────────── Resultados da busca ───────────── */
        <section aria-label="Resultados da busca" aria-live="polite" className="pb-16">
          <p className="mb-4 text-[13px]" style={{ color: 'var(--tfd-500)' }}>
            {results.length === 0
              ? 'Nenhum resultado'
              : `${results.length} tópico${results.length > 1 ? 's' : ''} encontrado${results.length > 1 ? 's' : ''}`}{' '}
            para <strong style={{ color: 'var(--tfd-800)' }}>&ldquo;{query.trim()}&rdquo;</strong>
          </p>

          {results.length === 0 ? (
            <div className="tfd-card flex flex-col items-center gap-3 px-6 py-14 text-center" role="status">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: 'var(--tfd-50)', color: 'var(--tfd-400)' }}
                aria-hidden="true"
              >
                <SearchX size={22} />
              </span>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--tfd-900)' }}>
                  Nada encontrado no manual
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
                const chapter = chapterOfTopic(topic.id);
                const Icon = chapter ? CHAPTER_ICONS[chapter.id] : null;
                return (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => openTopic(topic.id)}
                      className="tfd-card group flex h-full w-full flex-col gap-2 p-4 text-left transition-shadow hover:shadow-[var(--tfd-shadow-md)]"
                    >
                      <span
                        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: 'var(--tfd-blue-600)' }}
                      >
                        {Icon && <Icon size={12} aria-hidden="true" />}
                        {chapter ? `Capítulo ${String(chapter.numero).padStart(2, '0')} · ${chapter.titulo}` : ''}
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
        /* ───────────── Lista de capítulos ───────────── */
        <main className="pb-16">
          <ol className="tfd-stagger list-none">
            {WIKI_CHAPTERS.map((chapter) => {
              const topics = chapterTopics(chapter);
              return (
                <li
                  key={chapter.id}
                  className="grid gap-6 border-t py-10 sm:grid-cols-[240px_1fr] sm:gap-10"
                  style={{ borderColor: 'var(--tfd-surface-border)' }}
                >
                  {/* Coluna esquerda: identificação do capítulo */}
                  <div className="flex flex-col items-start">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: 'var(--tfd-blue-600)' }}
                    >
                      Capítulo {String(chapter.numero).padStart(2, '0')}
                    </p>
                    <h2
                      className="mt-1.5 text-[18px] font-bold leading-snug tracking-[-0.01em]"
                      style={{ color: 'var(--tfd-900)' }}
                    >
                      <Link
                        href={`/wiki/${chapter.id}`}
                        className="transition-colors hover:underline"
                        style={{ color: 'inherit' }}
                      >
                        {chapter.titulo}
                      </Link>
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--tfd-500)' }}>
                      {chapter.descricao}
                    </p>
                    <span
                      className="mt-3 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                      style={{
                        borderColor: 'var(--tfd-surface-border)',
                        color: 'var(--tfd-600)',
                        background: 'var(--tfd-surface-card)',
                      }}
                    >
                      {chapter.tag}
                    </span>
                    <Link
                      href={`/wiki/${chapter.id}`}
                      className="tfd-btn tfd-btn-primary tfd-btn--sm mt-6 inline-flex items-center gap-1.5"
                    >
                      Acessar capítulo
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>

                  {/* Coluna direita: ilustração + tópicos */}
                  <div className="min-w-0">
                    <Link
                      href={`/wiki/${chapter.id}`}
                      aria-label={`Abrir capítulo ${chapter.titulo}`}
                      className="group block overflow-hidden rounded-xl border transition-shadow hover:shadow-[var(--tfd-shadow-md)]"
                      style={{
                        borderColor: 'var(--tfd-surface-border)',
                        background: 'var(--tfd-blue-50)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- print estático local */}
                      <img
                        src={chapter.imagem.src}
                        alt={chapter.imagem.alt}
                        loading="lazy"
                        className="h-[180px] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] sm:h-[240px]"
                      />
                    </Link>
                    <ul className="mt-4 space-y-1.5">
                      {topics.map((topic) => (
                        <li key={topic.id}>
                          <Link
                            href={`/wiki/${chapter.id}#${topic.id}`}
                            className="group inline-flex items-baseline gap-2 text-[13px] transition-colors"
                            style={{ color: 'var(--tfd-700)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--tfd-blue-600)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--tfd-700)';
                            }}
                          >
                            <ArrowRight
                              size={12}
                              className="shrink-0 translate-y-0.5"
                              style={{ color: 'var(--tfd-blue-500)' }}
                              aria-hidden="true"
                            />
                            {topic.titulo}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ol>

          <footer
            className="border-t pt-6 text-center text-[12px]"
            style={{ borderColor: 'var(--tfd-surface-border)', color: 'var(--tfd-400)' }}
          >
            Guia do Usuário TFD · SES-MA · Desenvolvido por Citiesoft
          </footer>
        </main>
      )}
    </div>
  );
}
