import { IconButton, Tooltip } from '@mui/material';
import { Pause, PlayArrow } from '@mui/icons-material';
import NodeTable from './NodeTable';

const processColumns = linkPrefix => ([
  { field:'pk', headerName:'PK', width:90,
    renderCell:p => <a href={`${linkPrefix}/${p.value}`}>{p.value}</a> },
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
          break;
        case 'Excepted':
        case 'Failed':
          color = 'red';
          break;
        case 'Running':
          color = 'blue';
          break;
        case 'Waiting':
        case 'Created':
          color = 'orange';
          break;
        default:
          color = 'inherit';
      }

      return <span style={{ color }}>{process_state} [{exit_status}]</span>;
    },
  },
  { field:'process_status', headerName:'Status', width:140, sortable:false },
  { field:'label',         headerName:'Label',  width:220, editable:true },
  { field:'description',   headerName:'Description', width:240, editable:true },
  { field:'exit_status',   headerName:'Exit status', sortable:false },
  { field:'exit_message',  headerName:'Exit message', width:240, sortable:false },
  { field:'paused',        headerName:'Paused', width:100,
    renderCell:({ value }) => value ? 'Yes' : 'No' },
]);

/* pause / play buttons – delete is handled generically */
function extraActions(row, { endpointBase, refetch }) {
    const post = url => fetch(url, { method:'POST' }).then(refetch);

    if (row.paused)
      return (
        <Tooltip title="Resume">
          <IconButton color="success"
            onClick={() => post(`${endpointBase}/play/${row.pk}`)}>
            <PlayArrow/>
          </IconButton>
        </Tooltip>
      );

    if (/(Finished|Failed|Excepted)/.test(row.process_state))
      return null;                       // only Delete remains → NodeTable shows it

    return (
      <Tooltip title="Pause">
        <IconButton onClick={() => post(`${endpointBase}/pause/${row.pk}`)}>
          <Pause/>
        </IconButton>
      </Tooltip>
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
          buildExtraActions: extraActions,
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
          buildExtraActions: extraActions,
          editableFields: ['label', 'description'],
        }}
      />
    );
  }
