// pages/DataNodeTable.jsx
import { IconButton, Tooltip } from '@mui/material';
import { Delete } from '@mui/icons-material';
import NodeTable from '../components/NodeTable';

const groupColumns = linkPrefix => ([
  { field:'pk', headerName:'PK', width:90,
    renderCell:p => <a href={`${linkPrefix}/${p.value}`}>{p.value}</a> },
  { field:'ctime',     headerName:'Created', width:150 },
  { field:'label',      headerName:'Label',       width:250, editable:true },
  { field:'description',headerName:'Description', width:250, editable:true },
]);

const groupActions = (row, { endpointBase, refetch }) => (
  <Tooltip title="Delete"><IconButton color="error"
    onClick={() => fetch(`${endpointBase}/delete/${row.pk}`, { method:'DELETE' })
                    .then(refetch)}><Delete/></IconButton></Tooltip>
);

export default () =>
  <NodeTable
    title="Group nodes"
    endpointBase="http://localhost:8000/api/groupnode"
    linkPrefix="/groupnode"
    config={{
      columns       : groupColumns,
      buildActions  : groupActions,
      editableFields: ['label', 'description'],
    }}
  />;
