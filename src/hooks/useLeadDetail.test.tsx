import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mocks for: select().eq().single() (useLead), select().eq().order() (activities/debts),
// and insert().select().single() (useAddLeadActivity).
const singleMock = vi.fn();
const orderMock = vi.fn();
const eqAfterSelect = vi.fn(() => ({ single: singleMock, order: orderMock }));
const selectMock = vi.fn(() => ({ eq: eqAfterSelect }));
const insertSingleMock = vi.fn();
const insertMock = vi.fn(() => ({ select: () => ({ single: insertSingleMock }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: selectMock, insert: insertMock }) },
}));

import { useLead, useLeadActivities, useAddLeadActivity } from "./useLeadDetail";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLeadDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useLead fetches one lead by id", async () => {
    singleMock.mockResolvedValueOnce({ data: { id: "l1", first_name: "Dana" }, error: null });
    const { result } = renderHook(() => useLead("l1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eqAfterSelect).toHaveBeenCalledWith("id", "l1");
    expect(result.current.data?.first_name).toBe("Dana");
  });

  it("useLead stays idle without an id", () => {
    const { result } = renderHook(() => useLead(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("useLeadActivities lists by lead, newest first", async () => {
    orderMock.mockResolvedValueOnce({ data: [{ id: "a1" }], error: null });
    const { result } = renderHook(() => useLeadActivities("l1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eqAfterSelect).toHaveBeenCalledWith("lead_id", "l1");
    expect(result.current.data).toHaveLength(1);
  });

  it("useAddLeadActivity inserts and returns the row", async () => {
    insertSingleMock.mockResolvedValueOnce({
      data: { id: "a2", lead_id: "l1", activity_type: "call" },
      error: null,
    });
    const { result } = renderHook(() => useAddLeadActivity(), { wrapper });
    result.current.mutate({ lead_id: "l1", staff_id: "s1", activity_type: "call", notes: "hi" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: "l1", activity_type: "call" }),
    );
  });
});
