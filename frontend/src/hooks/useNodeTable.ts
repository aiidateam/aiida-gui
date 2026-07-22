import { useState, useRef, useEffect, useCallback } from "react";
import type {
  GridFilterModel,
  GridPaginationModel,
  GridSortModel,
  GridColumnVisibilityModel,
} from "@mui/x-data-grid";

interface NodeTableResponse<RowType> {
  data: RowType[];
  total: number;
}

export interface NodeTableRow {
  pk: number;
  [key: string]: unknown;
}

export interface UseNodeTableResult<RowType extends NodeTableRow> {
  rows: RowType[];
  rowCount: number;
  pagination: GridPaginationModel;
  setPagination: React.Dispatch<React.SetStateAction<GridPaginationModel>>;
  columnVisibilityModel: GridColumnVisibilityModel;
  setColumnVisibilityModel: React.Dispatch<
    React.SetStateAction<GridColumnVisibilityModel>
  >;
  sortModel: GridSortModel;
  setSortModel: React.Dispatch<React.SetStateAction<GridSortModel>>;
  filterModel: GridFilterModel;
  setFilter: React.Dispatch<React.SetStateAction<GridFilterModel>>;
  refetch: () => void;
}

export default function useNodeTable<RowType extends NodeTableRow>(
  endpointBase: string,
): UseNodeTableResult<RowType> {
  const [rows, setRows] = useState<RowType[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "pk", sort: "desc" },
  ]);
  const [filterModel, setFilter] = useState<GridFilterModel>({ items: [] });
  const isFetchingRef = useRef(false);
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      description: false,
      exit_status: false,
      exit_message: false,
      paused: false,
    });

  const fetchData = useCallback(() => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    const { page, pageSize } = pagination;
    const skip = page * pageSize;
    const sortField = sortModel[0]?.field ?? "pk";
    const sortOrder = sortModel[0]?.sort ?? "desc";
    const url =
      `${endpointBase}-data?skip=${skip}&limit=${pageSize}` +
      `&sortField=${sortField}&sortOrder=${sortOrder}` +
      `&filterModel=${encodeURIComponent(JSON.stringify(filterModel))}`;

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with HTTP ${response.status}`);
        }
        return response.json() as Promise<NodeTableResponse<RowType>>;
      })
      .then(({ data, total }) => {
        setRows(data ?? []);
        setRowCount(total ?? 0);
      })
      .catch((error) => {
        console.error("Fetch error", error);
      })
      .finally(() => {
        isFetchingRef.current = false;
      });
  }, [endpointBase, pagination, sortModel, filterModel]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    setPagination((value) => ({ ...value, page: 0 }));
  }, [filterModel]);

  return {
    rows,
    rowCount,
    pagination,
    setPagination,
    columnVisibilityModel,
    setColumnVisibilityModel,
    sortModel,
    setSortModel,
    filterModel,
    setFilter,
    refetch: fetchData,
  };
}
