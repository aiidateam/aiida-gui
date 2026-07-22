import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import NodeTable from "./NodeTable";
import { NodeTableRow } from "../hooks/useNodeTable";

interface GroupNodeRow extends NodeTableRow {
  ctime?: string;
  label?: string;
  description?: string;
}

const groupColumns = (linkPrefix?: string): GridColDef<GroupNodeRow>[] => [
  {
    field: "pk",
    headerName: "PK",
    width: 90,
    renderCell: (params: GridRenderCellParams<GroupNodeRow>) => (
      <a href={`${linkPrefix}/${params.value}`}>{params.value}</a>
    ),
  },
  { field: "ctime", headerName: "Created", width: 150 },
  { field: "label", headerName: "Label", width: 250, editable: true },
  {
    field: "description",
    headerName: "Description",
    width: 250,
    editable: true,
  },
];

export default function GroupNodeTable() {
  return (
    <NodeTable<GroupNodeRow>
      title="Group nodes"
      endpointBase="/api/groupnode"
      linkPrefix="/groupnode"
      config={{
        columns: groupColumns,
        editableFields: ["label", "description"],
        includeDeleteGroupNodesOption: true,
      }}
    />
  );
}
