import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// select().eq().eq().order() for lists; insert(...) terminal; update().eq(); delete().eq()
const orderMock = vi.fn();
const eq2 = vi.fn(() => ({ order: orderMock }));
const eq1 = vi.fn(() => ({ eq: eq2, order: orderMock }));
const selectMock = vi.fn(() => ({ eq: eq1 }));
// insert(...) is awaited directly by some hooks, and chained .select("id").single() by
// useAddNote. Return a Promise that also carries a select() chain.
const insertSingle = vi.fn(() => Promise.resolve({ data: { id: "n1" }, error: null }));
const insertSelect = vi.fn(() => ({ single: insertSingle }));
const insertMock = vi.fn(() =>
  Object.assign(Promise.resolve({ error: null }), { select: insertSelect }),
);
const updEq = vi.fn(() => Promise.resolve({ error: null }));
const updateMock = vi.fn(() => ({ eq: updEq }));
const delEq = vi.fn(() => Promise.resolve({ error: null }));
const deleteMock = vi.fn(() => ({ eq: delEq }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: selectMock,
      insert: insertMock,
      update: updateMock,
      delete: deleteMock,
    }),
  },
}));

import {
  useEntityNotes,
  useAddNote,
  useAddTask,
  useToggleTask,
  useAddBudgetLine,
} from "./useLeadTabs";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLeadTabs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useEntityNotes filters by entity type + id", async () => {
    orderMock.mockResolvedValueOnce({ data: [{ id: "n1" }], error: null });
    const { result } = renderHook(() => useEntityNotes("client", "c1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eq1).toHaveBeenCalledWith("entity_type", "client");
    expect(eq2).toHaveBeenCalledWith("entity_id", "c1");
  });

  it("useAddNote requires a staff id", async () => {
    const { result } = renderHook(() => useAddNote("lead", "l1", undefined), { wrapper });
    result.current.mutate({ content: "hi" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("useAddNote inserts with created_by + entity", async () => {
    const { result } = renderHook(() => useAddNote("lead", "l1", "s1"), { wrapper });
    result.current.mutate({ content: "hello" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ entity_type: "lead", entity_id: "l1", created_by: "s1" }),
    );
  });

  it("useAddTask stamps company + entity", async () => {
    const { result } = renderHook(() => useAddTask("lead", "l1", "co1", "s1"), { wrapper });
    result.current.mutate({ title: "Call", priority: "high" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: "co1", entity_id: "l1", title: "Call" }),
    );
  });

  it("useToggleTask sets completed status", async () => {
    const { result } = renderHook(() => useToggleTask("lead", "l1"), { wrapper });
    result.current.mutate({ id: "t1", completed: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
  });

  it("useAddBudgetLine inserts a categorized line", async () => {
    const { result } = renderHook(() => useAddBudgetLine("l1"), { wrapper });
    result.current.mutate({ category: "income", label: "Salary", amount: 5000 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: "l1", category: "income", amount: 5000 }),
    );
  });
});
