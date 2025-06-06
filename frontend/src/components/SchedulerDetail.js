import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

// Import Chart.js components and plugins
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

import { Line } from 'react-chartjs-2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NodeTable from './NodeTable';                       // the generic table
import { extraActions } from './ProcessTable'; // the generic table
import { Link } from 'react-router-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);


export const processColumns = linkPrefix => ([
  {
    field: 'pk',
    headerName: 'PK',
    width: 120,
    renderCell: ({ row, value }) => {
      const typeKey = row.node_type.toLowerCase();

      let prefix = '/process';
      if (typeKey.endsWith('workgraphnode.')) {
        prefix = '/workgraph';
      } else if (typeKey.endsWith('workchainnode.')) {
        prefix = '/workchain';
      }

      return <Link to={`${prefix}/${value}`}>{value}</Link>;
    }
  },
  { field:'ctime', headerName:'Created',     width:150 },
  { field:'process_label', headerName:'Process label', width:260, sortable:false },
  {
    field: 'process_state',
    headerName: 'State',
    width: 140,
    sortable: false,
    renderCell: ({ row }) => {
      const { process_state, exit_status } = row;
      let color = 'inherit';

      switch (process_state) {
        case 'Finished':
          {
            const statusCode = parseInt(exit_status, 10);
            color = !isNaN(statusCode) && statusCode > 0 ? 'red' : 'green';
          }
          return <span style={{ color }}>{process_state} [{exit_status}]</span>;
      case 'Excepted':
        case 'Failed':
          color = 'red';
          break;
        case 'Running':
          color = 'blue';
          break;
        case 'Waiting':
          color = 'orange';
          break;
        default:
          color = 'inherit';
      }

      return <span style={{ color }}>{process_state}</span>;
    },
  },
  { field:'process_status', headerName:'Status', width:140, sortable:false },
  { field:'label',         headerName:'Label',  width:220, editable:true },
  { field:'description',   headerName:'Description', width:240, editable:true },
  { field:'exit_status',   headerName:'Exit status', sortable:false },
  { field:'exit_message',  headerName:'Exit message', width:240, sortable:false },
  { field: 'priority', headerName: 'Priority', width: 90,
    type: 'number',
    editable: true, sortable: false },
  { field:'paused',        headerName:'Paused', width:100,
    renderCell:({ value }) => value ? 'Yes' : 'No' },
]);

