import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const singleMock = vi.fn();
const orderMock = vi.fn();
const inMock = vi.fn(() => ({ order: orderMock }));
const eqChain = vi.fn(() => ({ single: singleMock, order: orderMock, eq: eqChain }));
const selectMock = vi.fn(() => ({ eq: eqChain, in: inMock }));
const updEq = vi.fn(() => Promise.resolve({ error: null }));
const updateMock = vi.fn(() => ({ eq: updEq }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: selectMock, update: updateMock }) },
}));

import {
  useClient,
  useClientServices,
  useClientLiabilities,
  useUpdateClient,
} from "./useClientDetail";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useClientDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useClient fetches one client by id", async () => {
    singleMock.mockResolvedValueOnce({ data: { id: "c1", first_name: "Sam" }, error: null });
    const { result } = renderHook(() => useClient("c1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eqChain).toHaveBeenCalledWith("id", "c1");
    expect(result.current.data?.first_name).toBe("Sam");
  });

  it("useClientServices filters by primary_client_id", async () => {
    orderMock.mockResolvedValueOnce({ data: [{ id: "s1" }], error: null });
    const { result } = renderHook(() => useClientServices("c1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eqChain).toHaveBeenCalledWith("primary_client_id", "c1");
  });

  it("useClientLiabilities stays idle with no service ids", () => {
    const { result } = renderHook(() => useClientLiabilities("c1", []), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("useClientLiabilities queries by service ids", async () => {
    orderMock.mockResolvedValueOnce({ data: [{ id: "l1" }], error: null });
    const { result } = renderHook(() => useClientLiabilities("c1", ["s1", "s2"]), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(inMock).toHaveBeenCalledWith("client_service_id", ["s1", "s2"]);
  });

  it("useUpdateClient patches by id", async () => {
    const { result } = renderHook(() => useUpdateClient(), { wrapper });
    result.current.mutate({ id: "c1", status: "inactive" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "inactive" }));
    expect(updEq).toHaveBeenCalledWith("id", "c1");
  });
});
