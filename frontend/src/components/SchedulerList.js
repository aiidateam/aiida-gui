import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Box } from '@mui/material';

// A simple modal component for "Add Scheduler"
function AddSchedulerModal({ show, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [maxCalcjobs, setMaxCalcjobs] = useState(10);
  const [maxWorkflows, setMaxWorkflows] = useState(10);
  const [maxProcesses, setMaxProcesses] = useState(100);

  if (!show) {
    return null; // If not visible, render nothing
  }

  const handleAddClick = () => {
    // Basic validation
    if (!name.trim()) {
      toast.error('Please enter a scheduler name');
      return;
    }
    onAdd({
      name: name.trim(),
      max_calcjobs: parseInt(maxCalcjobs, 10) || undefined,
      max_workflows: parseInt(maxWorkflows, 10) || undefined,
      max_processes: parseInt(maxProcesses, 30) || undefined,
    });
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <h3>Add Scheduler</h3>

        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '120px' }}>Name:</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '120px' }}>Max Calcjobs:</label>
          <input
            type="number"
            value={maxCalcjobs}
            onChange={e => setMaxCalcjobs(e.target.value)}
            style={{ width: '100px' }}
          />
        </div>

        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '120px' }}>Max Workflows:</label>
          <input
            type="number"
            value={maxWorkflows}
            onChange={e => setMaxWorkflows(e.target.value)}
            style={{ width: '100px' }}
          />
        </div>

        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '120px' }}>Max Processes:</label>
          <input
            type="number"
            value={maxProcesses}
            onChange={e => setMaxProcesses(e.target.value)}
            style={{ width: '100px' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
          <button style={buttonStyleSecondary} onClick={onClose}>
            Cancel
          </button>
          <button style={buttonStylePrimary} onClick={handleAddClick}>
            Add
          </button>
        </div>
      </div>
    </div>

  );
}

function SchedulerList() {
  const [schedulers, setSchedulers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false); // controls modal visibility

  const navigate = useNavigate();

  const fetchSchedulers = () => {
    fetch('http://localhost:8000/api/scheduler/list')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch scheduler status.');
        }
        return response.json();
      })
      .then(data => setSchedulers(data))
      .catch(error => console.error('Error fetching schedulers:', error));
  };

  useEffect(() => {
    fetchSchedulers();
    const interval = setInterval(fetchSchedulers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRowClick = (schedulerName) => {
    navigate(`/scheduler/${schedulerName}`);
  };

  const handleStart = (name) => {
    fetch('http://localhost:8000/api/scheduler/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        // max_calcjobs and max_processes can be omitted or sent as their current values if available
        foreground: false,
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to start scheduler: ${name}`);
        }
        return response.json();
      })
      .then(() => {
        toast.success(`Scheduler "${name}" started successfully`);
        fetchSchedulers();
      })
      .catch(error => toast.error(error.message));
  };

  const handleStop = (name) => {
    fetch(`http://localhost:8000/api/scheduler/stop?name=${name}`, {
      method: 'POST'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to stop scheduler: ${name}`);
        }
        return response.json();
      })
      .then(() => {
        toast.success(`Scheduler "${name}" stopped successfully`);
        fetchSchedulers();
      })
      .catch(error => toast.error(error.message));
  };

  const handleDelete = (name) => {
    // Show a confirm dialog before proceeding
    const userConfirmed = window.confirm(`Are you sure you want to delete scheduler "${name}"?`);
    if (!userConfirmed) {
      return; // User canceled
    }

    fetch('http://localhost:8000/api/scheduler/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then(async response => {
        if (!response.ok) {
          // Attempt to extract a detail message from JSON
          let errorMsg = `Failed to delete scheduler: ${name}`;
          try {
            const errData = await response.json();
            if (errData.detail) {
              errorMsg = errData.detail;
            }
          } catch (_) {
            // ignore parse errors
          }
          throw new Error(errorMsg);
        }
        return response.json();
      })
      .then(() => {
        toast.success(`Scheduler "${name}" deleted successfully`);
        fetchSchedulers();
      })
      .catch(error => toast.error(error.message));
  };

  // Called when user clicks "Add" in the modal
  const handleAddScheduler = (data) => {
    fetch('http://localhost:8000/api/scheduler/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to create scheduler: ${data.name}`);
        }
        return response.json();
      })
      .then(() => {
        toast.success(`Scheduler "${data.name}" created and started successfully`);
        setShowAddModal(false); // close modal
        fetchSchedulers();
      })
      .catch(error => toast.error(error.message));
  };

  // Define columns for DataGrid
  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      width: 150,
      renderCell: (params) => (
        <span
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => handleRowClick(params.value)}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <span style={{ color: params.row.running ? 'green' : 'red' }}>
          {params.row.running ? 'Running' : 'Stopped'}
        </span>
      ),
    },
    { field: 'waiting_process_count', headerName: 'Waiting Processes', width: 150 },
    {
      field: 'running_processes',
      headerName: 'Running Processes',
      width: 150,
      valueGetter: (value, row) => {
        return `${row.running_process_count}/${row.max_processes ?? 0}`;
      },
    },
    {
      field: 'running_calcjobs',
      headerName: 'Running Calcjobs',
      width: 150,
      valueGetter: (value, row) => {
        return `${row.running_calcjob_count}/${row.max_calcjobs ?? 0}`;
      },
    },
    {
      field: 'running_workflows',
      headerName: 'Running Workflows',
      width: 150,
      valueGetter: (value, row) => {
        return `${row.running_workflow_count}/${row.max_workflows ?? 0}`;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box>
          {params.row.running ? (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => handleStop(params.row.name)}
              sx={{ mr: 1 }}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => handleStart(params.row.name)}
              sx={{ mr: 1 }}
            >
              Start
            </Button>
          )}
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => handleDelete(params.row.name)}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <div>
      <ToastContainer />

      <AddSchedulerModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddScheduler}
      />

      <h2>Scheduler List</h2>

      <Box sx={{ marginBottom: '15px' }}>
        <Button
          variant="contained"
          onClick={() => setShowAddModal(true)}
        >
          + Add Scheduler
        </Button>
      </Box>

      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={schedulers}
          columns={columns}
          getRowId={(row) => row.name} // Use a unique identifier for each row, 'name' seems appropriate here
          pageSizeOptions={[5, 10, 20]} // Options for rows per page
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5 },
            },
          }}
          disableRowSelectionOnClick
        />
      </Box>
    </div>
  );
}


// Basic reusable styles - kept for modal, but DataGrid uses MUI styling
const buttonBase = {
  padding: '6px 10px',
  marginRight: '6px',
  border: 'none',
  borderRadius: '4px',
  color: '#fff',
  cursor: 'pointer',
};

const buttonStylePrimary = {
  ...buttonBase,
  backgroundColor: '#007bff',
};

const buttonStyleSecondary = {
  ...buttonBase,
  backgroundColor: '#6c757d',
};

// Styles for the "Add Scheduler" modal
const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0,
  width: '100%', height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
};

const modalStyle = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '6px',
  minWidth: '300px',
  maxWidth: '400px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
};

export default SchedulerList;
