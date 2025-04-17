import { useState, useEffect, useCallback } from 'react';

export default function useNodeTable(endpointBase) {
  const [rows, setRows]           = useState([]);
  const [rowCount, setRowCount]   = useState(0);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 15 });
  const [sortModel, setSortModel] = useState([{ field: 'pk', sort: 'desc' }]);
  const [filterModel, setFilter]  = useState({ items: [] });
  /* hide description at first render – users can toggle in column menu */
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({
    description: false,
    exit_status: false,
    exit_message: false,
    paused: false,
  });

  const fetchData = useCallback(() => {
    const { page, pageSize } = pagination;
    const skip  = page * pageSize;
    const sortField  = sortModel[0]?.field ?? 'pk';
    const sortOrder  = sortModel[0]?.sort  ?? 'desc';
    const url =
      `${endpointBase}-data?skip=${skip}&limit=${pageSize}` +
      `&sortField=${sortField}&sortOrder=${sortOrder}` +
      `&filterModel=${encodeURIComponent(JSON.stringify(filterModel))}`;

    fetch(url).then(r => r.json())
              .then(({ data, total }) => { setRows(data); setRowCount(total); });
  }, [endpointBase, pagination, sortModel, filterModel]);

  /* fetch on mount & whenever deps change */
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);
  /* reset to page 0 when a filter changes */
  useEffect(() => { setPagination(p => ({ ...p, page: 0 })); }, [filterModel]);

  return {
    rows, rowCount,
    pagination, setPagination,
    columnVisibilityModel, setColumnVisibilityModel,
    sortModel, setSortModel,
    filterModel, setFilter,
    refetch: fetchData,
  };
}
