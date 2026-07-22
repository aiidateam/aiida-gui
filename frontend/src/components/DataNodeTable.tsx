import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import NodeTable from "./NodeTable";
import { NodeTableRow } from "../hooks/useNodeTable";

interface DataNodeRow extends NodeTableRow {
  ctime?: string;
  node_type?: string;
  label?: string;
  description?: string;
}

const dataColumns = (linkPrefix?: string): GridColDef<DataNodeRow>[] => [
  {
    field: "pk",
    headerName: "PK",
    width: 90,
    renderCell: (params: GridRenderCellParams<DataNodeRow>) => (
      <a href={`${linkPrefix}/${params.value}`}>{params.value}</a>
    ),
  },
  { field: "ctime", headerName: "Created", width: 150 },
  { field: "node_type", headerName: "Type", width: 250 },
  { field: "label", headerName: "Label", width: 250, editable: true },
  {
    field: "description",
    headerName: "Description",
    width: 250,
    editable: true,
  },
];

export default function DataNodeTable() {
  return (
    <NodeTable<DataNodeRow>
      title="Data nodes"
      endpointBase="/api/datanode"
      linkPrefix="/datanode"
      config={{
        columns: dataColumns,
        editableFields: ["label", "description"],
      }}
    />
  );
}
