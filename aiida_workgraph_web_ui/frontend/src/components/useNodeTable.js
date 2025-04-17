import { useState, useEffect, useCallback } from 'react';

export default function useNodeTable(endpointBase) {
  const [rows, setRows]           = useState([]);
  const [rowCount, setRowCount]   = useState(0);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 15 });
  const [sortModel, setSortModel] = useState([{ field: 'pk', sort: 'desc' }]);
  const [filterModel, setFilter]  = useState({ items: [] });

  const fetchData = useCallback(() => {
    const { page, pageSize } = pagination;
    const skip  = page * pageSize;
    const url =
      `${endpointBase}-data?skip=${skip}&limit=${pageSize}` +
      `&sortField=${sortModel[0].field}&sortOrder=${sortModel[0].sort}` +
      `&filterModel=${encodeURIComponent(JSON.stringify(filterModel))}`;

    fetch(url).then(r => r.json())
              .then(({ data, total }) => { setRows(data); setRowCount(total); });
  }, [endpointBase, pagination, sortModel, filterModel]);

  /* fetch on mount & whenever deps change */
  useEffect(() => { fetchData(); }, [fetchData]);
  /* reset to page 0 when a filter changes */
  useEffect(() => { setPagination(p => ({ ...p, page: 0 })); }, [filterModel]);

  return {
    rows, rowCount,
    pagination, setPagination,
    sortModel, setSortModel,
    filterModel, setFilter,
    refetch: fetchData,
  };
}
