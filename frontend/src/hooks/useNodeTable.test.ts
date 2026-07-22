import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import useNodeTable from "./useNodeTable";

interface MockRow {
  pk: number;
  label: string;
  [key: string]: unknown;
}

describe("useNodeTable", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("fetches rows on mount with default paging and sorting", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ pk: 5, label: "row" }], total: 1 }),
    } as Response);

    const { result } = renderHook(() => useNodeTable<MockRow>("/api/process"));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.current.rows).toHaveLength(1);
      expect(result.current.rowCount).toBe(1);
    });

    const requestUrl = String(fetchSpy.mock.calls[0][0]);
    expect(requestUrl).toContain("/api/process-data?skip=0&limit=15");
    expect(requestUrl).toContain("sortField=pk");
    expect(requestUrl).toContain("sortOrder=desc");
  });

  test("resets page to 0 when filter changes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    } as Response);

    const { result } = renderHook(() => useNodeTable<MockRow>("/api/process"));

    await waitFor(() => {
      expect(result.current.pagination.page).toBe(0);
    });

    act(() => {
      result.current.setPagination({ page: 3, pageSize: 15 });
    });

    await waitFor(() => {
      expect(result.current.pagination.page).toBe(3);
    });

    act(() => {
      result.current.setFilter({
        items: [{ field: "label", operator: "contains", value: "abc" }],
      });
    });

    await waitFor(() => {
      expect(result.current.pagination.page).toBe(0);
    });
  });

  test("polls periodically and supports manual refetch", async () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    } as Response);

    const { result } = renderHook(() => useNodeTable<MockRow>("/api/process"));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3000);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
