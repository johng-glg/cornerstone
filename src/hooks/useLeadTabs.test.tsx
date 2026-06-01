import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// select().eq().eq().order() for lists; insert(...) terminal; update().eq(); delete().eq()
const orderMock = vi.fn();
const eq2 = vi.fn(() => ({ order: orderMock }));
const eq1 = vi.fn(() => ({ eq: eq2, order: orderMock }));
const selectMock = vi.fn(() => ({ eq: eq1 }));
const insertMock = vi.fn(() => Promise.resolve({ error: null }));
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
  useLeadNotes,
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

  it("useLeadNotes filters by lead entity", async () => {
    orderMock.mockResolvedValueOnce({ data: [{ id: "n1" }], error: null });
    const { result } = renderHook(() => useLeadNotes("l1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eq1).toHaveBeenCalledWith("entity_type", "lead");
    expect(eq2).toHaveBeenCalledWith("entity_id", "l1");
  });

  it("useAddNote requires a staff id", async () => {
    const { result } = renderHook(() => useAddNote("l1", undefined), { wrapper });
    result.current.mutate({ content: "hi" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("useAddNote inserts with created_by + entity", async () => {
    const { result } = renderHook(() => useAddNote("l1", "s1"), { wrapper });
    result.current.mutate({ content: "hello" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ entity_type: "lead", entity_id: "l1", created_by: "s1" }),
    );
  });

  it("useAddTask stamps company + lead entity", async () => {
    const { result } = renderHook(() => useAddTask("l1", "co1", "s1"), { wrapper });
    result.current.mutate({ title: "Call", priority: "high" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: "co1", entity_id: "l1", title: "Call" }),
    );
  });

  it("useToggleTask sets completed status", async () => {
    const { result } = renderHook(() => useToggleTask("l1"), { wrapper });
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
