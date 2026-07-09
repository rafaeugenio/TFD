'use client';

import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Compass, Settings2, Workflow } from 'lucide-react';
import type { WikiCategoryId } from '../data/wikiTopics';
import { WIKI_CATEGORIES, topicsByCategory } from '../data/wikiTopics';

export const CATEGORY_ICONS: Record<WikiCategoryId, LucideIcon> = {
  'primeiros-passos': Compass,
  cadastros: ClipboardList,
  fluxo: Workflow,
  gestao: Settings2,
};

interface WikiSidebarProps {
  activeTopicId: string | null;
  onNavigate: (topicId: string) => void;
}

export default function WikiSidebar({ activeTopicId, onNavigate }: WikiSidebarProps) {
  return (
    <nav aria-label="Sumário do guia" className="space-y-5">
      {WIKI_CATEGORIES.map((cat) => {
        const Icon = CATEGORY_ICONS[cat.id];
        const topics = topicsByCategory(cat.id);
        return (
          <div key={cat.id}>
            <p
              className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--tfd-400)' }}
            >
              <Icon size={13} aria-hidden="true" />
              {cat.titulo}
            </p>
            <ul className="space-y-0.5">
              {topics.map((topic) => {
                const active = topic.id === activeTopicId;
                return (
                  <li key={topic.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(topic.id)}
                      aria-current={active ? 'true' : undefined}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors"
                      style={{
                        color: active ? 'var(--tfd-blue-600)' : 'var(--tfd-600)',
                        background: active ? 'var(--tfd-blue-50)' : 'transparent',
                        fontWeight: active ? 600 : 400,
                        borderLeft: `2px solid ${active ? 'var(--tfd-blue-500)' : 'transparent'}`,
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
          </div>
        );
      })}
    </nav>
  );
}
