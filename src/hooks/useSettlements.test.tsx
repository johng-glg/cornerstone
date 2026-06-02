import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const orderMock = vi.fn();
const inMock = vi.fn(() => ({ order: orderMock }));
const selectMock = vi.fn(() => ({ in: inMock }));
const insertMock = vi.fn(() => Promise.resolve({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: selectMock, insert: insertMock }) },
}));

import { useSettlements, useAddSettlement } from "./useSettlements";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSettlements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stays idle with no liability ids", () => {
    const { result } = renderHook(() => useSettlements([]), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("queries by liability ids", async () => {
    orderMock.mockResolvedValueOnce({ data: [{ id: "x" }], error: null });
    const { result } = renderHook(() => useSettlements(["l1", "l2"]), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inMock).toHaveBeenCalledWith("liability_id", ["l1", "l2"]);
  });

  it("useAddSettlement inserts an offered settlement", async () => {
    const { result } = renderHook(() => useAddSettlement(), { wrapper });
    result.current.mutate({ liability_id: "l1", offer_amount: 5000, offer_percentage: 40 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ liability_id: "l1", offer_amount: 5000, status: "offered" }),
    );
  });
});
