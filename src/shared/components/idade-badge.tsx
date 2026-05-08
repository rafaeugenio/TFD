'use client';

import { calcularIdade } from '@/shared/utils/idade';

interface IdadeBadgeProps {
  dataNascimento: string | Date | null | undefined;
  className?: string;
}

export default function IdadeBadge({ dataNascimento, className }: IdadeBadgeProps) {
  if (!dataNascimento) return null;
  const idade = calcularIdade(dataNascimento);
  if (!idade) return null;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 18,
        padding: '0 6px',
        borderRadius: 999,
        backgroundColor: 'var(--tfd-surface-100, #F1F5F9)',
        color: 'var(--tfd-text-secondary, #475569)',
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
      aria-label={`Idade: ${idade} anos`}
      title={`${idade} anos`}
    >
      {idade} anos
    </span>
  );
}
