'use client';

import type { WikiTopic } from '../data/wikiTopics';
import { chapterOfTopic, getTopic } from '../data/wikiTopics';
import VideoPlayer from './VideoPlayer';

interface TopicArticleProps {
  topic: WikiTopic;
  onNavigate: (topicId: string) => void;
}

/** Heading interno de um tópico, em estilo de documento: só tipografia. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-3 mt-10 text-[15px] font-semibold" style={{ color: 'var(--tfd-900)' }}>
      {children}
    </h4>
  );
}

export default function TopicArticle({ topic, onNavigate }: TopicArticleProps) {
  const relacionados = (topic.relacionados ?? [])
    .map((id) => getTopic(id))
    .filter((t): t is WikiTopic => Boolean(t));

  return (
    <article
      id={topic.id}
      data-wiki-topic={topic.id}
      aria-labelledby={`${topic.id}-titulo`}
      className="scroll-mt-24"
    >
      <header>
        <h3
          id={`${topic.id}-titulo`}
          className="text-[21px] font-semibold tracking-[-0.01em]"
          style={{ color: 'var(--tfd-900)' }}
        >
          {topic.titulo}
        </h3>
      </header>

      <p className="mt-4 text-[15px] leading-[1.75]" style={{ color: 'var(--tfd-700)' }}>
        {topic.paraQueServe}
      </p>
      <p className="mt-3 text-[15px] leading-[1.75]" style={{ color: 'var(--tfd-700)' }}>
        <span className="font-medium" style={{ color: 'var(--tfd-900)' }}>
          Quando usar.
        </span>{' '}
        {topic.quandoUsar}
      </p>

      <SectionHeading>Passo a passo</SectionHeading>
      <ol className="ml-5 list-decimal space-y-2.5 marker:text-[13px] marker:font-medium marker:text-[var(--tfd-400)]">
        {topic.passos.map((passo, i) => (
          <li
            key={i}
            className="pl-1.5 text-[15px] leading-[1.7]"
            style={{ color: 'var(--tfd-700)' }}
          >
            {passo}
          </li>
        ))}
      </ol>

      {topic.campos && topic.campos.length > 0 && (
        <>
          <SectionHeading>Campos importantes</SectionHeading>
          <dl className="divide-y" style={{ borderColor: 'var(--tfd-surface-border)' }}>
            {topic.campos.map((campo) => (
              <div
                key={campo.nome}
                className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[200px_1fr]"
                style={{ borderColor: 'var(--tfd-surface-border)' }}
              >
                <dt className="text-[14px] font-medium" style={{ color: 'var(--tfd-900)' }}>
                  {campo.nome}
                </dt>
                <dd className="text-[14px] leading-[1.65]" style={{ color: 'var(--tfd-600)' }}>
                  {campo.detalhe}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {topic.cuidados && topic.cuidados.length > 0 && (
        <>
          <SectionHeading>Cuidados frequentes</SectionHeading>
          <div
            className="border-l-2 pl-5"
            style={{ borderColor: 'var(--tfd-200)' }}
          >
            <ul className="space-y-2.5">
              {topic.cuidados.map((cuidado, i) => (
                <li
                  key={i}
                  className="text-[14.5px] leading-[1.7]"
                  style={{ color: 'var(--tfd-600)' }}
                >
                  {cuidado}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {topic.video && (
        <div className="mt-10">
          <VideoPlayer video={topic.video} />
        </div>
      )}

      {relacionados.length > 0 && (
        <p className="mt-8 text-[14px]" style={{ color: 'var(--tfd-500)' }}>
          Ver também:{' '}
          {relacionados.map((rel, i) => {
            const chapter = chapterOfTopic(rel.id);
            return (
              <span key={rel.id}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <a
                  href={chapter ? `/wiki/${chapter.id}#${rel.id}` : `#${rel.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(rel.id);
                  }}
                  className="underline decoration-[var(--tfd-300)] underline-offset-4 transition-colors hover:decoration-current"
                  style={{ color: 'var(--tfd-blue-600)' }}
                >
                  {rel.titulo}
                </a>
              </span>
            );
          })}
        </p>
      )}
    </article>
  );
}
