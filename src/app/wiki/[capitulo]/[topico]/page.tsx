import { notFound } from 'next/navigation';
import { getChapter, getTopic, WIKI_CHAPTERS } from '../../data/wikiTopics';
import TopicView from './TopicView';

export function generateStaticParams() {
  return WIKI_CHAPTERS.flatMap((chapter) =>
    chapter.topicos.map((topico) => ({ capitulo: chapter.id, topico })),
  );
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ capitulo: string; topico: string }>;
}) {
  const { capitulo, topico } = await params;
  const chapter = getChapter(capitulo);
  if (!chapter || !chapter.topicos.includes(topico) || !getTopic(topico)) notFound();
  return <TopicView chapterId={capitulo} topicId={topico} />;
}
