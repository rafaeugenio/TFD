'use client';

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CircleHelp,
  Link2,
  ListChecks,
  Target,
} from 'lucide-react';
import type { WikiTopic } from '../data/wikiTopics';
import { getTopic } from '../data/wikiTopics';
import VideoPlayer from './VideoPlayer';

interface TopicArticleProps {
  topic: WikiTopic;
  prev?: WikiTopic;
  next?: WikiTopic;
  onNavigate: (topicId: string) => void;
}

function SectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h4
      className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: 'var(--tfd-500)' }}
    >
      <span aria-hidden="true" style={{ color: 'var(--tfd-blue-500)' }}>
        {icon}
      </span>
      {children}
    </h4>
  );
}

export default function TopicArticle({ topic, prev, next, onNavigate }: TopicArticleProps) {
  const relacionados = (topic.relacionados ?? [])
    .map((id) => getTopic(id))
    .filter((t): t is WikiTopic => Boolean(t));

  return (
    <article
      id={topic.id}
      data-wiki-topic={topic.id}
      aria-labelledby={`${topic.id}-titulo`}
      className="tfd-card scroll-mt-24 p-5 sm:p-7"
    >
      <header className="mb-5">
        <h3
          id={`${topic.id}-titulo`}
          className="text-[18px] font-bold tracking-[-0.01em]"
          style={{ color: 'var(--tfd-900)' }}
        >
          {topic.titulo}
        </h3>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--tfd-500)' }}>
          {topic.descricao}
        </p>
      </header>

      <div className="space-y-6">
        <section>
          <SectionLabel icon={<Target size={13} />}>Para que serve</SectionLabel>
          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--tfd-700)' }}>
            {topic.paraQueServe}
          </p>
        </section>

        <section>
          <SectionLabel icon={<CircleHelp size={13} />}>Quando usar</SectionLabel>
          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--tfd-700)' }}>
            {topic.quandoUsar}
          </p>
        </section>

        <section>
          <SectionLabel icon={<ListChecks size={13} />}>Passo a passo</SectionLabel>
          <ol className="space-y-2.5">
            {topic.passos.map((passo, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed">
                <span
                  className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-600)' }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span style={{ color: 'var(--tfd-700)' }}>{passo}</span>
              </li>
            ))}
          </ol>
        </section>

        {topic.campos && topic.campos.length > 0 && (
          <section>
            <SectionLabel icon={<ListChecks size={13} />}>Campos importantes</SectionLabel>
            <dl
              className="divide-y overflow-hidden rounded-lg border"
              style={{ borderColor: 'var(--tfd-surface-border)' }}
            >
              {topic.campos.map((campo) => (
                <div
                  key={campo.nome}
                  className="grid gap-x-4 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[200px_1fr]"
                  style={{ borderColor: 'var(--tfd-surface-border)' }}
                >
                  <dt className="text-[13px] font-semibold" style={{ color: 'var(--tfd-900)' }}>
                    {campo.nome}
                  </dt>
                  <dd className="text-[13px] leading-relaxed" style={{ color: 'var(--tfd-600)' }}>
                    {campo.detalhe}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {topic.cuidados && topic.cuidados.length > 0 && (
          <section>
            <SectionLabel icon={<AlertTriangle size={13} />}>Cuidados frequentes</SectionLabel>
            <ul className="space-y-2">
              {topic.cuidados.map((cuidado, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    background: 'var(--tfd-warning-bg, #fff7ed)',
                    color: 'var(--tfd-800)',
                  }}
                >
                  <AlertTriangle
                    size={15}
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--tfd-warning)' }}
                    aria-hidden="true"
                  />
                  <span>{cuidado}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {topic.video && (
          <section>
            <SectionLabel icon={<ListChecks size={13} />}>Vídeo demonstrativo</SectionLabel>
            <VideoPlayer video={topic.video} />
          </section>
        )}

        {relacionados.length > 0 && (
          <section>
            <SectionLabel icon={<Link2 size={13} />}>Tópicos relacionados</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {relacionados.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => onNavigate(rel.id)}
                  className="rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors hover:border-transparent"
                  style={{
                    borderColor: 'var(--tfd-surface-border)',
                    color: 'var(--tfd-blue-600)',
                    background: 'var(--tfd-surface-card)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--tfd-blue-50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--tfd-surface-card)';
                  }}
                >
                  {rel.titulo}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {(prev || next) && (
        <footer
          className="mt-7 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between"
          style={{ borderColor: 'var(--tfd-surface-border)' }}
        >
          {prev ? (
            <button
              type="button"
              onClick={() => onNavigate(prev.id)}
              className="group flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors"
              style={{ color: 'var(--tfd-600)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--tfd-50)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ArrowUp size={15} aria-hidden="true" />
              <span>
                <span className="block text-[11px]" style={{ color: 'var(--tfd-400)' }}>
                  Tópico anterior
                </span>
                <span className="font-medium" style={{ color: 'var(--tfd-800)' }}>
                  {prev.titulo}
                </span>
              </span>
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button
              type="button"
              onClick={() => onNavigate(next.id)}
              className="group flex items-center justify-end gap-2 rounded-lg px-3 py-2 text-right text-[13px] transition-colors"
              style={{ color: 'var(--tfd-600)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--tfd-blue-50)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>
                <span className="block text-[11px]" style={{ color: 'var(--tfd-400)' }}>
                  Próximo tópico
                </span>
                <span className="font-medium" style={{ color: 'var(--tfd-blue-600)' }}>
                  {next.titulo}
                </span>
              </span>
              <ArrowDown size={15} aria-hidden="true" />
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
