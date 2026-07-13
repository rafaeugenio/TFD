'use client';

import { ChevronUp, ListTree } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ChapterSidebar from '../../components/ChapterSidebar';
import VideoPlayer from '../../components/VideoPlayer';
import type { WikiChapter, WikiTopic } from '../../data/wikiTopics';
import {
  chapterOfTopic,
  chapterTopics,
  getChapter,
  getTopic,
  WIKI_CHAPTERS,
} from '../../data/wikiTopics';

interface TopicViewProps {
  chapterId: string;
  topicId: string;
}

interface TopicSection {
  id: string;
  titulo: string;
}

/** Ordem linear global (capítulo a capítulo) para anterior/próximo. */
const ORDERED: { chapter: WikiChapter; topic: WikiTopic }[] = WIKI_CHAPTERS.flatMap((chapter) =>
  chapterTopics(chapter).map((topic) => ({ chapter, topic })),
);

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      data-topic-section={id}
      className="mb-4 mt-16 scroll-mt-28 text-[19px] font-semibold tracking-[-0.01em]"
      style={{ color: 'var(--tfd-900)' }}
    >
      {children}
    </h2>
  );
}

export default function TopicView({ chapterId, topicId }: TopicViewProps) {
  const chapter = getChapter(chapterId)!;
  const topic = getTopic(topicId)!;

  const orderedIndex = ORDERED.findIndex((e) => e.topic.id === topic.id);
  const prev = ORDERED[orderedIndex - 1];
  const next = ORDERED[orderedIndex + 1];

  const sections = useMemo<TopicSection[]>(() => {
    const list: TopicSection[] = [
      { id: 'visao-geral', titulo: 'Visão geral' },
      { id: 'passo-a-passo', titulo: 'Passo a passo' },
    ];
    if (topic.campos?.length) list.push({ id: 'campos', titulo: 'Campos importantes' });
    if (topic.dicas?.length) list.push({ id: 'dicas', titulo: 'Dicas e atalhos' });
    if (topic.cuidados?.length) list.push({ id: 'cuidados', titulo: 'Cuidados frequentes' });
    if (topic.video) list.push({ id: 'video', titulo: 'Vídeo demonstrativo' });
    return list;
  }, [topic]);

  const [activeSection, setActiveSection] = useState<string>('visao-geral');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Seção ativa conforme a rolagem (menu "Nesta página").
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-topic-section]'));
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveSection(visible[0].target.getAttribute('data-topic-section') ?? 'visao-geral');
        }
      },
      { rootMargin: '-10% 0px -70% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [topicId]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  const relacionados = (topic.relacionados ?? [])
    .map((id) => getTopic(id))
    .filter((t): t is WikiTopic => Boolean(t));

  return (
    <div className="mx-auto w-full max-w-[1360px]">
      {/* Trilha de navegação */}
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
          <li>
            <Link
              href={`/wiki/${chapter.id}`}
              className="hover:underline"
              style={{ color: 'var(--tfd-500)' }}
            >
              {chapter.titulo}
            </Link>
          </li>
          <li aria-hidden="true" style={{ color: 'var(--tfd-300)' }}>
            /
          </li>
          <li className="font-medium" style={{ color: 'var(--tfd-800)' }} aria-current="page">
            {topic.titulo}
          </li>
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-20 xl:grid-cols-[230px_minmax(0,1fr)_190px] xl:gap-24">
        {/* Menu esquerdo: capítulos e subcapítulos */}
        <aside className="hidden lg:block">
          <div className="sticky top-10 max-h-[calc(100vh-5rem)] overflow-y-auto pb-8">
            <ChapterSidebar currentChapterId={chapter.id} currentTopicId={topic.id} />
          </div>
        </aside>

        {/* Sumário compacto (mobile) */}
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
            <ChapterSidebar currentChapterId={chapter.id} currentTopicId={topic.id} />
          </div>
        </details>

        {/* "Nesta página" compacto (mobile) */}
        <details
          className="mb-8 overflow-hidden rounded-lg border lg:hidden"
          style={{ borderColor: 'var(--tfd-surface-border)', background: 'var(--tfd-surface-card)' }}
        >
          <summary
            className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13.5px] font-medium"
            style={{ color: 'var(--tfd-800)' }}
          >
            <ListTree size={15} style={{ color: 'var(--tfd-400)' }} aria-hidden="true" />
            Nesta página
          </summary>
          <ul className="border-t px-4 pb-3 pt-2" style={{ borderColor: 'var(--tfd-surface-border)' }}>
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.closest('details')?.removeAttribute('open');
                    scrollToSection(section.id);
                  }}
                  className="block w-full py-1.5 text-left text-[13px]"
                  style={{ color: 'var(--tfd-600)' }}
                >
                  {section.titulo}
                </button>
              </li>
            ))}
          </ul>
        </details>

        {/* Conteúdo do tópico */}
        <main className="min-w-0 max-w-[680px] pb-20">
          <header>
            <p
              className="text-[12px] font-medium uppercase tracking-[0.1em]"
              style={{ color: 'var(--tfd-400)' }}
            >
              Capítulo {String(chapter.numero).padStart(2, '0')} · {chapter.titulo}
            </p>
            <h1
              className="mt-2 text-[28px] font-bold tracking-[-0.02em]"
              style={{ color: 'var(--tfd-900)' }}
            >
              {topic.titulo}
            </h1>
          </header>

          <section id="visao-geral" data-topic-section="visao-geral" className="scroll-mt-28">
            <p className="mt-6 text-[16px] leading-[1.75]" style={{ color: 'var(--tfd-700)' }}>
              {topic.paraQueServe}
            </p>
            <p className="mt-3 text-[16px] leading-[1.75]" style={{ color: 'var(--tfd-700)' }}>
              <span className="font-medium" style={{ color: 'var(--tfd-900)' }}>
                Quando usar.
              </span>{' '}
              {topic.quandoUsar}
            </p>
          </section>

          {topic.imagem && (
            <figure className="mt-8">
              <div
                className="rounded-xl border p-4 sm:p-5"
                style={{
                  borderColor: 'var(--tfd-surface-border)',
                  background: 'var(--tfd-surface-ground)',
                  boxShadow: 'var(--tfd-shadow-xs)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- print estático local */}
                <img
                  src={topic.imagem.src}
                  alt={topic.imagem.alt}
                  loading="lazy"
                  className="w-full rounded-lg border"
                  style={{ borderColor: 'var(--tfd-surface-border)', background: 'var(--tfd-surface-card)' }}
                />
              </div>
              {topic.imagem.legenda && (
                <figcaption className="mt-2.5 text-[13px]" style={{ color: 'var(--tfd-500)' }}>
                  {topic.imagem.legenda}
                </figcaption>
              )}
            </figure>
          )}

          <SectionHeading id="passo-a-passo">Passo a passo</SectionHeading>
          <ol className="ml-5 list-decimal space-y-2.5 marker:text-[13px] marker:font-medium marker:text-[var(--tfd-400)]">
            {topic.passos.map((passo, i) => (
              <li key={i} className="pl-1.5 text-[16px] leading-[1.7]" style={{ color: 'var(--tfd-700)' }}>
                {passo}
              </li>
            ))}
          </ol>

          {topic.campos && topic.campos.length > 0 && (
            <>
              <SectionHeading id="campos">Campos importantes</SectionHeading>
              <dl className="divide-y divide-[var(--tfd-surface-border)]">
                {topic.campos.map((campo) => (
                  <div key={campo.nome} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[190px_1fr]">
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

          {topic.dicas && topic.dicas.length > 0 && (
            <>
              <SectionHeading id="dicas">Dicas e atalhos</SectionHeading>
              <ul className="ml-5 list-disc space-y-2.5 marker:text-[var(--tfd-300)]">
                {topic.dicas.map((dica, i) => (
                  <li key={i} className="pl-1 text-[16px] leading-[1.7]" style={{ color: 'var(--tfd-700)' }}>
                    {dica}
                  </li>
                ))}
              </ul>
            </>
          )}

          {topic.cuidados && topic.cuidados.length > 0 && (
            <>
              <SectionHeading id="cuidados">Cuidados frequentes</SectionHeading>
              <div className="border-l-2 pl-5" style={{ borderColor: 'var(--tfd-200)' }}>
                <ul className="space-y-2.5">
                  {topic.cuidados.map((cuidado, i) => (
                    <li key={i} className="text-[15px] leading-[1.7]" style={{ color: 'var(--tfd-600)' }}>
                      {cuidado}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {topic.video && (
            <>
              <SectionHeading id="video">Vídeo demonstrativo</SectionHeading>
              <VideoPlayer video={topic.video} />
            </>
          )}

          {relacionados.length > 0 && (
            <p className="mt-10 text-[14px]" style={{ color: 'var(--tfd-500)' }}>
              Ver também:{' '}
              {relacionados.map((rel, i) => {
                const relChapter = chapterOfTopic(rel.id);
                return (
                  <span key={rel.id}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    <Link
                      href={relChapter ? `/wiki/${relChapter.id}/${rel.id}` : '/wiki'}
                      className="underline decoration-[var(--tfd-300)] underline-offset-4 transition-colors hover:decoration-current"
                      style={{ color: 'var(--tfd-blue-600)' }}
                    >
                      {rel.titulo}
                    </Link>
                  </span>
                );
              })}
            </p>
          )}

          {/* Tópico anterior / próximo */}
          <nav
            aria-label="Navegação entre tópicos"
            className="mt-16 flex flex-col gap-2 border-t pt-6 text-[14px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            style={{ borderColor: 'var(--tfd-surface-border)' }}
          >
            {prev ? (
              <Link
                href={`/wiki/${prev.chapter.id}/${prev.topic.id}`}
                className="transition-colors hover:underline"
                style={{ color: 'var(--tfd-500)' }}
              >
                ← {prev.topic.titulo}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/wiki/${next.chapter.id}/${next.topic.id}`}
                className="font-medium transition-colors hover:underline sm:text-right"
                style={{ color: 'var(--tfd-blue-600)' }}
              >
                {next.topic.titulo} →
              </Link>
            )}
          </nav>

          <footer className="mt-12 text-[12.5px]" style={{ color: 'var(--tfd-400)' }}>
            Guia do Usuário TFD · SES-MA · Desenvolvido por Citiesoft
          </footer>
        </main>

        {/* Menu direito: tópicos DESTA página */}
        <aside className="hidden xl:block">
          <nav aria-label="Nesta página" className="sticky top-10">
            <p className="mb-3 text-[12.5px] font-medium" style={{ color: 'var(--tfd-800)' }}>
              Nesta página
            </p>
            <ul className="space-y-0.5 border-l" style={{ borderColor: 'var(--tfd-surface-border)' }}>
              {sections.map((section) => {
                const active = section.id === activeSection;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      aria-current={active ? 'true' : undefined}
                      className="-ml-px block w-full border-l py-1 pl-3.5 text-left text-[12.5px] leading-snug transition-colors"
                      style={{
                        color: active ? 'var(--tfd-blue-600)' : 'var(--tfd-500)',
                        fontWeight: active ? 500 : 400,
                        borderColor: active ? 'var(--tfd-blue-500)' : 'transparent',
                      }}
                    >
                      {section.titulo}
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
