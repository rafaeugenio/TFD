'use client';

import type { WikiVideo } from '../data/wikiTopics';

interface VideoPlayerProps {
  video: WikiVideo;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  return (
    <figure>
      <video
        controls
        preload="metadata"
        playsInline
        className="block w-full overflow-hidden rounded-lg border"
        style={{
          borderColor: 'var(--tfd-surface-border)',
          background: 'var(--tfd-950)',
          aspectRatio: '16 / 9',
        }}
        aria-label={`Vídeo demonstrativo: ${video.titulo}`}
      >
        <source src={video.src} type="video/mp4" />
        <p className="p-4 text-[14px]">
          Seu navegador não suporta a reprodução deste vídeo.{' '}
          <a href={video.src} download className="underline">
            Baixe o arquivo
          </a>{' '}
          para assistir.
        </p>
      </video>
      <figcaption className="mt-2.5 text-[13px] leading-relaxed" style={{ color: 'var(--tfd-500)' }}>
        <span className="font-medium" style={{ color: 'var(--tfd-700)' }}>
          {video.titulo}.
        </span>{' '}
        {video.descricao}
      </figcaption>
    </figure>
  );
}
