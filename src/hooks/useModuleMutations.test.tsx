import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const insertMock = vi.fn((..._args: unknown[]) => Promise.resolve({ error: null }));
const eqMock = vi.fn(() => Promise.resolve({ error: null }));
const updateMock = vi.fn(() => ({ eq: eqMock }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: insertMock, update: updateMock }) },
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ staff: { id: "s1", company_id: "co1" } }),
}));

import {
  useAddCreditor,
  useAddBillingEntry,
  useAddCommunication,
  useAddSignatureRequest,
  useReviewEligibility,
} from "./useModuleMutations";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useModuleMutations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useAddCreditor inserts active creditor", async () => {
    const { result } = renderHook(() => useAddCreditor(), { wrapper });
    result.current.mutate({ name: "Acme", creditor_type: "debt_buyer" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme", is_active: true }),
    );
  });

  it("useAddBillingEntry stamps company + staff", async () => {
    const { result } = renderHook(() => useAddBillingEntry(), { wrapper });
    result.current.mutate({
      entry_type: "time",
      description: "x",
      total_amount: 100,
      is_billable: true,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: "co1", staff_id: "s1" }),
    );
  });

  it("useAddCommunication links the client + staff", async () => {
    const { result } = renderHook(() => useAddCommunication("c1"), { wrapper });
    result.current.mutate({ communication_type: "call", direction: "outbound" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "c1", staff_id: "s1" }),
    );
  });

  it("useAddSignatureRequest sets client entity + a token", async () => {
    const { result } = renderHook(() => useAddSignatureRequest("c1"), { wrapper });
    result.current.mutate({ title: "Agreement" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const arg = insertMock.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(arg.entity_type).toBe("client");
    expect(arg.entity_id).toBe("c1");
    expect(typeof arg.short_token).toBe("string");
  });

  it("useReviewEligibility updates status by id", async () => {
    const { result } = renderHook(() => useReviewEligibility(), { wrapper });
    result.current.mutate({ id: "e1", status: "approved" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "approved" }));
    expect(eqMock).toHaveBeenCalledWith("id", "e1");
  });
});
