'use client';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  user?: string;
}

interface TimelineTFDProps {
  events: TimelineEvent[];
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

const dotColorMap: Record<string, string> = {
  success: 'var(--tfd-status-success)',
  warning: 'var(--tfd-status-warning)',
  danger: 'var(--tfd-status-danger)',
  info: 'var(--tfd-status-info)',
  neutral: 'var(--tfd-text-muted)',
};

const ringColorMap: Record<string, string> = {
  success: 'var(--tfd-status-success-bg)',
  warning: 'var(--tfd-status-warning-bg)',
  danger: 'var(--tfd-status-danger-bg)',
  info: 'var(--tfd-status-info-bg)',
  neutral: 'var(--tfd-surface-hover)',
};

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function TimelineTFD({ events }: TimelineTFDProps) {
  if (events.length === 0) return null;

  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div
        className="absolute left-[11px] top-2 bottom-2 w-px"
        style={{ backgroundColor: 'var(--tfd-surface-border)' }}
        aria-hidden="true"
      />

      <ul className="flex flex-col gap-6">
        {events.map((event, index) => {
          const statusKey = event.status ?? 'neutral';
          const dotColor = dotColorMap[statusKey];
          const ringColor = ringColorMap[statusKey];
          const isFirst = index === 0;

          return (
            <li key={event.id} className="relative flex gap-4">
              {/* Dot */}
              <div
                className="absolute -left-8 top-0.5 flex items-center justify-center shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: ringColor,
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                {/* Date */}
                <time
                  className="block text-xs mb-0.5"
                  style={{ color: 'var(--tfd-text-muted)' }}
                >
                  {event.date}
                </time>

                {/* Title */}
                <p
                  className="text-sm leading-snug"
                  style={{
                    color: 'var(--tfd-text-primary)',
                    fontWeight: isFirst ? 600 : 500,
                  }}
                >
                  {event.title}
                </p>

                {/* Description */}
                {event.description && (
                  <p
                    className="mt-0.5 text-sm"
                    style={{ color: 'var(--tfd-text-secondary)' }}
                  >
                    {event.description}
                  </p>
                )}

                {/* User */}
                {event.user && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: 'var(--tfd-text-muted)' }}
                  >
                    por {event.user}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
