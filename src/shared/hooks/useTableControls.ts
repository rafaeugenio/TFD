'use client';

import { useState, useMemo, useCallback } from 'react';
import type { SortDirection } from '@/shared/components/table/SortableHeader';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface UseTableControlsOptions<T> {
  /** Full data array (before any filtering/sorting). */
  data: T[];
  /** Fields to search across when the user types in the search bar. */
  searchFields: (keyof T)[];
  /** The field that holds the row's date (ISO string). Used for date-range filter. */
  dateField?: keyof T;
  /** Initial items per page. Default 20. The user can change it via the page-size selector. */
  pageSize?: number;
}

interface SortState {
  field: string;
  direction: SortDirection;
}

interface UseTableControlsReturn<T> {
  /* State */
  search: string;
  setSearch: (v: string) => void;
  dateStart: string;
  setDateStart: (v: string) => void;
  dateEnd: string;
  setDateEnd: (v: string) => void;
  sort: SortState;
  columnFilters: Record<string, string[]>;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;

  /* Derived */
  filtered: T[];
  paginated: T[];
  totalPages: number;

  /* Helpers */
  toggleSort: (field: string) => void;
  setColumnFilter: (field: string, values: string[]) => void;
  getFilterOptions: (field: string, labelFn?: (row: T) => string) => string[];
  getActiveFilters: (field: string) => string[];
  getSortDirection: (field: string) => SortDirection;
  resetFilters: () => void;
}

/* -------------------------------------------------- */
/*  Hook                                               */
/* -------------------------------------------------- */

export function useTableControls<T extends Record<string, unknown>>(
  options: UseTableControlsOptions<T>,
): UseTableControlsReturn<T> {
  const { data, searchFields, dateField, pageSize: initialPageSize = 20 } = options;

  const [search, setSearchRaw] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [sort, setSort] = useState<SortState>({ field: '', direction: null });
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  /* Wrap setSearch to reset page */
  const setSearch = useCallback((v: string) => {
    setSearchRaw(v);
    setPage(1);
  }, []);

  /* Sort toggler: null → asc → desc → null */
  const toggleSort = useCallback((field: string) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: 'asc' };
      if (prev.direction === 'asc') return { field, direction: 'desc' };
      return { field: '', direction: null };
    });
  }, []);

  /* Column filter setter */
  const setColumnFilter = useCallback((field: string, values: string[]) => {
    setColumnFilters((prev) => ({ ...prev, [field]: values }));
    setPage(1);
  }, []);

  const getActiveFilters = useCallback(
    (field: string) => columnFilters[field] ?? [],
    [columnFilters],
  );

  const getSortDirection = useCallback(
    (field: string): SortDirection => (sort.field === field ? sort.direction : null),
    [sort],
  );

  const resetFilters = useCallback(() => {
    setSearchRaw('');
    setDateStart('');
    setDateEnd('');
    setColumnFilters({});
    setPage(1);
  }, []);

  /* ---- Filtering ---- */
  const filtered = useMemo(() => {
    let rows = [...data];

    /* Text search */
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        searchFields.some((f) => {
          const val = row[f];
          return typeof val === 'string' && val.toLowerCase().includes(q);
        }),
      );
    }

    /* Date range */
    if (dateField && (dateStart || dateEnd)) {
      rows = rows.filter((row) => {
        const raw = row[dateField];
        if (typeof raw !== 'string') return true;
        const d = raw.slice(0, 10); // 'YYYY-MM-DD'
        if (dateStart && d < dateStart) return false;
        if (dateEnd && d > dateEnd) return false;
        return true;
      });
    }

    /* Column filters */
    for (const [field, values] of Object.entries(columnFilters)) {
      if (values.length === 0) continue;
      rows = rows.filter((row) => {
        const v = row[field];
        const str = typeof v === 'string' ? v : String(v ?? '');
        return values.includes(str);
      });
    }

    /* Sorting */
    if (sort.field && sort.direction) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      const field = sort.field;
      rows.sort((a, b) => {
        const av = a[field as keyof T];
        const bv = b[field as keyof T];

        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;

        /* Numeric comparison */
        if (typeof av === 'number' && typeof bv === 'number') {
          return (av - bv) * dir;
        }

        /* String comparison */
        return String(av).localeCompare(String(bv), 'pt-BR') * dir;
      });
    }

    return rows;
  }, [data, search, searchFields, dateField, dateStart, dateEnd, sort, columnFilters]);

  /* ---- Unique filter options for a column ---- */
  const getFilterOptions = useCallback(
    (field: string, labelFn?: (row: T) => string): string[] => {
      const values = new Set<string>();
      for (const row of data) {
        const v = labelFn ? labelFn(row) : row[field as keyof T];
        const str = typeof v === 'string' ? v : String(v ?? '');
        if (str) values.add(str);
      }
      return Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    [data],
  );

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return {
    search,
    setSearch,
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    sort,
    columnFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    filtered,
    paginated,
    totalPages,
    toggleSort,
    setColumnFilter,
    getFilterOptions,
    getActiveFilters,
    getSortDirection,
    resetFilters,
  };
}
