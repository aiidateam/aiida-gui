// WorkGraphTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  DataGrid,
  gridPageCountSelector,
  gridPageSelector,
  useGridApiContext,
  useGridSelector,
  GridToolbar,
} from '@mui/x-data-grid';
import { Pagination, IconButton, Tooltip } from '@mui/material';
import { Delete, PlayArrow, Pause } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import WorkGraphConfirmModal from './WorkGraphModals';
import 'react-toastify/dist/ReactToastify.css';

/* ---------- tiny wrapper so the DataGrid uses MUI Pagination ---------- */
function MuiPagination() {
  const apiRef    = useGridApiContext();
  const page      = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);

  return (
    <Pagination
      color="primary"
      page={page + 1}
      count={pageCount}
      onChange={(_, value) => apiRef.current.setPage(value - 1)}
      showFirstButton
      showLastButton
    />
  );
}

/* ────────────────────────────── MAIN TABLE ────────────────────────────── */
export default function WorkGraphTable() {
  /* ---------- grid state ---------- */
  const [rows,               setRows]               = useState([]);
  const [rowCount,           setRowCount]           = useState(0);

  const [paginationModel,    setPaginationModel]    = useState({ page: 0, pageSize: 15 });
  const [sortModel,          setSortModel]          = useState([{ field: 'pk', sort: 'desc' }]);
  const [filterModel,        setFilterModel]        = useState({ items: [] });

  /* hide description at first render – users can toggle in column menu */
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({
    description: false,
    exit_status: false,
    exit_message: false,
  });

  /* delete‑modal state */
  const [toDeleteItem,           setToDeleteItem]           = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [bodyTextConfirmDeleteModal, setBodyTextConfirmDeleteModal] = useState(<p />);

  /* ╔══════════════════════════ data‑fetch helper ═══════════════════════╗ */
  const fetchGridData = useCallback(() => {
    const { page, pageSize } = paginationModel;
    const skip       = page * pageSize;
    const limit      = pageSize;
    const sortField  = sortModel[0]?.field ?? 'pk';
    const sortOrder  = sortModel[0]?.sort  ?? 'desc';

    const url =
      `http://localhost:8000/api/workgraph-data?` +
      `skip=${skip}&limit=${limit}` +
      `&sortField=${sortField}&sortOrder=${sortOrder}` +
      `&filterModel=${encodeURIComponent(JSON.stringify(filterModel))}`;

    return fetch(url)
      .then(r => r.json())
      .then(({ data, total }) => {
        setRows(data);
        setRowCount(total);
      });
  }, [paginationModel, sortModel, filterModel]);

  /* fetch on mount & when paging / sorting / filtering changes */
  useEffect(() => { fetchGridData(); }, [fetchGridData]);

  /* when a filter is added, reset to page 0 (same UX as DataNode) */
  useEffect(() => {
    setPaginationModel(m => ({ ...m, page: 0 }));
  }, [filterModel]);

  /* ╔═══════════════════════ delete flow (with dry‑run) ═════════════════╗ */
  useEffect(() => {
    if (toDeleteItem !== null) {
      fetch(`http://localhost:8000/api/workgraph/delete/${toDeleteItem.pk}?dry_run=True`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
          if (data.deleted_nodes.length > 0) {
            const formatted_pks = data.deleted_nodes.map(x => ` ${x}`);
            /* remove root pk from list before display */
            data.deleted_nodes.splice(data.deleted_nodes.indexOf(toDeleteItem.pk), 1);
            setBodyTextConfirmDeleteModal(
              <p>
                Are you sure you want to delete node PK&lt;{toDeleteItem.pk}&gt; and {data.deleted_nodes.length} dependent nodes?
                <b> A deletion is irreversible.</b>
                <br /><br />
                Dependent nodes that will be deleted:
                <br /> {formatted_pks.toString()}
              </p>
            );
            setShowConfirmDeleteModal(true);
          } else {
            toast.error('Error deleting item.');
          }
        })
        .catch(err => console.error('Error deleting item: ', err));
    }
  }, [toDeleteItem]);

  const handleDeleteNode = (item) => {
    fetch(`http://localhost:8000/api/workgraph/delete/${item.pk}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.deleted) {
          toast.success(data.message);
          fetchGridData();              // refresh table
        } else {
          toast.error('Error deleting item');
        }
      })
      .catch(err => console.error('Error deleting item: ', err));
  };

  /* ╔════════════════════ editable label / description ═════════════════╗ */
  const processRowUpdate = useCallback(
    async (newRow, oldRow) => {
      const diff = {};
      if (newRow.label       !== oldRow.label      ) diff.label       = newRow.label;
      if (newRow.description !== oldRow.description) diff.description = newRow.description;
      if (!Object.keys(diff).length) return oldRow;

      try {
        const r = await fetch(`http://localhost:8000/api/workgraph-data/${newRow.pk}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diff),
        });
        if (!r.ok) throw new Error((await r.json()).detail);
        toast.success(`Saved PK ${newRow.pk}`);
        return newRow;
      } catch (err) {
        toast.error(`Save failed – ${err.message}`);
        return oldRow;
      }
    },
    [],
  );

  /* ╔════════════════════════════ columns ══════════════════════════════╗ */
  const columns = [
    {
      field: 'pk',
      headerName: 'PK',
      width: 90,
      renderCell: params => <Link to={`/workgraph/${params.value}`}>{params.value}</Link>,
    },
    { field: 'ctime',         headerName: 'Created',  width: 150 },
    { field: 'process_label', headerName: 'Process label',  width: 260, sortable: false },
    { field: 'state',         headerName: 'State',    width: 140, sortable: false },
    { field: 'status',         headerName: 'Status',    width: 140, sortable: false },
    /* ⚡ new editable columns (optional – only if you store these on the node) */
    { field: 'label',         headerName: 'Label',        width: 220, editable: true },
    { field: 'description',   headerName: 'Description',  width: 240, editable: true },
    { field: 'exit_status',   headerName: 'Exit status',  editable: false, sortable: false },
    { field: 'exit_message',   headerName: 'Exit message',  width: 240, editable: false, sortable: false },
    /* ─────────── actions (play / pause / delete) ─────────── */
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: params => {
        const item = params.row;
        /* finished / failed / excepted ⇒ only delete */
        if (/(Finished|Failed|Excepted)/.test(item.state)) {
          return (
            <Tooltip title="Delete">
              <IconButton onClick={() => setToDeleteItem(structuredClone(item))} color="error">
                <Delete />
              </IconButton>
            </Tooltip>
          );
        }
        /* running / waiting ⇒ pause + delete */
        if (/(Running|Waiting)/.test(item.state)) {
          return (
            <>
              <Tooltip title="Pause">
                <IconButton onClick={() => fetch(`http://localhost:8000/api/workgraph/pause/${item.pk}`, { method: 'POST' })
                  .then(() => { toast.success('Paused'); fetchGridData(); })}
                >
                  <Pause />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton onClick={() => setToDeleteItem(structuredClone(item))} color="error">
                  <Delete />
                </IconButton>
              </Tooltip>
            </>
          );
        }
        /* paused ⇒ play + delete */
        return (
          <>
            <Tooltip title="Resume">
              <IconButton onClick={() => fetch(`http://localhost:8000/api/workgraph/play/${item.pk}`, { method: 'POST' })
                .then(() => { toast.success('Resumed'); fetchGridData(); })}
                color="success"
              >
                <PlayArrow />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton onClick={() => setToDeleteItem(structuredClone(item))} color="error">
                <Delete />
              </IconButton>
            </Tooltip>
          </>
        );
      },
    },
  ];

  /* ╔════════════════════════════ JSX ══════════════════════════════════╗ */
  return (
    <div style={{ padding: '1rem' }}>
      <h2>WorkGraph</h2>

      <DataGrid
        sortingOrder={['desc','asc']}
        rows={rows}
        columns={columns}
        getRowId={row => row.pk}

        /* server‑side goodies */
        rowCount={rowCount}
        paginationMode="server"
        sortingMode="server"
        filterMode="server"

        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}

        pageSizeOptions={[15, 30, 50]}

        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}

        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={err => toast.error(err.message)}
        editMode="cell"

        /* slots */
        slots={{ pagination: MuiPagination, toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,               // free‑text search
            quickFilterProps: { debounceMs: 500 }
          },
        }}

        autoHeight
      />

      <ToastContainer autoClose={3000} />

      <WorkGraphConfirmModal
        show={showConfirmDeleteModal}
        setShow={setShowConfirmDeleteModal}
        confirmAction={() => handleDeleteNode(toDeleteItem)}
        cancelAction={() => {}}
        bodyText={bodyTextConfirmDeleteModal}
      />
    </div>
  );
}
