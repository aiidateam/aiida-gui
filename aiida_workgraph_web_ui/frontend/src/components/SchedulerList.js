// SchedulerList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// A simple modal component for "Add Scheduler"
function AddSchedulerModal({ show, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [maxCalcjobs, setMaxCalcjobs] = useState('');
  const [maxProcesses, setMaxProcesses] = useState('');

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
      max_processes: parseInt(maxProcesses, 10) || undefined,
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

  const handleStart = (name, maxCalcjobs, maxProcesses) => {
    fetch('http://localhost:8000/api/scheduler/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        max_calcjobs: maxCalcjobs || undefined,
        max_processes: maxProcesses || undefined,
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

  return (
    <div>
      <ToastContainer />

      <AddSchedulerModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddScheduler}
      />

      <h2>Scheduler List</h2>

      <div style={{ marginBottom: '15px' }}>
        <button
          style={buttonStylePrimary}
          onClick={() => setShowAddModal(true)}
        >
          + Add Scheduler
        </button>
      </div>

      <table className="table" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Waiting Processes</th>
            <th>Running Processes</th>
            <th>Running Calcjobs</th>
            <th>Running Workflows</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedulers.map(scheduler => (
            <tr key={scheduler.pk}>
              <td
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => handleRowClick(scheduler.name)}
              >
                {scheduler.name}
              </td>
              <td style={{ color: scheduler.running ? 'green' : 'red' }}>
                {scheduler.running ? 'Running' : 'Stopped'}
              </td>
              <td>{scheduler.waiting_process_count}</td>
              <td>{`${scheduler.running_process_count}/${scheduler.max_processes ?? 0}`}</td>
              <td>{`${scheduler.running_calcjob_count}/${scheduler.max_calcjobs ?? 0}`}</td>
              <td>{`${scheduler.running_workflow_count}/${scheduler.max_workflows ?? 0}`}</td>
              <td>
                {scheduler.running ? (
                  <button
                    onClick={() => handleStop(scheduler.name)}
                    style={buttonStyleDanger}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => handleStart(scheduler.name)}
                    style={buttonStyleSuccess}
                  >
                    Start
                  </button>
                )}
                <button
                  onClick={() => handleDelete(scheduler.name)}
                  style={buttonStyleSecondary}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Some inline styling for demonstration.
 */

// Basic reusable styles
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

const buttonStyleSuccess = {
  ...buttonBase,
  backgroundColor: '#28a745', // green
};

const buttonStyleDanger = {
  ...buttonBase,
  backgroundColor: '#dc3545', // red
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
