'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter } from 'lucide-react';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

export type SortDirection = 'asc' | 'desc' | null;

export interface FilterOption {
  value: string;
  label: string;
}

interface SortableHeaderProps {
  label: string;
  /** Current sort direction for this column. null = not sorted. */
  sortDirection?: SortDirection;
  /** Called when the user clicks the sort toggle. */
  onSort?: () => void;
  /**
   * Distinct values available for the filter dropdown.
   * Accepts string[] (value = label) or FilterOption[] (value/label pairs).
   */
  filterOptions?: (string | FilterOption)[];
  /** Currently selected filter values. */
  activeFilters?: string[];
  /** Called when the user changes the filter checkboxes. */
  onFilterChange?: (values: string[]) => void;
  /** Extra className for the <th>. */
  className?: string;
}

/* -------------------------------------------------- */
/*  Max distinct values before hiding the filter       */
/* -------------------------------------------------- */

const MAX_FILTER_OPTIONS = 12;

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function normalizeOption(opt: string | FilterOption): FilterOption {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function SortableHeader({
  label,
  sortDirection = null,
  onSort,
  filterOptions,
  activeFilters = [],
  onFilterChange,
  className = '',
}: SortableHeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const normalized = filterOptions?.map(normalizeOption);

  const showFilter =
    onFilterChange &&
    normalized &&
    normalized.length > 0 &&
    normalized.length <= MAX_FILTER_OPTIONS;

  const hasActiveFilter = activeFilters.length > 0;

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!filterOpen) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [filterOpen]);

  /* Toggle a single value */
  const toggleValue = (value: string) => {
    if (!onFilterChange) return;
    if (activeFilters.includes(value)) {
      onFilterChange(activeFilters.filter((v) => v !== value));
    } else {
      onFilterChange([...activeFilters, value]);
    }
  };

  /* Sort icon */
  const SortIcon =
    sortDirection === 'asc'
      ? ArrowUp
      : sortDirection === 'desc'
      ? ArrowDown
      : ArrowUpDown;

  return (
    <th className={className}>
      <div className="flex items-center gap-1">
        {/* Sort button */}
        {onSort ? (
          <button
            type="button"
            onClick={onSort}
            className="inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
          >
            <span>{label}</span>
            <SortIcon
              size={13}
              style={{
                opacity: sortDirection ? 1 : 0.35,
                color: sortDirection ? 'var(--tfd-primary-500)' : 'inherit',
              }}
            />
          </button>
        ) : (
          <span>{label}</span>
        )}

        {/* Filter button + dropdown */}
        {showFilter && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className="inline-flex items-center justify-center"
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: hasActiveFilter ? 'var(--tfd-primary-500)' : 'inherit',
                opacity: hasActiveFilter ? 1 : 0.4,
              }}
              aria-label={`Filtrar por ${label}`}
            >
              <Filter size={12} />
            </button>

            {filterOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-50 rounded-md py-1 shadow-lg"
                style={{
                  backgroundColor: 'var(--tfd-surface-card)',
                  border: '1px solid var(--tfd-surface-border)',
                  minWidth: '180px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {/* Clear */}
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange!([]);
                      setFilterOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:opacity-70"
                    style={{ color: 'var(--tfd-primary-500)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Limpar filtro
                  </button>
                )}

                {normalized!.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:opacity-80"
                    style={{ color: 'var(--tfd-text-primary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={activeFilters.includes(opt.value)}
                      onChange={() => toggleValue(opt.value)}
                      style={{ accentColor: 'var(--tfd-primary-500)' }}
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}
