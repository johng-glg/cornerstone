import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Chainable Supabase mock: from(...).select(...).order(...) resolves to { data, error }.
const orderMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ order: orderMock }) }),
  },
}));

import { useLitigationMatters, useTemplates, useNotifications } from "./useDomains";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useDomains", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useLitigationMatters returns rows on success", async () => {
    orderMock.mockResolvedValueOnce({
      data: [{ id: "m1", case_number: "CV-1", status: "new", client_service_id: "cs1" }],
      error: null,
    });
    const { result } = renderHook(() => useLitigationMatters(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].case_number).toBe("CV-1");
  });

  it("useTemplates surfaces a query error", async () => {
    orderMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useTemplates(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");
  });

  it("useNotifications returns an empty array when there are no rows", async () => {
    orderMock.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
