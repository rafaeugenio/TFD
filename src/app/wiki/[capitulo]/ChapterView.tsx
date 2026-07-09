'use client';

import { ChevronUp, ListTree } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChapterSidebar from '../components/ChapterSidebar';
import TopicArticle from '../components/TopicArticle';
import {
  chapterOfTopic,
  chapterTopics,
  getChapter,
  WIKI_CHAPTERS,
} from '../data/wikiTopics';

interface ChapterViewProps {
  chapterId: string;
}

export default function ChapterView({ chapterId }: ChapterViewProps) {
  const router = useRouter();
  const chapter = getChapter(chapterId)!;
  const topics = useMemo(() => chapterTopics(chapter), [chapter]);

  const chapterIndex = WIKI_CHAPTERS.findIndex((c) => c.id === chapter.id);
  const prevChapter = WIKI_CHAPTERS[chapterIndex - 1];
  const nextChapter = WIKI_CHAPTERS[chapterIndex + 1];

  const [activeTopicId, setActiveTopicId] = useState<string | null>(topics[0]?.id ?? null);
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mobileTocRef = useRef<HTMLDetailsElement>(null);

  const scrollToTopic = useCallback(
    (topicId: string) => {
      if (mobileTocRef.current) mobileTocRef.current.open = false;
      if (chapter.topicos.includes(topicId)) {
        const el = document.getElementById(topicId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveTopicId(topicId);
        }
        return;
      }
      // Tópico de outro capítulo (link "ver também"): troca de página.
      const target = chapterOfTopic(topicId);
      if (target) router.push(`/wiki/${target.id}#${topicId}`);
    },
    [chapter, router],
  );

  // Rola até o tópico da âncora (#topico) ao abrir a página.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        setActiveTopicId(hash);
      }
    });
  }, [chapterId]);

  // Tópico ativo conforme a rolagem.
  useEffect(() => {
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
  }, [chapterId]);

  // Progresso de leitura + "voltar ao início".
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
    <div className="mx-auto w-full max-w-[1280px]">
      {/* Barra de progresso de leitura */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px]" aria-hidden="true">
        <div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: 'var(--tfd-blue-500)',
            transition: 'width 120ms linear',
          }}
        />
      </div>

      {/* Trilha de navegação */}
      <nav aria-label="Trilha de navegação" className="mb-10 pt-2">
        <ol className="flex flex-wrap items-center gap-2 text-[13.5px]">
          <li>
            <Link
              href="/wiki"
              className="transition-colors hover:underline"
              style={{ color: 'var(--tfd-500)' }}
            >
              Manual do Usuário
            </Link>
          </li>
          <li aria-hidden="true" style={{ color: 'var(--tfd-300)' }}>
            /
          </li>
          <li className="font-medium" style={{ color: 'var(--tfd-800)' }} aria-current="page">
            {chapter.titulo}
          </li>
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[220px_minmax(0,1fr)_190px] xl:gap-14">
        {/* Sumário de capítulos (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-10 max-h-[calc(100vh-5rem)] overflow-y-auto pb-8">
            <ChapterSidebar
              currentChapter={chapter}
              activeTopicId={activeTopicId}
              onTopicClick={scrollToTopic}
            />
          </div>
        </aside>

        {/* Sumário compacto (mobile) */}
        <details
          ref={mobileTocRef}
          className="mb-8 overflow-hidden rounded-lg border lg:hidden"
          style={{ borderColor: 'var(--tfd-surface-border)', background: 'var(--tfd-surface-card)' }}
        >
          <summary
            className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13.5px] font-medium"
            style={{ color: 'var(--tfd-800)' }}
          >
            <ListTree size={15} style={{ color: 'var(--tfd-400)' }} aria-hidden="true" />
            Capítulos do manual
          </summary>
          <div className="border-t px-3 pb-3 pt-2" style={{ borderColor: 'var(--tfd-surface-border)' }}>
            <ChapterSidebar
              currentChapter={chapter}
              activeTopicId={activeTopicId}
              onTopicClick={scrollToTopic}
            />
          </div>
        </details>

        {/* Conteúdo do capítulo */}
        <main className="min-w-0 max-w-[720px] pb-20">
          <header>
            <p
              className="text-[12px] font-medium uppercase tracking-[0.1em]"
              style={{ color: 'var(--tfd-400)' }}
            >
              Capítulo {String(chapter.numero).padStart(2, '0')}
            </p>
            <h1
              className="mt-2 text-[30px] font-bold tracking-[-0.02em]"
              style={{ color: 'var(--tfd-900)' }}
            >
              {chapter.titulo}
            </h1>
            <p className="mt-3 text-[15.5px] leading-[1.7]" style={{ color: 'var(--tfd-500)' }}>
              {chapter.descricao}
            </p>
          </header>

          <div className="mt-12 divide-y divide-[var(--tfd-surface-border)]">
            {topics.map((topic) => (
              <div key={topic.id} className="py-14 first:pt-0 last:pb-0">
                <TopicArticle topic={topic} onNavigate={scrollToTopic} />
              </div>
            ))}
          </div>

          {/* Capítulo anterior / próximo */}
          <nav
            aria-label="Navegação entre capítulos"
            className="mt-20 flex items-baseline justify-between gap-4 border-t pt-6 text-[14px]"
            style={{ borderColor: 'var(--tfd-surface-border)' }}
          >
            {prevChapter ? (
              <Link
                href={`/wiki/${prevChapter.id}`}
                className="transition-colors hover:underline"
                style={{ color: 'var(--tfd-500)' }}
              >
                ← {prevChapter.titulo}
              </Link>
            ) : (
              <span />
            )}
            {nextChapter && (
              <Link
                href={`/wiki/${nextChapter.id}`}
                className="text-right font-medium transition-colors hover:underline"
                style={{ color: 'var(--tfd-blue-600)' }}
              >
                {nextChapter.titulo} →
              </Link>
            )}
          </nav>

          <footer className="mt-12 text-[12.5px]" style={{ color: 'var(--tfd-400)' }}>
            Guia do Usuário TFD · SES-MA · Desenvolvido por Citiesoft
          </footer>
        </main>

        {/* "Nesta página" (telas largas) */}
        <aside className="hidden xl:block">
          <nav aria-label="Nesta página" className="sticky top-10">
            <p className="mb-3 text-[12.5px] font-medium" style={{ color: 'var(--tfd-800)' }}>
              Nesta página
            </p>
            <ul className="space-y-0.5 border-l" style={{ borderColor: 'var(--tfd-surface-border)' }}>
              {topics.map((topic) => {
                const active = topic.id === activeTopicId;
                return (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => scrollToTopic(topic.id)}
                      aria-current={active ? 'true' : undefined}
                      className="-ml-px block w-full border-l py-1 pl-3.5 text-left text-[12.5px] leading-snug transition-colors"
                      style={{
                        color: active ? 'var(--tfd-blue-600)' : 'var(--tfd-500)',
                        fontWeight: active ? 500 : 400,
                        borderColor: active ? 'var(--tfd-blue-500)' : 'transparent',
                      }}
                    >
                      {topic.titulo}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      </div>

      {/* Voltar ao início */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao início da página"
          className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5"
          style={{
            background: 'var(--tfd-surface-card)',
            borderColor: 'var(--tfd-surface-border)',
            color: 'var(--tfd-600)',
            boxShadow: 'var(--tfd-shadow-md)',
          }}
        >
          <ChevronUp size={18} />
        </button>
      )}
    </div>
  );
}
