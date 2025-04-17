import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import NodeTable from './NodeTable';                       // the generic table
import { IconButton, Tooltip } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader } from '@mui/material';
import Skeleton from '@mui/material/Skeleton';


/* -------------------------------- config for the member table -------------------------------- */
const memberColumns = linkPrefix => ([
  { field:'pk',       headerName:'PK',    width:90,
    renderCell:p => <Link to={`${linkPrefix}/${p.value}`}>{p.value}</Link> },
  { field:'ctime',    headerName:'Created', width:150 },
  { field:'node_type',headerName:'Type',    width:250 },
  { field:'label',    headerName:'Label',   width:250, editable:true },
  { field:'description', headerName:'Description', width:250, editable:true },
]);

/* optional: allow removing members from the group (delete icon)           */
function memberActions(row, { endpointBase, refetch }) {
  return (
    <Tooltip title="Remove from group">
      <IconButton color="error"
        onClick={() =>
          fetch(`${endpointBase}/delete/${row.pk}`, { method:'DELETE' })
            .then(r => r.json())
            .then(d => {
              if (d.deleted) toast.success(d.message);
              refetch();
            })
        }>
        <Delete/>
      </IconButton>
    </Tooltip>
  );
}

const editableFields = ['label','description'];

/* -------------------------------- component -------------------------------- */
export default function GroupNodeDetail() {
  const { pk } = useParams();                          // group PK from URL
  const [summary, setSummary] = useState(null);

  /* fetch the “basis summary info” once */
  useEffect(() => {
    fetch(`http://localhost:8000/api/groupnode/${pk}`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => toast.error('Failed to load group'));
  }, [pk]);

  /* endpoint for the member table */
  const endpointBase = useMemo(
    () => `http://localhost:8000/api/groupnode/${pk}/members`,
    [pk]
  );

  return (
    <div className="space-y-6 p-4">
      {/* ----- summary card ----- */}
      <Card>
      <h3 style={{ marginBottom: '10px' }}>{`Group ${pk}`}</h3>
  <CardContent>
    {!summary ? (
      <Skeleton variant="rectangular" height={96} width="100%" />
    ) : (
      <div>
        <div><b>Label:</b> {summary.label}</div>
        <div><b>Type string:</b> {summary.type_string}</div>
        <div><b>Nodes:</b> {summary.count}</div>
        <div><b>Description:</b> {summary.description || <em>–</em>}</div>
        </div>
    )}
  </CardContent>
</Card>

      {/* ----- member table ----- */}
      <NodeTable
        title=""
        endpointBase={endpointBase}       /* calls …/members-data & friends */
        linkPrefix="/datanode"           /* click through to the underlying node */
        config={{
          columns       : memberColumns,
          buildActions  : memberActions,  // or: () => null
          editableFields: editableFields,
        }}
      />
    </div>
  );
}
