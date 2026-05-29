import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInactivityTimeout } from "./useInactivityTimeout";

describe("useInactivityTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires onTimeout after the idle period elapses", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useInactivityTimeout({ idleMs: 30_000, warningMs: 5_000, enabled: true, onTimeout }),
    );
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("shows the warning during the warning window", () => {
    const { result } = renderHook(() =>
      useInactivityTimeout({ idleMs: 30_000, warningMs: 5_000, enabled: true, onTimeout: vi.fn() }),
    );
    expect(result.current.warning).toBe(false);
    act(() => {
      vi.advanceTimersByTime(26_000); // into the last 5s
    });
    expect(result.current.warning).toBe(true);
  });

  it("reset() clears the warning and restarts the clock", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({ idleMs: 30_000, warningMs: 5_000, enabled: true, onTimeout }),
    );
    act(() => {
      vi.advanceTimersByTime(26_000);
    });
    expect(result.current.warning).toBe(true);
    act(() => {
      result.current.reset();
    });
    expect(result.current.warning).toBe(false);
    act(() => {
      vi.advanceTimersByTime(26_000); // would have timed out without the reset
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("does not arm when disabled", () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useInactivityTimeout({ idleMs: 30_000, warningMs: 5_000, enabled: false, onTimeout }),
    );
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
