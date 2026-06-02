import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Chainable mocks for both insert (create client) and update (update lead) paths.
const singleMock = vi.fn();
const eqUpdateMock = vi.fn(() => ({ select: () => ({ single: singleMock }) }));
const updateMock = vi.fn(() => ({ eq: eqUpdateMock }));
const insertMock = vi.fn(() => ({ select: () => ({ single: singleMock }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: insertMock, update: updateMock }) },
}));

import { useUpdateLead, useCreateClient } from "./useCoreCrm";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useUpdateLead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("patches by id and returns the row", async () => {
    singleMock.mockResolvedValueOnce({ data: { id: "l1", status: "qualified" }, error: null });
    const { result } = renderHook(() => useUpdateLead(), { wrapper });
    result.current.mutate({ id: "l1", status: "qualified" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "qualified" }));
    expect(eqUpdateMock).toHaveBeenCalledWith("id", "l1");
  });

  it("surfaces an update error", async () => {
    singleMock.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    const { result } = renderHook(() => useUpdateLead(), { wrapper });
    result.current.mutate({ id: "l1", status: "lost" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("denied");
  });
});

describe("useCreateClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stamps company_id and derives is_active from status", async () => {
    singleMock.mockResolvedValueOnce({ data: { id: "c1", first_name: "Sam" }, error: null });
    const { result } = renderHook(() => useCreateClient("co-1"), { wrapper });
    result.current.mutate({ first_name: "Sam", last_name: "Lee", status: "active" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: "co-1", is_active: true }),
    );
  });

  it("fails fast without an active company", async () => {
    const { result } = renderHook(() => useCreateClient(undefined), { wrapper });
    result.current.mutate({ first_name: "Sam", last_name: "Lee", status: "inactive" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(insertMock).not.toHaveBeenCalled();
  });
});
