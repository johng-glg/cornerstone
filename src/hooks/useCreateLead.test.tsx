import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Chainable mock: from(...).insert(...).select(...).single() resolves to { data, error }.
const singleMock = vi.fn();
const insertMock = vi.fn(() => ({ select: () => ({ single: singleMock }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: insertMock }) },
}));

import { useCreateLead, type NewLeadInput } from "./useCoreCrm";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const input: NewLeadInput = {
  first_name: "Dana",
  last_name: "Prospect",
  source: "referral",
  interest_type: "debt_resolution",
};

describe("useCreateLead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stamps company_id and returns the created lead", async () => {
    singleMock.mockResolvedValueOnce({
      data: { id: "l1", lead_number: "LEAD-2026-0001", first_name: "Dana" },
      error: null,
    });
    const { result } = renderHook(() => useCreateLead("co-1"), { wrapper });
    result.current.mutate(input);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ company_id: "co-1" }));
    expect(result.current.data?.lead_number).toBe("LEAD-2026-0001");
  });

  it("fails fast when there is no active company", async () => {
    const { result } = renderHook(() => useCreateLead(undefined), { wrapper });
    result.current.mutate(input);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/no active company/i);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("surfaces a database error", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: "rls denied" } });
    const { result } = renderHook(() => useCreateLead("co-1"), { wrapper });
    result.current.mutate(input);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("rls denied");
  });
});
