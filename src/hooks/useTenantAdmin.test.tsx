import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Chainable Supabase mock. Reads: from(...).select(...).order(...) / .eq(...). Mutations:
// from(...).upsert(...). Edge fn: functions.invoke(...). Mocks are created via vi.hoisted so the
// hoisted vi.mock factory can reference them safely.
const { orderMock, eqMock, upsertMock, invokeMock } = vi.hoisted(() => ({
  orderMock: vi.fn(),
  eqMock: vi.fn(),
  upsertMock: vi.fn(),
  invokeMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: orderMock, eq: eqMock }),
      upsert: upsertMock,
    }),
    functions: { invoke: invokeMock },
  },
}));

import {
  useTenantUsageMetrics,
  useFeatureFlagCatalog,
  useTenantFeatureFlags,
  useProvisionTenant,
} from "./useTenantAdmin";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useTenantAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useTenantUsageMetrics returns rows on success", async () => {
    orderMock.mockResolvedValueOnce({
      data: [{ company_id: "c1", company_name: "Acme", staff_total: 3, is_active: true }],
      error: null,
    });
    const { result } = renderHook(() => useTenantUsageMetrics(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].company_name).toBe("Acme");
  });

  it("useFeatureFlagCatalog surfaces a query error", async () => {
    orderMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useFeatureFlagCatalog(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("useTenantFeatureFlags fetches a tenant's overrides", async () => {
    eqMock.mockResolvedValueOnce({
      data: [{ company_id: "c1", flag_key: "leads.paralegal_visibility", enabled: false }],
      error: null,
    });
    const { result } = renderHook(() => useTenantFeatureFlags("c1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].enabled).toBe(false);
  });

  it("useProvisionTenant returns the new company id on success", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { success: true, company_id: "new-co", admin_user_id: "u1" },
      error: null,
    });
    const { result } = renderHook(() => useProvisionTenant(), { wrapper });
    result.current.mutate({
      name: "Evergreen",
      company_type: "law_firm",
      admin_email: "a@e.test",
      admin_first_name: "Erin",
      admin_last_name: "Admin",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.company_id).toBe("new-co");
  });

  it("useProvisionTenant throws when the function reports failure", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { success: false, error: "Platform admin required" },
      error: null,
    });
    const { result } = renderHook(() => useProvisionTenant(), { wrapper });
    result.current.mutate({
      name: "Sneaky",
      company_type: "law_firm",
      admin_email: "x@e.test",
      admin_first_name: "X",
      admin_last_name: "Y",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Platform admin required");
  });
});
