import { notFound } from 'next/navigation';
import { getChapter, WIKI_CHAPTERS } from '../data/wikiTopics';
import ChapterView from './ChapterView';

export function generateStaticParams() {
  return WIKI_CHAPTERS.map((chapter) => ({ capitulo: chapter.id }));
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ capitulo: string }>;
}) {
  const { capitulo } = await params;
  if (!getChapter(capitulo)) notFound();
  return <ChapterView chapterId={capitulo} />;
}
