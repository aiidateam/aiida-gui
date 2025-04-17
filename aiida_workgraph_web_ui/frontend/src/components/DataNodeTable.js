import React, { useState, useEffect } from 'react';
import { DataGrid, gridPageCountSelector, gridPageSelector,
         useGridApiContext, useGridSelector } from '@mui/x-data-grid';
import { Pagination } from '@mui/material';
import { IconButton, Tooltip, TextField } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import WorkGraphConfirmModal from './WorkGraphModals';
import 'react-toastify/dist/ReactToastify.css';

/* ---------- Custom Pagination that shows page numbers --------- */
function MuiPagination() {
    const apiRef   = useGridApiContext();
    const page     = useGridSelector(apiRef, gridPageSelector);
    const pageCount= useGridSelector(apiRef, gridPageCountSelector);

    return (
      <Pagination
        color="primary"
        page={page + 1}
        count={pageCount}
        onChange={(_, value) => apiRef.current.setPage(value - 1)}
        showFirstButton showLastButton
      />
    );
  }

/* ------------------ DataNode Component ------------------ */
function DataNode() {
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);                    // NEW
  const [searchTypeQuery, setSearchTypeQuery] = useState('');
  const [searchLabelQuery, setSearchLabelQuery] = useState('');
  const [paginationModel, setPaginationModel] = useState({        // NEW
    page: 0,
    pageSize: 15,
  });
  const [sortModel, setSortModel] = useState([
    { field: 'pk', sort: 'desc' },
  ]);
  const [toDeleteItem, setToDeleteItem] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [bodyTextConfirmDeleteModal, setBodyTextConfirmDeleteModal] = useState(<p />);

  /* ------------------ SERVER‑SIDE FETCH ------------------ */
  useEffect(() => {
    const { page, pageSize } = paginationModel;
    const skip  = page * pageSize;
    const limit = pageSize;

    const sortField = sortModel[0]?.field ?? 'pk';
    const sortOrder = sortModel[0]?.sort  ?? 'desc';

    fetch(
      `http://localhost:8000/api/datanode-data?` +
      `typeSearch=${encodeURIComponent(searchTypeQuery)}` +
      `&labelSearch=${encodeURIComponent(searchLabelQuery)}` +
      `&skip=${skip}&limit=${limit}` +
      `&sortField=${sortField}&sortOrder=${sortOrder}`
    )
      .then(r => r.json())
      .then(({ data, total }) => {
        setRows(data);
        setRowCount(total);
      })
      .catch(err => console.error('fetch error', err));
  }, [searchTypeQuery, searchLabelQuery, paginationModel, sortModel]);

  /* reset to first page whenever a new search is typed */
  useEffect(() => {
    setPaginationModel((m) => ({ ...m, page: 0 }));
  }, [searchTypeQuery, searchLabelQuery]);

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
                    fetch(`http://localhost:8000/api/datanode-data?typeSearch=${searchTypeQuery}&labelSearch=${searchLabelQuery}`)
                        .then(response => response.json())
                        .then(data => setRows(data))
                        .catch(error => console.error('Error fetching data: ', error));
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
          renderCell: (params) => <Link to={`/datanode/${params.row.pk}`}>{params.value}</Link>,
        },
        { field: 'ctime', headerName: 'Created', width: 150 },
        { field: 'node_type', headerName: 'Type', width: 200 },
        { field: 'label', headerName: 'Label', width: 250 },
        {
          field: 'actions',
          headerName: 'Actions',
          width: 100,
          renderCell: (params) => (
            <Tooltip title="Delete">
              <IconButton onClick={() => setToDeleteItem(structuredClone(params.row))} color="error">
                <Delete />
              </IconButton>
            </Tooltip>
          ),
          sortable: false,
        },
      ];

      return (
        <div style={{ padding: '1rem' }}>
          <h2>Data Node</h2>

          {/* Search Inputs */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <TextField
              label="Search by Type"
              variant="outlined"
              size="small"
              value={searchTypeQuery}
              onChange={(e) => setSearchTypeQuery(e.target.value)}
            />
            <TextField
              label="Search by Label"
              variant="outlined"
              size="small"
              value={searchLabelQuery}
              onChange={(e) => setSearchLabelQuery(e.target.value)}
            />
          </div>

          {/* DataGrid */}
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.pk}
            paginationMode="server"
        sortingMode="server"

        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}

        sortModel={sortModel}
        onSortModelChange={setSortModel}

        rowCount={rowCount}
        pageSizeOptions={[15, 30, 50]}

        /* swap in our page‑number component */
        slots={{ pagination: MuiPagination }}

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
