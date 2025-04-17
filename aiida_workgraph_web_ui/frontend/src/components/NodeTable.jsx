// components/NodeTable.jsx  – one component to rule them all
import {
  DataGrid, GridToolbar,
  gridPageCountSelector, gridPageSelector, gridPageSizeSelector,
  useGridApiContext, useGridSelector,
} from '@mui/x-data-grid';
import {
    Pagination,
    Box,
    Select,
    MenuItem,
    Typography,
  } from '@mui/material';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import useNodeTable from '../hooks/useNodeTable';

/* --------- MUI DataGrid ↔︎ MUI Pagination bridge --------- */
function MuiFooter() {
  const apiRef = useGridApiContext();
  const page   = useGridSelector(apiRef, gridPageSelector);
  const count  = useGridSelector(apiRef, gridPageCountSelector);
  const pageSize = useGridSelector(apiRef, gridPageSizeSelector);
  const pageSizes = [15, 30, 100];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 1, gap: 1 }}>
      {/*  Rows‑per‑page label  */}
      <Typography variant="body2">Rows&nbsp;per&nbsp;page:</Typography>

      {/* page‑size selector */}
      <Select
        size="small"
        value={pageSize}
        onChange={e => apiRef.current.setPageSize(Number(e.target.value))}
        sx={{ minWidth: 80 }}
      >
        {pageSizes.map(s => (
          <MenuItem key={s} value={s}>{s}</MenuItem>
        ))}
      </Select>
      {/* page navigator */}
      <Pagination
        page={page + 1} count={count}
        onChange={(_, v) => apiRef.current.setPage(v - 1)}
        color="primary" showFirstButton showLastButton
      />
    </Box>
  );
}

/* ---------------------------------------------------------------------------
   Generic table.
   Everything that varies is passed in through the `config` prop.
   --------------------------------------------------------------------------- */
export default function NodeTable({
  title,
  endpointBase,
  linkPrefix,
  config,            // { columns, buildActions, editableFields, buildDeleteModal? }
}) {
  const {
    rows, rowCount,
    pagination, setPagination,
    columnVisibilityModel, setColumnVisibilityModel,
    sortModel, setSortModel,
    filterModel, setFilter,
    refetch,
  } = useNodeTable(endpointBase);

  /* ------------- row update (label / description / …) ------------- */
  const processRowUpdate = async (newRow, oldRow) => {
    const diff = {};
    for (const f of config.editableFields ?? []) {
      if (newRow[f] !== oldRow[f]) diff[f] = newRow[f];
    }
    if (!Object.keys(diff).length) return oldRow;

    try {
      const r = await fetch(`${endpointBase}-data/${newRow.pk}`, {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(diff),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      toast.success(`Saved PK ${newRow.pk}`);
      return newRow;
    } catch (e) {
      toast.error(`Save failed – ${e.message}`);
      return oldRow;                   // revert visual grid value
    }
  };

  /* ------------- columns = caller’s columns + an “Actions” one ------------- */
  const columns = [
    ...config.columns(linkPrefix),     // let caller inject the basics
    {
      field      : 'actions',
      headerName : 'Actions',
      width      : 160,
      sortable   : false,
      filterable : false,
      renderCell : p => config.buildActions(p.row, { endpointBase, refetch }),
    },
  ];

  return (
    <div style={{ padding: '1rem' }}>
      <h2>{title}</h2>

      <DataGrid
        /* server‑side stuff */
        rows={rows} rowCount={rowCount}
        getRowId={r => r.pk}
        paginationMode="server" sortingMode="server" filterMode="server"

        /* pagination / sort / filter */
        paginationModel={pagination} onPaginationModelChange={setPagination}
        sortModel={sortModel}         onSortModelChange={setSortModel}
        filterModel={filterModel}     onFilterModelChange={setFilter}
        pageSizeOptions={[15, 30, 50]}

        /* columns */
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}

        /* inline editing */
        editMode="cell"
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={e => toast.error(e.message)}

        /* cosmetics */
        sortingOrder={['desc', 'asc']}
        slots={{ pagination: MuiFooter, toolbar: GridToolbar }}
        slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 }}}}
        autoHeight
      />

      <ToastContainer autoClose={3000}/>
      {/* Optional confirm‑modal coming from caller */}
      {config.buildDeleteModal?.()}
    </div>
  );
}
