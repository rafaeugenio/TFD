'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { WikiChapter } from '../data/wikiTopics';
import { chapterTopics, WIKI_CHAPTERS } from '../data/wikiTopics';

interface ChapterSidebarProps {
  currentChapter: WikiChapter;
  activeTopicId: string | null;
  onTopicClick: (topicId: string) => void;
}

/** Navegação lateral das páginas de capítulo: lista numerada de capítulos,
 *  com o capítulo atual expandido mostrando seus tópicos. */
export default function ChapterSidebar({
  currentChapter,
  activeTopicId,
  onTopicClick,
}: ChapterSidebarProps) {
  return (
    <nav aria-label="Capítulos do manual" className="space-y-1">
      {WIKI_CHAPTERS.map((chapter) => {
        const isCurrent = chapter.id === currentChapter.id;
        return (
          <div key={chapter.id}>
            <Link
              href={`/wiki/${chapter.id}`}
              aria-current={isCurrent ? 'page' : undefined}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors"
              style={{
                color: isCurrent ? 'var(--tfd-900)' : 'var(--tfd-600)',
                fontWeight: isCurrent ? 600 : 500,
                background: isCurrent ? 'var(--tfd-50)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'var(--tfd-50)';
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                style={{
                  background: isCurrent ? 'var(--tfd-blue-500)' : 'var(--tfd-100)',
                  color: isCurrent ? '#fff' : 'var(--tfd-500)',
                }}
                aria-hidden="true"
              >
                {chapter.numero}
              </span>
              <span className="min-w-0 flex-1 truncate">{chapter.titulo}</span>
              <span aria-hidden="true" style={{ color: 'var(--tfd-400)' }}>
                {isCurrent ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </Link>

            {isCurrent && (
              <ul
                className="ml-[21px] mt-0.5 space-y-0.5 border-l pl-3"
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
                        className="block w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors"
                        style={{
                          color: active ? 'var(--tfd-blue-600)' : 'var(--tfd-600)',
                          background: active ? 'var(--tfd-blue-50)' : 'transparent',
                          fontWeight: active ? 600 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.background = 'var(--tfd-50)';
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.background = 'transparent';
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
