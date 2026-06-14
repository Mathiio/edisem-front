import { useEffect, useMemo, useState } from 'react';
import { ADMIN_LIST_PAGE_SIZE, type AdminSortOrder } from '@/components/features/admin/adminListConfig';

interface UseAdminListControlsOptions<T> {
  items: T[];
  pageSize?: number;
  searchFn?: (item: T, query: string) => boolean;
  sortFn?: (a: T, b: T, order: AdminSortOrder) => number;
  filterFn?: (item: T) => boolean;
  /** Reset page when these values change (e.g. external Select filters) */
  filterDeps?: unknown[];
}

export function useAdminListControls<T>({
  items,
  pageSize = ADMIN_LIST_PAGE_SIZE,
  searchFn,
  sortFn,
  filterFn,
  filterDeps = [],
}: UseAdminListControlsOptions<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<AdminSortOrder>('asc');
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    let result = items;
    if (filterFn) result = result.filter(filterFn);
    if (searchQuery.trim() && searchFn) {
      result = result.filter((item) => searchFn(item, searchQuery));
    }
    if (sortFn) {
      result = [...result].sort((a, b) => sortFn(a, b, sortOrder));
    }
    return result;
  }, [items, searchQuery, sortOrder, filterFn, searchFn, sortFn]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortOrder, ...filterDeps]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  return {
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    filteredItems,
    paginatedItems,
    totalPages,
    totalCount: filteredItems.length,
    pageSize,
  };
}
