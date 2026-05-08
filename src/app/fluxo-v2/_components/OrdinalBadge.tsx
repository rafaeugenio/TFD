import React from 'react';

interface OrdinalBadgeProps {
  n: number;
}

export default function OrdinalBadge({ n }: OrdinalBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F1F5F9',
        color: '#475569',
        border: '1px solid #E2E8F0',
        borderRadius: 6,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: 1.4,
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
      aria-label={`Item ${n}`}
    >
      #{n}
    </span>
  );
}
