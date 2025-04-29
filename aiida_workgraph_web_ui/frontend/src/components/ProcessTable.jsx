import { IconButton, Tooltip } from '@mui/material';
import { Pause, PlayArrow, HighlightOff } from '@mui/icons-material';
import { toast } from 'react-toastify';       // NEW
import NodeTable from './NodeTable';
import { Link } from 'react-router-dom';


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
  { field:'paused',        headerName:'Paused', width:100,
    renderCell:({ value }) => value ? 'Yes' : 'No' },
]);


/* pause / play / kill buttons – now with confirmation for “Kill” */
export function extraActions(row, { actionBase, refetch, openConfirmModal }) {
  const post = url => fetch(url, { method:'POST' }).then(() => refetch());

  const buttons = [];

  if (row.paused) {
    buttons.push(
      <Tooltip title="Resume" key="resume">
        <IconButton color="success" onClick={() => post(`${actionBase}/play/${row.pk}`)}>
          <PlayArrow/>
        </IconButton>
      </Tooltip>
    );
  }

  if (['Running', 'Waiting'].includes(row.process_state)) {
    if (!row.paused) {
      buttons.push(
        <Tooltip title="Pause" key="pause">
          <IconButton onClick={() => post(`${actionBase}/pause/${row.pk}`)}>
            <Pause/>
          </IconButton>
        </Tooltip>
      );
    }
    buttons.push(
      <Tooltip title="Kill" key="kill">
        <IconButton
          color="error"
          onClick={() =>
            openConfirmModal(
              <p>
                Kill&nbsp;process&nbsp;PK&nbsp;{row.pk}?<br/>
                <b>This action is irreversible.</b>
              </p>,
              () =>
                post(`${actionBase}/kill/${row.pk}`)
                  .then(() => toast.success(`Killed PK ${row.pk}`))
                  .catch(() => toast.error('Kill failed'))
            )
          }
        >
          <HighlightOff/>
        </IconButton>
      </Tooltip>
    );
  }

  return <>{buttons}</>;
}

export function ProcessTable() {
    return (
      <NodeTable
        title="Process nodes"
        endpointBase="http://localhost:8000/api/process"
        linkPrefix="/process"
        actionBase={`http://localhost:8000/api/process`}
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
        actionBase={`http://localhost:8000/api/process`}
        config={{
          columns       : processColumns,
          buildExtraActions: extraActions,
          editableFields: ['label', 'description'],
        }}
      />
    );
  }