export default function SchedulerDetail() {
  const { name } = useParams();
  const [scheduler, setScheduler] = useState(null);
  const [daemon, setDaemon] = useState({"running": null});

  // Time series data
  const [runningProcessData, setRunningProcessData] = useState([]);
  const [waitingProcessData, setWaitingProcessData] = useState([]);
  const [calcjobData, setCalcjobData] = useState([]);
  const [workflowData, setWorkflowData] = useState([]);

  // New time series for CPU & memory usage
  const [cpuUsageData, setCpuUsageData] = useState([]);
  const [memoryUsageData, setMemoryUsageData] = useState([]);

  // Inline editing states
  const [maxCalcjobsEdit, setMaxCalcjobsEdit] = useState('');
  const [maxWorkflowsEdit, setMaxWorkflowsEdit] = useState('');
  const [maxProcessesEdit, setMaxProcessesEdit] = useState('');
  // Dirty flags to prevent overwriting user input while typing
  const [maxCalcjobsDirty, setMaxCalcjobsDirty] = useState(false);
  const [maxWorkflowsDirty, setMaxWorkflowsDirty] = useState(false);
  const [maxProcessesDirty, setMaxProcessesDirty] = useState(false);

  // Refresh interval & chart size
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [chartSize, setChartSize] = useState('small');

  // Chart references
  const processChartRef = useRef(null);
  const calcjobChartRef = useRef(null);
  const workflowChartRef = useRef(null);
  const cpuMemChartRef = useRef(null);

  // Chart size definitions
  const chartWidths = { small: 400, medium: 700, large: 1000 };
  const chartHeights = { small: 300, medium: 500, large: 700 };
  const chartWidth = chartWidths[chartSize];
  const chartHeight = chartHeights[chartSize];
  const chartFlexWidth = chartWidth;

  // Fetch scheduler detail
  const fetchScheduler = () => {
    fetch(`http://localhost:8000/api/scheduler/data/${name}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch scheduler ${name} data.`);
        }
        return response.json();
      })
      .then((data) => {
        setScheduler(data);

        // Keep the inline edits in sync if user isn't editing
        if (!maxCalcjobsDirty) {
          setMaxCalcjobsEdit(data.max_calcjobs);
        }
        if (!maxWorkflowsDirty) {
          setMaxWorkflowsEdit(data.max_workflows);
        }
        if (!maxProcessesDirty) {
          setMaxProcessesEdit(data.max_processes);
        }

        // Update chart data
        const currentTime = Date.now();
        setRunningProcessData((prev) =>
          [...prev, { x: currentTime, y: data.running_process_count }].slice(-20)
        );
        setWaitingProcessData((prev) =>
          [...prev, { x: currentTime, y: data.waiting_process_count }].slice(-20)
        );
        setCalcjobData((prev) =>
          [...prev, { x: currentTime, y: data.running_calcjob_count }].slice(-20)
        );
        setWorkflowData((prev) =>
          [...prev, { x: currentTime, y: data.running_workflow_count }].slice(-20)
        );
      })
      .catch((error) => console.error(error));
  };

  // Fetch scheduler detail
  const fetchDaemon = () => {
    fetch(`http://localhost:8000/api/scheduler/status/${name}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch scheduler ${name} data.`);
        }
        return response.json();
      })
      .then((data) => {
        setDaemon(data);

        // Update chart data
        const currentTime = Date.now();
        setCpuUsageData((prev) =>
          [...prev, { x: currentTime, y: data.cpu ?? 0 }].slice(-20)
        );
        setMemoryUsageData((prev) =>
          [...prev, { x: currentTime, y: data.memory ?? 0 }].slice(-20)
        );
      })
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    fetchScheduler();
    const interval = setInterval(fetchScheduler, refreshInterval);
    return () => clearInterval(interval);
  }, [name, refreshInterval, maxCalcjobsDirty, maxWorkflowsDirty, , maxProcessesDirty]);

  useEffect(() => {
    fetchDaemon();
    const interval = setInterval(fetchDaemon, refreshInterval);
    return () => clearInterval(interval);
  }, [name, refreshInterval, maxCalcjobsDirty, maxWorkflowsDirty, maxProcessesDirty]);


  /* ------------------------------
   *    START / STOP HANDLERS
   * ------------------------------ */
  const handleStart = () => {
    fetch('http://localhost:8000/api/scheduler/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        max_calcjobs: parseInt(maxCalcjobsEdit, 10) || undefined,
        max_workflows: parseInt(maxWorkflowsEdit, 10) || undefined,
        max_processes: parseInt(maxProcessesEdit, 10) || undefined,
        foreground: false,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to start scheduler: ${name}`);
        }
        return response.json();
      })
      .then(() => {
        toast.success(`Scheduler "${name}" started successfully`);
        fetchScheduler(); // refresh detail
      })
      .catch((error) => toast.error(error.message));
  };

  const handleStop = () => {
    fetch(`http://localhost:8000/api/scheduler/stop?name=${name}`, {
      method: 'POST',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to stop scheduler: ${name}`);
        }
        return response.json();
      })
      .then(() => {
        toast.success(`Scheduler "${name}" stopped successfully`);
        fetchScheduler(); // refresh detail
      })
      .catch((error) => toast.error(error.message));
  };

  /* ------------------------------
   *    UPDATE LIMITS HANDLERS
   * ------------------------------ */
  const updateMaxCalcjobs = () => {
    fetch('http://localhost:8000/api/scheduler/set_max_calcjobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        max_calcjobs: parseInt(maxCalcjobsEdit, 10),
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to update max calcjobs.');
        return response.json();
      })
      .then((data) => {
        toast.success('Max calcjobs updated.');
        setScheduler(data);
      })
      .catch((error) => toast.error(error.message));
  };

  const updateMaxWorkflows = () => {
    fetch('http://localhost:8000/api/scheduler/set_max_workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        max_workflows: parseInt(maxWorkflowsEdit, 10),
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to update max workflows.');
        return response.json();
      })
      .then((data) => {
        toast.success('Max workflows updated.');
        setScheduler(data);
      })
      .catch((error) => toast.error(error.message));
  };


  const updateMaxProcesses = () => {
    fetch('http://localhost:8000/api/scheduler/set_max_processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        max_processes: parseInt(maxProcessesEdit, 10),
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to update max processes.');
        return response.json();
      })
      .then((data) => {
        toast.success('Max processes updated.');
        setScheduler(data);
      })
      .catch((error) => toast.error(error.message));
  };

  /* ------------------------------
   *    CHART CONFIGS
   * ------------------------------ */
  const processChartOptions = {
    responsive: false,
    plugins: {
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: { tooltipFormat: 'HH:mm:ss', unit: 'second' },
      },
      y1: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: (value) => Math.round(value),
        },
        title: { display: true, text: 'Running Processes' },
      },
      y2: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: (value) => Math.round(value),
        },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Waiting Processes' },
      },
    },
  };

  const singleSeriesOptions = {
    responsive: false,
    plugins: {
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: { tooltipFormat: 'HH:mm:ss', unit: 'second' },
      },
      y: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: (value) => Math.round(value),
        },
        title: { display: true, text: 'Count' },
      },
    },
  };

  const cpuMemChartOptions = {
    responsive: false,
    plugins: {
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: { tooltipFormat: 'HH:mm:ss', unit: 'second' },
      },
      y1: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        title: { display: true, text: 'CPU (%)' },
      },
      y2: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Memory' },
      },
    },
  };

  const processChartData = {
    datasets: [
      {
        label: 'Running Processes',
        data: runningProcessData,
        fill: false,
        borderColor: 'blue',
        tension: 0.1,
        yAxisID: 'y1',
      },
      {
        label: 'Waiting Processes',
        data: waitingProcessData,
        fill: false,
        borderColor: 'orange',
        tension: 0.1,
        yAxisID: 'y2',
      },
    ],
  };

  const calcjobChartData = {
    datasets: [
      { label: 'Running Calcjobs',  data: calcjobData, borderColor: 'green',  fill: false, tension: .1 },
    ],
  };

  const workflowChartData = {
    datasets: [
      { label: 'Running Workflows', data: workflowData, borderColor: 'purple', fill: false, tension: .1 },
    ],
  };

  const cpuMemChartData = {
    datasets: [
      {
        label: 'CPU Usage (%)',
        data: cpuUsageData,
        fill: false,
        borderColor: 'red',
        tension: 0.1,
        yAxisID: 'y1',
      },
      {
        label: 'Memory Usage',
        data: memoryUsageData,
        fill: false,
        borderColor: 'purple',
        tension: 0.1,
        yAxisID: 'y2',
      },
    ],
  };

  if (!scheduler) {
    return <div>Loading scheduler details...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <ToastContainer position="top-right" autoClose={3000} />

      <h2 style={{ textAlign: 'center' }}>Scheduler: {scheduler.name}</h2>

      {/* Overview Section */}
      <div
        style={{
          background: '#f9f9f9',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0px 0px 10px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ marginBottom: '10px' }}>Overview</h3>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Status:</strong>{' '}
              <span style={{ color: daemon.running ? 'green' : 'red' }}>
                {daemon.running ? 'Running' : 'Stopped'}
              </span>
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Scheduler PK:</strong> {scheduler.pk}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>PID (Daemon):</strong> {daemon.pid ?? 'N/A'}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Create Time:</strong> {scheduler.ctime ?? 'N/A'}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Start Time:</strong> {daemon.start_time ?? 'N/A'}
            </p>
          </div>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Waiting Processes:</strong> {scheduler.waiting_process_count}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Running Processes:</strong> {scheduler.running_process_count}/
              {scheduler.max_processes || 0}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Running Calcjobs:</strong> {scheduler.running_calcjob_count}/
              {scheduler.max_calcjobs || 0}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Running Workflows:</strong> {scheduler.running_workflow_count}/
              {scheduler.max_workflows || 0}
            </p>
          </div>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <p style={{ margin: '6px 0' }}>
              <strong>CPU Usage (%):</strong> {daemon.cpu ?? 0}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Memory Usage:</strong> {daemon.memory ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div
        style={{
          marginBottom: '20px',
          background: '#fafafa',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0px 0px 5px rgba(0,0,0,0.1)',
        }}
      >
        <h3>Controls & Settings</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Start/Stop Buttons */}
          <div>
            {daemon.running ? (
              <button
                onClick={handleStop}
                style={{ ...buttonStyle, backgroundColor: '#dc3545' }}
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                style={{ ...buttonStyle, backgroundColor: '#28a745' }}
              >
                Start
              </button>
            )}
          </div>

          {/* Max Calcjobs & Max Processes */}
          <div>
            <label style={{ marginRight: '8px' }}>Max Calcjobs:</label>
            <input
              type="number"
              value={maxCalcjobsEdit}
              onFocus={() => setMaxCalcjobsDirty(true)}
              onBlur={() => {
                setMaxCalcjobsDirty(false);
                updateMaxCalcjobs();
              }}
              onChange={(e) => setMaxCalcjobsEdit(e.target.value)}
              style={{ width: '80px', marginRight: '5px' }}
            />
          </div>
          <div>
            <label style={{ marginRight: '8px' }}>Max Workflows:</label>
            <input
              type="number"
              value={maxWorkflowsEdit}
              onFocus={() => setMaxWorkflowsDirty(true)}
              onBlur={() => {
                setMaxWorkflowsDirty(false);
                updateMaxWorkflows();
              }}
              onChange={(e) => setMaxWorkflowsEdit(e.target.value)}
              style={{ width: '80px', marginRight: '5px' }}
            />
          </div>
          <div>
            <label style={{ marginRight: '8px' }}>Max Processes:</label>
            <input
              type="number"
              value={maxProcessesEdit}
              onFocus={() => setMaxProcessesDirty(true)}
              onBlur={() => {
                setMaxProcessesDirty(false);
                updateMaxProcesses();
              }}
              onChange={(e) => setMaxProcessesEdit(e.target.value)}
              style={{ width: '80px', marginRight: '5px' }}
            />
          </div>

          {/* Chart Refresh Interval */}
          <div>
            <label style={{ marginRight: '5px' }}>Refresh Interval:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={1000}>1 sec</option>
              <option value={3000}>3 sec</option>
              <option value={5000}>5 sec</option>
              <option value={30000}>30 sec</option>
            </select>
          </div>

          {/* Chart Size */}
          <div>
            <label style={{ marginRight: '5px' }}>Chart Size:</label>
            <select value={chartSize} onChange={(e) => setChartSize(e.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart Row (flex container, wrapping) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'flex-start',
          marginBottom: '30px',
        }}
      >
        {/* Calcjob Chart Section */}
        <div
          style={{
            flex: `0 0 ${chartFlexWidth}px`,
            boxSizing: 'border-box',
          }}
        >
          <h4>Running Calcjobs</h4>
          <Line
            key={`calcjob-chart-${chartSize}`}
            ref={calcjobChartRef}
            data={calcjobChartData}
            options={singleSeriesOptions}
            width={chartWidth}
            height={chartHeight}
          />
        </div>

        {/* Calcjob Chart Section */}
        <div
          style={{
            flex: `0 0 ${chartFlexWidth}px`,
            boxSizing: 'border-box',
          }}
        >
          <h4>Running Workflows</h4>
          <Line
            key={`workflow-chart-${chartSize}`}
            ref={workflowChartRef}
            data={workflowChartData}
            options={singleSeriesOptions}
            width={chartWidth}
            height={chartHeight}
          />
        </div>

        {/* Process Chart Section */}
        <div
          style={{
            flex: `0 0 ${chartFlexWidth}px`,
            boxSizing: 'border-box',
          }}
        >
          <h4>Processes (Running & Waiting)</h4>
          <Line
            key={`process-chart-${chartSize}`}
            ref={processChartRef}
            data={processChartData}
            options={processChartOptions}
            width={chartWidth}
            height={chartHeight}
          />
        </div>

        {/* CPU/Memory Chart Section */}
        <div
          style={{
            flex: `0 0 ${chartFlexWidth}px`,
            boxSizing: 'border-box',
          }}
        >
          <h4>CPU & Memory Usage</h4>
          <Line
            key={`cpu-mem-chart-${chartSize}`}
            ref={cpuMemChartRef}
            data={cpuMemChartData}
            options={cpuMemChartOptions}
            width={chartWidth}
            height={chartHeight}
          />
        </div>
      </div>
      {/* ----- member table ----- */}
      <NodeTable
        title=""
        endpointBase={`http://localhost:8000/api/scheduler/${name}/process`}
        linkPrefix="/process"
        actionBase={`http://localhost:8000/api/process`}
        config={{
          columns       : processColumns,
          buildExtraActions: extraActions,
          editableFields: ['label', 'description', 'priority'],
        }}
      />
    </div>
  );
}

/** A little styling for the Start/Stop buttons. */
const buttonStyle = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: '4px',
  color: '#fff',
  cursor: 'pointer',
};
