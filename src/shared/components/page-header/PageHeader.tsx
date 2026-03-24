'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <li key={index} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight
                      size={14}
                      className="shrink-0"
                      style={{ color: 'var(--tfd-text-muted)' }}
                      aria-hidden="true"
                    />
                  )}

                  {isLast || !crumb.href ? (
                    <span
                      className="font-medium"
                      style={{
                        color: isLast
                          ? 'var(--tfd-text-primary)'
                          : 'var(--tfd-text-muted)',
                      }}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:underline"
                      style={{ color: 'var(--tfd-text-secondary)' }}
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold leading-tight"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--tfd-text-secondary)' }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
