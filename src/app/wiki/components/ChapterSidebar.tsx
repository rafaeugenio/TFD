'use client';

import Link from 'next/link';
import type { WikiChapter } from '../data/wikiTopics';
import { chapterTopics, WIKI_CHAPTERS } from '../data/wikiTopics';

interface ChapterSidebarProps {
  currentChapter: WikiChapter;
  activeTopicId: string | null;
  onTopicClick: (topicId: string) => void;
}

/** Navegação lateral das páginas de capítulo, em estilo de documento:
 *  lista tipográfica simples, capítulo atual expandido com seus tópicos. */
export default function ChapterSidebar({
  currentChapter,
  activeTopicId,
  onTopicClick,
}: ChapterSidebarProps) {
  return (
    <nav aria-label="Capítulos do manual" className="space-y-0.5">
      {WIKI_CHAPTERS.map((chapter) => {
        const isCurrent = chapter.id === currentChapter.id;
        return (
          <div key={chapter.id}>
            <Link
              href={`/wiki/${chapter.id}`}
              aria-current={isCurrent ? 'page' : undefined}
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
                  const active = topic.id === activeTopicId;
                  return (
                    <li key={topic.id}>
                      <button
                        type="button"
                        onClick={() => onTopicClick(topic.id)}
                        aria-current={active ? 'true' : undefined}
                        className="block w-full py-1 text-left text-[13px] leading-snug transition-colors"
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
                      </button>
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
