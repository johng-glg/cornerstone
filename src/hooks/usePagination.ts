import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  resetPage: () => void;
  getPaginationInfo: (totalCount: number) => {
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    rangeStart: number;
    rangeEnd: number;
    from: number;
    to: number;
  };
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialPageSize = 25 } = options;
  
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPageState(1); // Reset to first page when page size changes
  }, []);

  const goToNextPage = useCallback(() => {
    setPageState((prev) => prev + 1);
  }, []);

  const goToPreviousPage = useCallback(() => {
    setPageState((prev) => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setPageState(1);
  }, []);

  const goToLastPage = useCallback(() => {
    // This needs totalCount, so it's a no-op here
    // Use getPaginationInfo to get totalPages and call setPage(totalPages)
  }, []);

  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

  const getPaginationInfo = useCallback((totalCount: number) => {
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const rangeEnd = Math.min(page * pageSize, totalCount);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    return {
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      rangeStart,
      rangeEnd,
      from,
      to,
    };
  }, [page, pageSize]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage: () => {}, // Placeholder - use setPage(totalPages) instead
    resetPage,
    getPaginationInfo,
  };
}
