import React, { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Tooltip, TextField } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import WorkGraphConfirmModal from './WorkGraphModals';
import 'react-toastify/dist/ReactToastify.css';

function DataNode() {
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);                    // NEW
  const [searchTypeQuery, setSearchTypeQuery] = useState('');
  const [searchLabelQuery, setSearchLabelQuery] = useState('');
  const [paginationModel, setPaginationModel] = useState({        // NEW
    page: 0,
    pageSize: 15,
  });
  const [sortModel] = useState([{ field: 'pk', sort: 'desc' }]);  // server sort not implemented yet
  const [toDeleteItem, setToDeleteItem] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [bodyTextConfirmDeleteModal, setBodyTextConfirmDeleteModal] = useState(<p />);

  /* ------------------ SERVER‑SIDE FETCH ------------------ */
  useEffect(() => {
    const { page, pageSize } = paginationModel;
    const skip = page * pageSize;
    const limit = pageSize;

    fetch(
      `http://localhost:8000/api/datanode-data?typeSearch=${encodeURIComponent(
        searchTypeQuery
      )}&labelSearch=${encodeURIComponent(
        searchLabelQuery
      )}&skip=${skip}&limit=${limit}`
    )
      .then((res) => res.json())
      .then(({ data, total }) => {
        setRows(data);
        setRowCount(total);
      })
      .catch((err) => console.error('Error fetching data: ', err));
  }, [searchTypeQuery, searchLabelQuery, paginationModel]);

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
            paginationMode="server"                 /* ← key line */
            rowCount={rowCount}                     /* ← total from server */
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[15, 30, 50]}
            sortingMode="client"                    /* keep local until you add server sort */
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
