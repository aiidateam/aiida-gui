// pages/ProcessTable.jsx
import { IconButton, Tooltip } from '@mui/material';
import { Delete, Pause, PlayArrow } from '@mui/icons-material';
import NodeTable from './NodeTable';

const processColumns = linkPrefix => ([
  { field:'pk', headerName:'PK', width:90,
    renderCell:p => <a href={`${linkPrefix}/${p.value}`}>{p.value}</a> },
  { field:'ctime', headerName:'Created',     width:150 },
  { field:'process_label', headerName:'Process label', width:260, sortable:false },
  { field:'process_state',  headerName:'State',  width:140, sortable:false },
  { field:'process_status', headerName:'Status', width:140, sortable:false },
  { field:'label',         headerName:'Label',  width:220, editable:true },
  { field:'description',   headerName:'Description', width:240, editable:true },
  { field:'exit_status',   headerName:'Exit status', sortable:false },
  { field:'exit_message',  headerName:'Exit message', width:240, sortable:false },
  { field:'paused',        headerName:'Paused', width:100,
    renderCell:({ value }) => value ? 'Yes' : 'No' },
]);

function processActions(row, { endpointBase, refetch }) {
  const post = url => fetch(url, { method:'POST' }).then(refetch);
  if (/(Finished|Failed|Excepted)/.test(row.process_state))
    return (
      <Tooltip title="Delete"><IconButton color="error"
        onClick={() => post(`${endpointBase}/delete/${row.pk}`)}><Delete/></IconButton></Tooltip>
    );

  if (row.paused)
    return (
      <>
        <Tooltip title="Resume"><IconButton color="success"
          onClick={() => post(`${endpointBase}/play/${row.pk}`)}><PlayArrow/></IconButton></Tooltip>
        <Tooltip title="Delete"><IconButton color="error"
          onClick={() => post(`${endpointBase}/delete/${row.pk}`)}><Delete/></IconButton></Tooltip>
      </>
    );

  return (
    <>
      <Tooltip title="Pause"><IconButton
        onClick={() => post(`${endpointBase}/pause/${row.pk}`)}><Pause/></IconButton></Tooltip>
      <Tooltip title="Delete"><IconButton color="error"
        onClick={() => post(`${endpointBase}/delete/${row.pk}`)}><Delete/></IconButton></Tooltip>
    </>
  );
}

export function ProcessTable() {
    return (
      <NodeTable
        title="Process nodes"
        endpointBase="http://localhost:8000/api/process"
        linkPrefix="/process"
        config={{
          columns       : processColumns,
          buildActions  : processActions,
          editableFields: ['label', 'description'],
        }}
      />
    );
  }



  export function WorkGraphTable() {
    return (
      <NodeTable
        title="WorkGraph nodes"
        endpointBase="http://localhost:8000/api/workgraph"
        linkPrefix="/workgraph"
        config={{
          columns       : processColumns,
          buildActions  : processActions,
          editableFields: ['label', 'description'],
        }}
      />
    );
  }
