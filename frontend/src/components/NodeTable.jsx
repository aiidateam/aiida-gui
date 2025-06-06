import React, { useState } from 'react';
import {
  DataGrid, GridToolbar,
  gridPageCountSelector, gridPageSelector, gridPageSizeSelector,
  useGridApiContext, useGridSelector,
} from '@mui/x-data-grid';
import {
  Pagination, Box, Select, MenuItem, Typography,
  Checkbox, FormControlLabel          // NEW
} from '@mui/material';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import useNodeTable from '../hooks/useNodeTable';
import { IconButton, Tooltip } from '@mui/material';
import { ConfirmDeleteModal } from './WorkGraphModals';
import { Delete } from '@mui/icons-material';

/* --------- MUI DataGrid ↔︎ MUI Pagination bridge --------- */
function MuiFooter() {
  const apiRef  = useGridApiContext();
  const page    = useGridSelector(apiRef, gridPageSelector);
  const count   = useGridSelector(apiRef, gridPageCountSelector);
  const pageSize= useGridSelector(apiRef, gridPageSizeSelector);
  const pageSizes = [15, 30, 100];

  return (
    <Box sx={{ display:'flex', alignItems:'center', p:1, gap:1 }}>
      <Typography variant="body2">Rows&nbsp;per&nbsp;page:</Typography>
      <Select
        size="small"
        value={pageSize}
        onChange={e => apiRef.current.setPageSize(Number(e.target.value))}
        sx={{ minWidth:80 }}
      >
        {pageSizes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </Select>
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
  actionBase,
  config, // { columns, buildExtraActions, editableFields, includeDeleteGroupNodesOption? }
}) {
  const {
    rows, rowCount,
    pagination, setPagination,
    columnVisibilityModel, setColumnVisibilityModel,
    sortModel, setSortModel,
    filterModel, setFilter,
    refetch,
  } = useNodeTable(endpointBase);

  /* ─────────────────────────── generic confirm‑modal state ────────────────────────── */
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalTitle,   setModalTitle]   = useState(null);
  const [modalBody,   setModalBody]   = useState(null);
  const [onConfirm,   setOnConfirm]   = useState(() => () => {});
  const [deleteGroupNodes, setDeleteGroupNodes] = useState(false); // only used by group delete

  /** open any confirm‑modal */
  const openConfirmModal = (title, body, confirmFn) => {
    setModalTitle(title);
    setModalBody(body);
    setOnConfirm(() => confirmFn);        // store callback
    setModalOpen(true);
  };

  /* ------------- row update (label / description / …) ------------- */
  const processRowUpdate = async (newRow, oldRow) => {
    const diff = {};
    for (const f of config.editableFields ?? []) {
      if (newRow[f] !== oldRow[f]) diff[f] = newRow[f];
    }
    if (!Object.keys(diff).length) return oldRow;

    try {
      const r = await fetch(`${endpointBase}-data/${newRow.pk}`, {
        method :'PUT',
        headers: { 'Content-Type':'application/json' },
        body   : JSON.stringify(diff),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      toast.success(`Saved PK ${newRow.pk}`);
      return newRow;
    } catch (e) {
      toast.error(`Save failed – ${e.message}`);
      return oldRow;                     // revert visual grid value
    }
  };

  /* ───────────────────────── delete‑modal helper ─────────────────────────── */
  const askDelete = (row, refetchLocal) => {
    fetch(`${endpointBase}/delete/${row.pk}?dry_run=True`, { method:'DELETE' })
      .then(r => r.json())
      .then(({ deleted_nodes }) => {
        const deps = deleted_nodes.filter(pk => pk !== row.pk);

        /* default body */
        let body = (
          <p>
            Delete&nbsp;PK&nbsp;{row.pk}&nbsp;and&nbsp;{deps.length}&nbsp;dependents?&nbsp;
            <b>The deletion is irreversible.</b>
            <br/><br/>{deps.join(', ')}
          </p>
        );

        /* extra checkbox for Group‑nodes (optional flag in config) */
        if (config.includeDeleteGroupNodesOption) {
          body = (
            <>
              {body}
              <FormControlLabel
                sx={{ mt:2 }}
                control={
                  <Checkbox
                    onChange={e => setDeleteGroupNodes(e.target.checked)}
                  />
                }
                label="Also delete all nodes in this group"
              />
            </>
          );
        }

        /* confirm handler */
        const confirmFn = () => {
          const url = `${endpointBase}/delete/${row.pk}` +
                      (config.includeDeleteGroupNodesOption && deleteGroupNodes
                        ? '?delete_nodes=True'
                        : '');

          fetch(url, { method:'DELETE' })
            .then(r => r.json())
            .then(({ deleted, message }) =>
              deleted ? toast.success(message)
                      : toast.error('Delete failed'))
            .finally(() => {
              refetchLocal();
            });
        };

        openConfirmModal('Confirm deletion', body, confirmFn);
      })
      .catch(() => toast.error('Could not fetch delete preview'));
  };

  /* ------------- columns = caller’s columns + an “Actions” one ------------- */
  const columns = [
    ...config.columns(linkPrefix),
    {
      field      : 'actions',
      headerName : 'Actions',
      width      : 160,
      sortable   : false,
      filterable : false,
      renderCell : p => (
        <>
          {/* caller‑supplied extra buttons get full access to confirm‑modal helper */}
          {config.buildExtraActions?.(p.row, { actionBase, refetch, openConfirmModal })}
          {/* conditionally render delete button (default: true) */}
          {(config.includeDeleteButton ?? true) && (
            <Tooltip title="Delete">
              <IconButton color="error" onClick={() => askDelete(p.row, refetch)}>
                <Delete />
              </IconButton>
            </Tooltip>
          )}
        </>
      ),
    },
  ];

  return (
    <div style={{ padding:'1rem' }}>
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
        sortingOrder={['desc','asc']}
        slots={{ pagination: MuiFooter, toolbar: GridToolbar }}
        slotProps={{ toolbar:{ showQuickFilter:true, quickFilterProps:{ debounceMs:500 }}}}
        autoHeight
      />

      <ToastContainer autoClose={3000}/>

      <ConfirmDeleteModal
        open     ={modalOpen}
        title     ={modalTitle}
        body     ={modalBody}
        onClose  ={() => setModalOpen(false)}
        onConfirm={() => {
          onConfirm();          // run stored callback
          setModalOpen(false);
        }}
      />
    </div>
  );
}
