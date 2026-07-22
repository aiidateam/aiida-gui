import { Link } from "react-router-dom";
import { IconButton, Tooltip } from "@mui/material";
import { Pause, PlayArrow, HighlightOff } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { toast } from "react-toastify";
import NodeTable from "./NodeTable";
import { NodeTableRow } from "../hooks/useNodeTable";

interface ProcessRow extends NodeTableRow {
  ctime?: string;
  node_type: string;
  process_label?: string;
  process_state?: string;
  process_status?: string;
  label?: string;
  description?: string;
  exit_status?: string | number;
  exit_message?: string;
  paused?: boolean;
}

export const processColumns = (
  linkPrefix?: string,
): GridColDef<ProcessRow>[] => [
  {
    field: "pk",
    headerName: "PK",
    width: 120,
    renderCell: ({ row, value }: GridRenderCellParams<ProcessRow>) => {
      const typeKey = row.node_type.toLowerCase();

      let prefix = "/process";
      if (typeKey.endsWith("workchainnode.")) {
        prefix = "/workchain";
      } else if (typeKey.endsWith("workfunctionnode.")) {
        prefix = "/workchain";
      } else if (typeKey.endsWith("workgraphnode.")) {
        prefix = "/workgraph";
      }

      return <Link to={`${prefix}/${value}`}>{value}</Link>;
    },
  },
  { field: "ctime", headerName: "Created", width: 150 },
  {
    field: "process_label",
    headerName: "Process label",
    width: 260,
    sortable: false,
  },
  {
    field: "process_state",
    headerName: "State",
    width: 140,
    sortable: false,
    renderCell: ({ row }: GridRenderCellParams<ProcessRow>) => {
      const { process_state, exit_status } = row;
      let color = "inherit";

      switch (process_state) {
        case "Finished": {
          const statusCode = Number.parseInt(String(exit_status), 10);
          color = !Number.isNaN(statusCode) && statusCode > 0 ? "red" : "green";
          return (
            <span style={{ color }}>
              {process_state} [{exit_status}]
            </span>
          );
        }
        case "Excepted":
        case "Failed":
          color = "red";
          break;
        case "Running":
          color = "blue";
          break;
        case "Waiting":
          color = "orange";
          break;
        default:
          color = "inherit";
      }

      return <span style={{ color }}>{process_state}</span>;
    },
  },
  {
    field: "process_status",
    headerName: "Status",
    width: 140,
    sortable: false,
  },
  { field: "label", headerName: "Label", width: 220, editable: true },
  {
    field: "description",
    headerName: "Description",
    width: 240,
    editable: true,
  },
  { field: "exit_status", headerName: "Exit status", sortable: false },
  {
    field: "exit_message",
    headerName: "Exit message",
    width: 240,
    sortable: false,
  },
  {
    field: "paused",
    headerName: "Paused",
    width: 100,
    renderCell: ({ value }: GridRenderCellParams<ProcessRow>) =>
      value ? "Yes" : "No",
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

export function extraProcessActions(
  row: ProcessRow,
  { actionBase, refetch, openConfirmModal }: ActionHelpers,
) {
  const post = (url: string) =>
    fetch(url, { method: "POST" }).then(() => refetch());

  const buttons: React.ReactNode[] = [];

  if (row.paused) {
    buttons.push(
      <Tooltip title="Resume" key="resume">
        <IconButton
          color="success"
          onClick={() => post(`${actionBase}/play/${row.pk}`)}
        >
          <PlayArrow />
        </IconButton>
      </Tooltip>,
    );
  }

  if (["Running", "Waiting"].includes(row.process_state ?? "")) {
    if (!row.paused) {
      buttons.push(
        <Tooltip title="Pause" key="pause">
          <IconButton onClick={() => post(`${actionBase}/pause/${row.pk}`)}>
            <Pause />
          </IconButton>
        </Tooltip>,
      );
    }

    buttons.push(
      <Tooltip title="Kill" key="kill">
        <IconButton
          color="error"
          onClick={() =>
            openConfirmModal(
              "Confirm kill",
              <p>
                Kill process PK {row.pk}?
                <br />
                <b>This action is irreversible.</b>
              </p>,
              () =>
                post(`${actionBase}/kill/${row.pk}`)
                  .then(() => toast.success(`Killed PK ${row.pk}`))
                  .catch(() => toast.error("Kill failed")),
            )
          }
        >
          <HighlightOff />
        </IconButton>
      </Tooltip>,
    );
  }

  return <>{buttons}</>;
}

export function ProcessTable() {
  return (
    <NodeTable<ProcessRow>
      title="Process nodes"
      endpointBase="/api/process"
      linkPrefix="/process"
      actionBase="/api/process"
      config={{
        columns: processColumns,
        buildExtraActions: extraProcessActions,
        editableFields: ["label", "description"],
      }}
    />
  );
}
