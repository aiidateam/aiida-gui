// components/NodeTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  DataGrid, GridToolbar,
  gridPageCountSelector, gridPageSelector,
  useGridApiContext, useGridSelector,
} from '@mui/x-data-grid';
import { Pagination, IconButton, Tooltip } from '@mui/material';
import { Delete, Pause, PlayArrow } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import ConfirmModal from './WorkGraphModals';
import useNodeTable from '../hooks/useNodeTable';
import 'react-toastify/dist/ReactToastify.css';

/* tiny wrapper so DataGrid uses MUI Pagination */
function MuiPagination() {
  const apiRef    = useGridApiContext();
  const page      = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  return <Pagination page={page + 1} count={pageCount}
           onChange={(_, v) => apiRef.current.setPage(v - 1)}
           color="primary" showFirstButton showLastButton />;
}

/**
 *  Generic table – parametrised by endpointBase (`/api/process`, `/api/workgraph`, …)
 *  and by linkPrefix (`/process` → detail view).
 */
export default function NodeTable({ title, endpointBase, linkPrefix }) {
  const {
    rows, rowCount,
    pagination, setPagination,
    columnVisibilityModel, setColumnVisibilityModel,
    sortModel, setSortModel,
    filterModel, setFilter,
    refetch,
  } = useNodeTable(endpointBase);

  /* modal state */
  const [toDelete, setToDelete] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalBody, setModalBody] = useState(<p/>);

  /* ------- dry‑run delete to build modal text ------- */
  useEffect(() => {
    if (!toDelete) return;
    fetch(`${endpointBase}/delete/${toDelete.pk}?dry_run=True`, { method: 'DELETE' })
      .then(r => r.json())
      .then(({ deleted_nodes }) => {
        deleted_nodes.splice(deleted_nodes.indexOf(toDelete.pk), 1);  // remove root
        setModalBody(<p>Delete PK&lt;{toDelete.pk}&gt; and {deleted_nodes.length} dependents?<br/><br/>
                      {deleted_nodes.join(', ')}</p>);
        setShowModal(true);
      })
      .catch(() => toast.error('Error deleting item'));
  }, [toDelete, endpointBase]);

  const doDelete = item =>
    fetch(`${endpointBase}/delete/${item.pk}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(d => { d.deleted ? toast.success(d.message) : toast.error('Error'); })
      .finally(refetch);

  /* editable columns stay identical */
  const columns = [
    { field: 'pk', headerName: 'PK', width: 90,
      renderCell: p => <Link to={`${linkPrefix}/${p.value}`}>{p.value}</Link> },
    { field: 'ctime', headerName: 'Created', width: 150 },
    { field: 'process_label', headerName: 'Process label', width: 260, sortable: false },
    { field: 'process_state',  headerName: 'State',  width: 140, sortable: false },
    { field: 'process_status', headerName: 'Status', width: 140, sortable: false },
    { field: 'label', headerName: 'Label', width: 220, editable: true },
    { field: 'description', headerName: 'Description', width: 240, editable: true },
    { field: 'exit_status',  headerName: 'Exit status', sortable: false },
    { field: 'exit_message', headerName: 'Exit message', width: 240, sortable: false },
    { field: 'paused', headerName: 'Paused', width: 100, sortable: false,
      renderCell: ({ value }) => value ? 'Yes' : 'No',
    },
    {
      field: 'actions', headerName: 'Actions', width: 160, sortable: false, filterable: false,
      renderCell: p => renderActions(p.row),
    },
  ];

  /* pause/play/delete action buttons */
  const renderActions = item => {
    const action = url => fetch(url, { method: 'POST' }).then(refetch);
    if (/(Finished|Failed|Excepted)/.test(item.process_state))
      return  <Tooltip title="Delete"><IconButton color="error"
               onClick={() => setToDelete({ ...item })}><Delete/></IconButton></Tooltip>;

    if (item.paused)
      return <>
        <Tooltip title="Resume"><IconButton color="success"
                onClick={() => action(`${endpointBase}/play/${item.pk}`)}><PlayArrow/></IconButton></Tooltip>
        <Tooltip title="Delete"><IconButton color="error"
                onClick={() => setToDelete({ ...item })}><Delete/></IconButton></Tooltip>
      </>;


    /* play */
    return <>
      <Tooltip title="Pause"><IconButton onClick={() => action(`${endpointBase}/pause/${item.pk}`)}><Pause/></IconButton></Tooltip>
      <Tooltip title="Delete"><IconButton color="error"
                onClick={() => setToDelete({ ...item })}><Delete/></IconButton></Tooltip>
    </>;
  };

  const processRowUpdate = async (newRow, oldRow) => {
    const diff = {};
    if (newRow.label !== oldRow.label) diff.label = newRow.label;
    if (newRow.description !== oldRow.description) diff.description = newRow.description;
    if (!Object.keys(diff).length) return oldRow;
    try {
      const r = await fetch(`${endpointBase}-data/${newRow.pk}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(diff),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      toast.success(`Saved PK ${newRow.pk}`);
      return newRow;
    } catch (e) {
      toast.error(`Save failed – ${e.message}`); return oldRow;
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>{title}</h2>

      <DataGrid
        sortingOrder={['desc','asc']}
        rows={rows} getRowId={r => r.pk} columns={columns}
        rowCount={rowCount} paginationMode="server" sortingMode="server" filterMode="server"
        pageSizeOptions={[15, 30, 50]}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        paginationModel={pagination} onPaginationModelChange={setPagination}
        sortModel={sortModel} onSortModelChange={setSortModel}
        filterModel={filterModel} onFilterModelChange={setFilter}
        editMode="cell" processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={e => toast.error(e.message)}
        slots={{ pagination: MuiPagination, toolbar: GridToolbar }}
        slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
        autoHeight
      />

      <ToastContainer autoClose={3000}/>

      <ConfirmModal
        show={showModal} setShow={setShowModal}
        confirmAction={() => doDelete(toDelete)} cancelAction={() => {}}
        bodyText={modalBody}
      />
    </div>
  );
}
