// GroupNodeTable.js
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


export default () =>
  <NodeTable
    title="Group nodes"
    endpointBase="http://localhost:8000/api/groupnode"
    linkPrefix="/groupnode"
    config={{
      columns       : groupColumns,
      editableFields: ['label', 'description'],
      includeDeleteGroupNodesOption: true,
    }}
  />;
