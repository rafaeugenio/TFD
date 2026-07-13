'use client';

import { ListTree } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import ChapterSidebar from '../components/ChapterSidebar';
import { chapterTopics, getChapter, WIKI_CHAPTERS } from '../data/wikiTopics';

interface ChapterOverviewProps {
  chapterId: string;
}

/** Índice do capítulo: apresenta o módulo e lista os subcapítulos (páginas). */
export default function ChapterOverview({ chapterId }: ChapterOverviewProps) {
  const router = useRouter();
  const chapter = getChapter(chapterId)!;
  const topics = useMemo(() => chapterTopics(chapter), [chapter]);

  const chapterIndex = WIKI_CHAPTERS.findIndex((c) => c.id === chapter.id);
  const prevChapter = WIKI_CHAPTERS[chapterIndex - 1];
  const nextChapter = WIKI_CHAPTERS[chapterIndex + 1];

  // Links antigos usavam âncora (/wiki/capitulo#topico); redireciona para a página do tópico.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && chapter.topicos.includes(hash)) {
      router.replace(`/wiki/${chapter.id}/${hash}`);
    }
  }, [chapter, router]);

  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <nav aria-label="Trilha de navegação" className="mb-10 pt-2">
        <ol className="flex flex-wrap items-center gap-2 text-[13.5px]">
          <li>
            <Link href="/wiki" className="hover:underline" style={{ color: 'var(--tfd-500)' }}>
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

      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-20">
        <aside className="hidden lg:block">
          <div className="sticky top-10 max-h-[calc(100vh-5rem)] overflow-y-auto pb-8">
            <ChapterSidebar currentChapterId={chapter.id} />
          </div>
        </aside>

        <details
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
            <ChapterSidebar currentChapterId={chapter.id} />
          </div>
        </details>

        <main className="min-w-0 max-w-[680px] pb-20">
          <header>
            <p
              className="text-[12px] font-medium uppercase tracking-[0.1em]"
              style={{ color: 'var(--tfd-400)' }}
            >
              Capítulo {String(chapter.numero).padStart(2, '0')}
            </p>
            <h1
              className="mt-2 text-[28px] font-bold tracking-[-0.02em]"
              style={{ color: 'var(--tfd-900)' }}
            >
              {chapter.titulo}
            </h1>
            <p className="mt-3 text-[15.5px] leading-[1.7]" style={{ color: 'var(--tfd-500)' }}>
              {chapter.descricao}
            </p>
          </header>

          <ol className="mt-10 divide-y divide-[var(--tfd-surface-border)]">
            {topics.map((topic, i) => (
              <li key={topic.id}>
                <Link
                  href={`/wiki/${chapter.id}/${topic.id}`}
                  className="group flex items-baseline gap-4 py-5"
                >
                  <span
                    className="w-6 shrink-0 text-right text-[13px] tabular-nums"
                    style={{ color: 'var(--tfd-400)' }}
                    aria-hidden="true"
                  >
                    {chapter.numero}.{i + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block text-[16px] font-medium underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-current"
                      style={{ color: 'var(--tfd-900)' }}
                    >
                      {topic.titulo}
                    </span>
                    <span className="mt-1 block text-[13.5px] leading-[1.6]" style={{ color: 'var(--tfd-500)' }}>
                      {topic.descricao}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <nav
            aria-label="Navegação entre capítulos"
            className="mt-14 flex items-baseline justify-between gap-4 border-t pt-6 text-[14px]"
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
      </div>
    </div>
  );
}
