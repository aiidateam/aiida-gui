import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import NodeTable from './NodeTable';
import { IconButton, Tooltip } from '@mui/material';
import { RemoveCircleOutline } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { Card, CardContent } from '@mui/material';
import Skeleton from '@mui/material/Skeleton';

/* -------------------------------- dynamic columns for members -------------------------------- */
const memberColumns = () => ([
  {
    field: 'pk',
    headerName: 'PK',
    width: 120,
    renderCell: ({ row, value }) => {
      const typeKey = row.node_type.toLowerCase();
      let prefix = '';

      if (typeKey.startsWith('data')) {
        prefix = '/datanode';
      } else {
        // process node, refine based on the suffix
        if (typeKey.endsWith('workgraphnode.')) {
          prefix = '/workgraph';
        } else if (typeKey.endsWith('workchainnode.')) {
          prefix = '/workchain';
        } else {
          prefix = '/process';
        }
      }

      return <Link to={`${prefix}/${value}`}>{value}</Link>;
    }
  },
  { field: 'ctime', headerName: 'Created', width: 160 },
  { field: 'node_type', headerName: 'Type', width: 200 },
  { field: 'label', headerName: 'Label', width: 220, editable: true },
  { field: 'description', headerName: 'Description', width: 260, editable: true },
]);

/* -------------------------------- remove-from-group action with confirmation -------------------------------- */
function memberActions(row, { actionBase, refetch, openConfirmModal }) {
  const handleRemove = () => {
    openConfirmModal(
      'Confirm Removal',
      <p>
        Remove node PK {row.pk} from this group? <br/>
        <b>You can add it back later if needed.</b>
      </p>,
      () => {
        const url = `${actionBase}/remove/${row.pk}`;
        console.log('removing', url);
        fetch(url, { method: 'DELETE' })
          .then(r => r.json())
          .then(d => {
            if (d.removed) toast.success(d.message);
            else throw new Error('Remove failed');
          })
          .catch(err => toast.error(err.message || 'Remove failed'))
          .finally(() => refetch());
      }
    );
  };

  return (
    <Tooltip title="Remove from group">
      <IconButton color="warning" onClick={handleRemove}>
        <RemoveCircleOutline />
      </IconButton>
    </Tooltip>
  );
}

const editableFields = ['label', 'description'];

export default function GroupNodeDetail() {
  const { pk } = useParams();
  const [summary, setSummary] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalBody, setModalBody] = useState(null);
  const [onConfirm, setOnConfirm] = useState(() => () => {});

  // confirm modal helpers passed down via NodeTable
  const openConfirmModal = (title, body, confirmFn) => {
    setModalTitle(title);
    setModalBody(body);
    setOnConfirm(() => confirmFn);
    setModalOpen(true);
  };

  useEffect(() => {
    fetch(`http://localhost:8000/api/groupnode/${pk}`)
    .then(async (r) => {
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(`HTTP ${r.status} - ${errorText}`);
      }
      return r.json();
    })
    .then(setSummary)
    .catch((err) => {
      console.error('Error loading group:', err);
      toast.error(`Failed to load group: ${err.message}`);
    });
  }, [pk]);

  const endpointBase = useMemo(
    () => `http://localhost:8000/api/groupnode/${pk}/members`,
    [pk]
  );

  return (
    <div className="space-y-6 p-4">
      <Card>
        <h3 style={{ marginBottom: 10 }}>{`Group ${pk}`}</h3>
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

      <NodeTable
        title=""
        endpointBase={endpointBase}
        actionBase={endpointBase}
        config={{
          columns: memberColumns,
          buildExtraActions: memberActions,
          editableFields,
          includeDeleteButton: false,
        }}
        openConfirmModal={openConfirmModal}
        modalOpen={modalOpen}
        modalTitle={modalTitle}
        modalBody={modalBody}
        onModalConfirm={() => {
          onConfirm();
          setModalOpen(false);
        }}
        onModalClose={() => setModalOpen(false)}
      />
    </div>
  );
}
