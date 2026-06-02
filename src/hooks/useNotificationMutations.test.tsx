import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// from().update(...).eq(...) resolves to { error }. eq is the terminal awaited node.
const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ update: updateMock }) },
}));

import { useMarkNotificationRead, useMarkAllNotificationsRead } from "./useDomains";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("notification mutations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks one notification read by id", async () => {
    eqMock.mockResolvedValueOnce({ error: null });
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });
    result.current.mutate({ id: "n1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateMock).toHaveBeenCalledWith({ is_read: true });
    expect(eqMock).toHaveBeenCalledWith("id", "n1");
  });

  it("marks all unread read", async () => {
    eqMock.mockResolvedValueOnce({ error: null });
    const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eqMock).toHaveBeenCalledWith("is_read", false);
  });

  it("surfaces an error", async () => {
    eqMock.mockResolvedValueOnce({ error: { message: "nope" } });
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });
    result.current.mutate({ id: "n1" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("nope");
  });
});
