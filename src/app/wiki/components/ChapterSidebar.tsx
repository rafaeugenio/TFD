'use client';

import Link from 'next/link';
import { chapterTopics, WIKI_CHAPTERS } from '../data/wikiTopics';

interface ChapterSidebarProps {
  currentChapterId: string;
  /** Tópico aberto, quando a página atual é um tópico. */
  currentTopicId?: string;
}

/** Menu esquerdo do manual: capítulos e subcapítulos (cada um é uma página).
 *  O capítulo atual fica expandido mostrando seus tópicos. */
export default function ChapterSidebar({ currentChapterId, currentTopicId }: ChapterSidebarProps) {
  return (
    <nav aria-label="Capítulos do manual" className="space-y-0.5">
      {WIKI_CHAPTERS.map((chapter) => {
        const isCurrent = chapter.id === currentChapterId;
        return (
          <div key={chapter.id}>
            <Link
              href={`/wiki/${chapter.id}`}
              aria-current={isCurrent && !currentTopicId ? 'page' : undefined}
              className="flex items-baseline gap-2 rounded-md px-2 py-1.5 text-[13.5px] transition-colors"
              style={{
                color: isCurrent ? 'var(--tfd-900)' : 'var(--tfd-500)',
                fontWeight: isCurrent ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) e.currentTarget.style.color = 'var(--tfd-800)';
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) e.currentTarget.style.color = 'var(--tfd-500)';
              }}
            >
              <span
                className="w-4 shrink-0 text-right text-[12px] tabular-nums"
                style={{ color: 'var(--tfd-400)' }}
                aria-hidden="true"
              >
                {chapter.numero}
              </span>
              <span className="min-w-0 flex-1">{chapter.titulo}</span>
            </Link>

            {isCurrent && (
              <ul
                className="mb-2 ml-[15px] mt-1 space-y-0.5 border-l pl-4"
                style={{ borderColor: 'var(--tfd-surface-border)' }}
              >
                {chapterTopics(chapter).map((topic) => {
                  const active = topic.id === currentTopicId;
                  return (
                    <li key={topic.id}>
                      <Link
                        href={`/wiki/${chapter.id}/${topic.id}`}
                        aria-current={active ? 'page' : undefined}
                        className="block py-1 text-[13px] leading-snug transition-colors"
                        style={{
                          color: active ? 'var(--tfd-blue-600)' : 'var(--tfd-500)',
                          fontWeight: active ? 500 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.color = 'var(--tfd-800)';
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.color = 'var(--tfd-500)';
                        }}
                      >
                        {topic.titulo}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
