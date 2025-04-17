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
import { Delete } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import WorkGraphConfirmModal from './WorkGraphModals';
import 'react-toastify/dist/ReactToastify.css';

/* ---------- pagination component ---------- */
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

/* ----------------------- main component ----------------------- */
function DataNode() {
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [sortModel, setSortModel]           = useState([{ field: 'pk', sort: 'desc' }]);
  const [filterModel, setFilterModel]       = useState({ items: [] });

  /* column visibility (hide description initially) */
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({
    description: false,          // hidden on first render
  });

  const [toDeleteItem, setToDeleteItem]                     = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [bodyTextConfirmDeleteModal, setBodyTextConfirmDeleteModal] = useState(<p />);

  /* -------------------------------------- data‐fetch helper -------------------------------------- */
  const fetchGridData = useCallback(() => {
    const { page, pageSize } = paginationModel;
    const skip  = page * pageSize;
    const limit = pageSize;
    const sortField = sortModel[0]?.field ?? 'pk';
    const sortOrder = sortModel[0]?.sort  ?? 'desc';

    const url =
      `http://localhost:8000/api/datanode-data?` +
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

  /* run on load / whenever pagination | sort | filter change */
  useEffect(() => { fetchGridData(); }, [fetchGridData]);

  /* whenever the user adds a filter, snap back to first page */
  useEffect(() => {
    setPaginationModel(m => ({ ...m, page: 0 }));
  }, [filterModel]);

  /* ---------------------------------- delete flow ---------------------------------- */
  useEffect(() => {
    if (toDeleteItem !== null) {
      fetch(`http://localhost:8000/api/datanode/delete/${toDeleteItem.pk}?dry_run=True`, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
          if (data.deleted_nodes.length > 0) {
            const formatted_pks = data.deleted_nodes.map(x => ` ${x}`);
            data.deleted_nodes.splice(data.deleted_nodes.indexOf(toDeleteItem.pk), 1);
            setBodyTextConfirmDeleteModal(
              <p>
                Are you sure you want to delete node PK&lt;{toDeleteItem.pk}&gt; and {data.deleted_nodes.length} dependent nodes?
                <b> A deletion is irreversible.</b>
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
    fetch(`http://localhost:8000/api/datanode/delete/${item.pk}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.deleted) {
          toast.success(data.message);
          fetchGridData();                    // refresh table
        } else {
          toast.error('Error deleting item');
        }
      })
      .catch(err => console.error('Error deleting item: ', err));
  };

  /* cell update handler (label / description) ─────────────── */
  const processRowUpdate = useCallback(
    async (newRow, oldRow) => {
      const diff = {};
      if (newRow.label !== oldRow.label)       diff.label       = newRow.label;
      if (newRow.description !== oldRow.description) diff.description = newRow.description;
      if (!Object.keys(diff).length) return oldRow;        // nothing changed
      try {
        const r = await fetch(`http://localhost:8000/api/datanode/${newRow.pk}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diff),
        });
        if (!r.ok) throw new Error((await r.json()).detail);
        toast.success(`Saved PK ${newRow.pk}`);
        return newRow;                      // keep the edited values
      } catch (err) {
        toast.error(`Save failed – ${err.message}`);
        return oldRow;                      // revert in the grid
      }
    },
    [],
  );

  /* ----------------------------------- column definitions ----------------------------------- */
  const columns = [
    {
      field: 'pk',
      headerName: 'PK',
      width: 90,
      renderCell: params => <Link to={`/datanode/${params.row.pk}`}>{params.value}</Link>,
    },
    { field: 'ctime',      headerName: 'Created',     width: 150 },
    { field: 'node_type',  headerName: 'Type',        width: 200 },
    {
      field: 'label',
      headerName: 'Label',
      width: 250,
      editable: true,                         // editable
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 250,
      editable: true,                         // editable
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: params => (
        <Tooltip title="Delete">
          <IconButton onClick={() => setToDeleteItem(structuredClone(params.row))} color="error">
            <Delete />
          </IconButton>
        </Tooltip>
      ),
      sortable: false,
      filterable: false,
    },
  ];

  /* ---------------------------------- rendered JSX ---------------------------------- */
  return (
    <div style={{ padding: '1rem' }}>
      <h2>Data Node</h2>

      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={row => row.pk}

        /* server‑side features */
        paginationMode="server"
        sortingMode="server"
        filterMode="server"

        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}

        sortModel={sortModel}
        onSortModelChange={setSortModel}

        filterModel={filterModel}
        onFilterModelChange={setFilterModel}

        pageSizeOptions={[15, 30, 50]}

        /* hide description by default, but keep column menu toggleable */
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}

        /* commit edits immediately */
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={(err) => toast.error(err.message)}
        editMode="cell"

        slots={{
          pagination: MuiPagination,
          toolbar:    GridToolbar,
        }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
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

export default DataNode;
