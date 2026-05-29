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

import { useClients, useLeads } from "./useCoreCrm";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useCoreCrm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useClients returns rows on success", async () => {
    orderMock.mockResolvedValueOnce({
      data: [
        {
          id: "1",
          first_name: "Ada",
          last_name: "A",
          company_id: "c1",
          is_active: true,
          created_at: "x",
        },
      ],
      error: null,
    });
    const { result } = renderHook(() => useClients(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].first_name).toBe("Ada");
  });

  it("useClients surfaces a query error", async () => {
    orderMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useClients(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");
  });

  it("useLeads returns an empty array when there are no rows", async () => {
    orderMock.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useLeads(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
