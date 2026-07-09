'use client';

import { ArrowLeft, ArrowRight, ChevronUp, ListTree } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChapterSidebar from '../components/ChapterSidebar';
import { CHAPTER_ICONS } from '../components/chapterIcons';
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
  const Icon = CHAPTER_ICONS[chapter.id];

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
      // Tópico de outro capítulo (link "relacionados"): troca de página.
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
      <div className="fixed inset-x-0 top-0 z-50 h-[3px]" aria-hidden="true">
        <div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: 'var(--tfd-blue-500)',
            transition: 'width 120ms linear',
          }}
        />
      </div>

      {/* Breadcrumb */}
      <nav aria-label="Trilha de navegação" className="tfd-reveal mb-6 pt-2">
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <li>
            <Link
              href="/wiki"
              className="inline-flex items-center gap-1.5 transition-colors hover:underline"
              style={{ color: 'var(--tfd-500)' }}
            >
              <ArrowLeft size={13} aria-hidden="true" />
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

      <div className="lg:grid lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[236px_minmax(0,1fr)_200px]">
        {/* Sidebar de capítulos (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pb-8 pr-1">
            <ChapterSidebar
              currentChapter={chapter}
              activeTopicId={activeTopicId}
              onTopicClick={scrollToTopic}
            />
          </div>
        </aside>

        {/* Sumário compacto (mobile) */}
        <details ref={mobileTocRef} className="tfd-card mb-6 overflow-hidden p-0 lg:hidden">
          <summary
            className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13px] font-semibold"
            style={{ color: 'var(--tfd-800)' }}
          >
            <ListTree size={16} style={{ color: 'var(--tfd-blue-500)' }} aria-hidden="true" />
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
        <main className="min-w-0 pb-16">
          <header className="tfd-reveal mb-7">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--tfd-blue-600)' }}
            >
              Capítulo {String(chapter.numero).padStart(2, '0')}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-600)' }}
                aria-hidden="true"
              >
                <Icon size={20} />
              </span>
              <h1
                className="text-[26px] font-bold tracking-[-0.02em]"
                style={{ color: 'var(--tfd-900)' }}
              >
                {chapter.titulo}
              </h1>
            </div>
            <p className="mt-2 max-w-[620px] text-[14px] leading-relaxed" style={{ color: 'var(--tfd-500)' }}>
              {chapter.descricao}
            </p>
          </header>

          <div className="space-y-5">
            {topics.map((topic, i) => (
              <TopicArticle
                key={topic.id}
                topic={topic}
                prev={topics[i - 1]}
                next={topics[i + 1]}
                onNavigate={scrollToTopic}
              />
            ))}
          </div>

          {/* Capítulo anterior / próximo */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {prevChapter ? (
              <Link
                href={`/wiki/${prevChapter.id}`}
                className="tfd-card flex items-center gap-3 p-4 transition-shadow hover:shadow-[var(--tfd-shadow-md)]"
              >
                <ArrowLeft size={16} className="shrink-0" style={{ color: 'var(--tfd-400)' }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-[11px]" style={{ color: 'var(--tfd-400)' }}>
                    Capítulo anterior
                  </span>
                  <span className="block truncate text-[14px] font-semibold" style={{ color: 'var(--tfd-800)' }}>
                    {prevChapter.titulo}
                  </span>
                </span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {nextChapter && (
              <Link
                href={`/wiki/${nextChapter.id}`}
                className="tfd-card flex items-center justify-end gap-3 p-4 text-right transition-shadow hover:shadow-[var(--tfd-shadow-md)]"
              >
                <span className="min-w-0">
                  <span className="block text-[11px]" style={{ color: 'var(--tfd-400)' }}>
                    Próximo capítulo
                  </span>
                  <span className="block truncate text-[14px] font-semibold" style={{ color: 'var(--tfd-blue-600)' }}>
                    {nextChapter.titulo}
                  </span>
                </span>
                <ArrowRight size={16} className="shrink-0" style={{ color: 'var(--tfd-blue-500)' }} aria-hidden="true" />
              </Link>
            )}
          </div>

          <footer
            className="mt-10 border-t pt-6 text-center text-[12px]"
            style={{ borderColor: 'var(--tfd-surface-border)', color: 'var(--tfd-400)' }}
          >
            Guia do Usuário TFD · SES-MA · Desenvolvido por Citiesoft
          </footer>
        </main>

        {/* "Nesta página" (telas largas) */}
        <aside className="hidden xl:block">
          <nav aria-label="Nesta página" className="sticky top-8">
            <p
              className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--tfd-500)' }}
            >
              Nesta página
            </p>
            <ul className="space-y-1 border-l" style={{ borderColor: 'var(--tfd-surface-border)' }}>
              {topics.map((topic) => {
                const active = topic.id === activeTopicId;
                return (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => scrollToTopic(topic.id)}
                      aria-current={active ? 'true' : undefined}
                      className="block w-full py-1 pl-3 text-left text-[12.5px] transition-colors"
                      style={{
                        color: active ? 'var(--tfd-blue-600)' : 'var(--tfd-500)',
                        fontWeight: active ? 600 : 400,
                        borderLeft: `2px solid ${active ? 'var(--tfd-blue-500)' : 'transparent'}`,
                        marginLeft: '-1px',
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
