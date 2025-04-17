import React, { useState, useEffect, useCallback} from 'react';
import {
  DataGrid,
  gridPageCountSelector,
  gridPageSelector,
  useGridApiContext,
  useGridSelector,
  GridToolbar           //  <-- NEW (toolbar gives the “Filters” / quick‑filter UI)
} from '@mui/x-data-grid';
import { Pagination, IconButton, Tooltip } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import WorkGraphConfirmModal from './WorkGraphModals';
import 'react-toastify/dist/ReactToastify.css';

/* ---------- pagination component (unchanged) ---------- */
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
  const [rows, setRows]                 = useState([]);
  const [rowCount, setRowCount]         = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [sortModel, setSortModel]       = useState([{ field: 'pk', sort: 'desc' }]);
  const [filterModel, setFilterModel]   = useState({ items: [] });      // NEW
  const [toDeleteItem, setToDeleteItem] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [bodyTextConfirmDeleteModal, setBodyTextConfirmDeleteModal] = useState(<p />);

  // 🆕 put this just above your `useEffect` hooks
  const fetchGridData = useCallback(() => {
    const { page, pageSize } = paginationModel;
    const skip       = page * pageSize;
    const limit      = pageSize;
    const sortField  = sortModel[0]?.field ?? 'pk';
    const sortOrder  = sortModel[0]?.sort  ?? 'desc';

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
  /* --------------- server‑side fetch --------------- */
  /* main data fetch */
  useEffect(() => { fetchGridData(); }, [fetchGridData]);

  /* reset to first page whenever a new filter is applied */
  useEffect(() => {
    setPaginationModel(m => ({ ...m, page: 0 }));
  }, [filterModel]);

    useEffect(() => {
        if (toDeleteItem !== null) {
            fetch(`http://localhost:8000/api/datanode/delete/${toDeleteItem.pk}?dry_run=True`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.deleted_nodes.length > 0) {
                        let formatted_pks = data.deleted_nodes.map(x => ` ${x.toString()}`);
                        data.deleted_nodes.splice(data.deleted_nodes.indexOf(toDeleteItem.pk), 1);
                        setBodyTextConfirmDeleteModal(
                            <p>
                                Are you sure you want to delete node PK&lt;{toDeleteItem.pk}&gt; and {data.deleted_nodes.length} dependent nodes?
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
                .catch(error => console.error('Error deleting item: ', error));
        }
    }, [toDeleteItem]);

    const handleDeleteNode = (item) => {
        fetch(`http://localhost:8000/api/datanode/delete/${item.pk}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.deleted) {
                    toast.success(data.message);
                    fetchGridData();                     // <-- reuse helpe
                } else {
                    toast.error('Error deleting item');
                }
            })
            .catch(error => console.error('Error deleting item: ', error));
    };

    // Columns definition for DataGrid
    const columns = [
        {
          field: 'pk',
          headerName: 'PK',
          width: 90,
          filterable: true,
          renderCell: params => <Link to={`/datanode/${params.row.pk}`}>{params.value}</Link>,
        },
        { field: 'ctime',      headerName: 'Created',  width: 150, filterable: true },
        { field: 'node_type',  headerName: 'Type',     width: 200, filterable: true },
        { field: 'label',      headerName: 'Label',    width: 250, filterable: true, editable: true },
        { field: 'description',      headerName: 'Description',    width: 250, filterable: true, editable: true },
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

      return (
        <div style={{ padding: '1rem' }}>
          <h2>Data Node</h2>

          {/* ---------------- DataGrid ---------------- */}
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={row => row.pk}

            /* server‑side features */
            paginationMode="server"
            sortingMode="server"
            filterMode="server"            /* <-- NEW :contentReference[oaicite:0]{index=0} */

            rowCount={rowCount}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}

            sortModel={sortModel}
            onSortModelChange={setSortModel}

            filterModel={filterModel}      /* NEW */
            onFilterModelChange={setFilterModel}

            pageSizeOptions={[15, 30, 50]}

            slots={{
              pagination: MuiPagination,
              toolbar:    GridToolbar,     /* gives “Filter” button + quick‑filter */
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
