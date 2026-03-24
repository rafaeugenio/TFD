'use client';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div
        className="mb-4"
        style={{ color: 'var(--tfd-text-muted)' }}
      >
        <div className="[&>svg]:h-12 [&>svg]:w-12">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h2
        className="text-lg font-medium"
        style={{ color: 'var(--tfd-text-primary)' }}
      >
        {title}
      </h2>

      {/* Description */}
      {description && (
        <p
          className="mt-1.5 max-w-sm text-sm"
          style={{ color: 'var(--tfd-text-muted)' }}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
