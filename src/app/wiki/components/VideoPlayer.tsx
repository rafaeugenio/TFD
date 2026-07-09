'use client';

import { PlayCircle } from 'lucide-react';
import type { WikiVideo } from '../data/wikiTopics';

interface VideoPlayerProps {
  video: WikiVideo;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  return (
    <figure
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: 'var(--tfd-surface-border)', background: 'var(--tfd-surface-card)' }}
    >
      <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-600)' }}
          aria-hidden="true"
        >
          <PlayCircle size={18} />
        </span>
        <figcaption>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--tfd-900)' }}>
            {video.titulo}
          </p>
          <p className="text-[12px]" style={{ color: 'var(--tfd-500)' }}>
            {video.descricao}
          </p>
        </figcaption>
      </div>
      <video
        controls
        preload="metadata"
        playsInline
        className="block w-full"
        style={{ background: 'var(--tfd-950)', aspectRatio: '16 / 9' }}
        aria-label={`Vídeo demonstrativo: ${video.titulo}`}
      >
        <source src={video.src} type="video/mp4" />
        <p className="p-4 text-[13px]">
          Seu navegador não suporta a reprodução deste vídeo.{' '}
          <a href={video.src} download className="underline">
            Baixe o arquivo
          </a>{' '}
          para assistir.
        </p>
      </video>
    </figure>
  );
}
