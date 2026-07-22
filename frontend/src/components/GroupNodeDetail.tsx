import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { IconButton, Tooltip, Card, CardContent } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import { RemoveCircleOutlined } from "@mui/icons-material";
import { toast } from "react-toastify";

import NodeTable from "./NodeTable";
import { NodeTableRow } from "../hooks/useNodeTable";

interface GroupSummary {
  label?: string;
  type_string?: string;
  count?: number;
  description?: string;
}

interface GroupMemberRow extends NodeTableRow {
  ctime?: string;
  node_type: string;
  label?: string;
  description?: string;
}

const memberColumns = (): GridColDef<GroupMemberRow>[] => [
  {
    field: "pk",
    headerName: "PK",
    width: 120,
    renderCell: ({ row, value }: GridRenderCellParams<GroupMemberRow>) => {
      const typeKey = row.node_type.toLowerCase();
      let prefix = "";

      if (typeKey.startsWith("data")) {
        prefix = "/datanode";
      } else if (typeKey.endsWith("workgraphnode.")) {
        prefix = "/workgraph";
      } else if (typeKey.endsWith("workchainnode.")) {
        prefix = "/workchain";
      } else {
        prefix = "/process";
      }

      return <Link to={`${prefix}/${value}`}>{value}</Link>;
    },
  },
  { field: "ctime", headerName: "Created", width: 160 },
  { field: "node_type", headerName: "Type", width: 200 },
  { field: "label", headerName: "Label", width: 220, editable: true },
  {
    field: "description",
    headerName: "Description",
    width: 260,
    editable: true,
  },
];

interface ActionHelpers {
  actionBase?: string;
  refetch: () => void;
  openConfirmModal: (
    title: string,
    body: React.ReactNode,
    confirmFn: () => void,
  ) => void;
}

function memberActions(
  row: GroupMemberRow,
  { actionBase, refetch, openConfirmModal }: ActionHelpers,
) {
  const handleRemove = () => {
    openConfirmModal(
      "Confirm Removal",
      <p>
        Remove node PK {row.pk} from this group?
        <br />
        <b>You can add it back later if needed.</b>
      </p>,
      () => {
        const url = `${actionBase}/remove/${row.pk}`;
        fetch(url, { method: "DELETE" })
          .then(async (response) => {
            const data = (await response.json()) as {
              removed?: boolean;
              message?: string;
            };
            if (data.removed) {
              toast.success(data.message || "Node removed");
              return;
            }
            throw new Error(data.message || "Remove failed");
          })
          .catch((error: Error) =>
            toast.error(error.message || "Remove failed"),
          )
          .finally(() => refetch());
      },
    );
  };

  return (
    <Tooltip title="Remove from group">
      <IconButton color="warning" onClick={handleRemove}>
        <RemoveCircleOutlined />
      </IconButton>
    </Tooltip>
  );
}

const editableFields = ["label", "description"];

export default function GroupNodeDetail() {
  const { pk } = useParams();
  const [summary, setSummary] = useState<GroupSummary | null>(null);

  useEffect(() => {
    if (!pk) {
      return;
    }
    fetch(`/api/groupnode/${pk}`)
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status} - ${errorText}`);
        }
        return response.json() as Promise<GroupSummary>;
      })
      .then(setSummary)
      .catch((error) => {
        console.error("Error loading group:", error);
        toast.error(`Failed to load group: ${error.message}`);
      });
  }, [pk]);

  const endpointBase = useMemo(() => `/api/groupnode/${pk}/members`, [pk]);

  return (
    <div className="space-y-6 p-4">
      <Card>
        <h3 style={{ marginBottom: 10 }}>{`Group ${pk}`}</h3>
        <CardContent>
          {!summary ? (
            <Skeleton variant="rectangular" height={96} width="100%" />
          ) : (
            <div>
              <div>
                <b>Label:</b> {summary.label}
              </div>
              <div>
                <b>Type string:</b> {summary.type_string}
              </div>
              <div>
                <b>Nodes:</b> {summary.count}
              </div>
              <div>
                <b>Description:</b> {summary.description || <em>-</em>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NodeTable<GroupMemberRow>
        title=""
        endpointBase={endpointBase}
        actionBase={endpointBase}
        config={{
          columns: memberColumns,
          buildExtraActions: memberActions,
          editableFields,
          includeDeleteButton: false,
        }}
      />
    </div>
  );
}
