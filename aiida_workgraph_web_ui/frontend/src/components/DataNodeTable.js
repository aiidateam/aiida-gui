import NodeTable from './NodeTable';

const dataColumns = linkPrefix => ([
  { field:'pk', headerName:'PK', width:90,
    renderCell:p => <a href={`${linkPrefix}/${p.value}`}>{p.value}</a> },
  { field:'ctime',     headerName:'Created', width:150 },
  { field:'node_type', headerName:'Type',    width:250 },
  { field:'label',      headerName:'Label',       width:250, editable:true },
  { field:'description',headerName:'Description', width:250, editable:true },
]);


export default () =>
  <NodeTable
    title="Data nodes"
    endpointBase="http://localhost:8000/api/datanode"
    linkPrefix="/datanode"
    config={{
      columns       : dataColumns,
      editableFields: ['label', 'description'],
    }}
  />;
