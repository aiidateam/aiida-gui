import { useState } from "react";
import {
  DataGrid,
  GridToolbar,
  gridPageCountSelector,
  gridPageSelector,
  gridPageSizeSelector,
  useGridApiContext,
  useGridSelector,
} from "@mui/x-data-grid";
import type {
  GridColDef,
  GridRenderCellParams,
  GridRowModel,
  GridColumnVisibilityModel,
} from "@mui/x-data-grid";
import {
  Pagination,
  Box,
  Select,
  MenuItem,
  Typography,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import useNodeTable, { NodeTableRow } from "../hooks/useNodeTable";
import { ConfirmDeleteModal } from "./Modals";

function MuiFooter() {
  const apiRef = useGridApiContext();
  const page = useGridSelector(apiRef, gridPageSelector);
  const count = useGridSelector(apiRef, gridPageCountSelector);
  const pageSize = useGridSelector(apiRef, gridPageSizeSelector);
  const pageSizes = [15, 30, 100];

  return (
    <Box sx={{ display: "flex", alignItems: "center", p: 1, gap: 1 }}>
      <Typography variant="body2">Rows per page:</Typography>
      <Select
        size="small"
        value={pageSize}
        onChange={(event) =>
          apiRef.current.setPageSize(Number(event.target.value))
        }
        sx={{ minWidth: 80 }}
      >
        {pageSizes.map((size) => (
          <MenuItem key={size} value={size}>
            {size}
          </MenuItem>
        ))}
      </Select>
      <Pagination
        page={page + 1}
        count={count}
        onChange={(_, value) => apiRef.current.setPage(value - 1)}
        color="primary"
        showFirstButton
        showLastButton
      />
    </Box>
  );
}

interface ActionHelpers {
  actionBase?: string;
  refetch: () => void;
  openConfirmModal: (
    title: string,
    body: React.ReactNode,
    confirmFn: () => void,
  ) => void;
}

interface NodeTableConfig<RowType extends NodeTableRow> {
  columns: (linkPrefix?: string) => GridColDef<RowType>[];
  buildExtraActions?: (row: RowType, helpers: ActionHelpers) => React.ReactNode;
  editableFields?: string[];
  includeDeleteGroupNodesOption?: boolean;
  includeDeleteButton?: boolean;
}

interface NodeTableProps<RowType extends NodeTableRow> {
  title: string;
  endpointBase: string;
  linkPrefix?: string;
  actionBase?: string;
  config: NodeTableConfig<RowType>;
}

export default function NodeTable<RowType extends NodeTableRow>({
  title,
  endpointBase,
  linkPrefix,
  actionBase,
  config,
}: NodeTableProps<RowType>) {
  const {
    rows,
    rowCount,
    pagination,
    setPagination,
    columnVisibilityModel,
    setColumnVisibilityModel,
    sortModel,
    setSortModel,
    filterModel,
    setFilter,
    refetch,
  } = useNodeTable<RowType>(endpointBase);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>("Confirm deletion");
  const [modalBody, setModalBody] = useState<React.ReactNode>(null);
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => undefined);
  const [deleteGroupNodes, setDeleteGroupNodes] = useState(false);

  const openConfirmModal = (
    title: string,
    body: React.ReactNode,
    confirmFn: () => void,
  ) => {
    setModalTitle(title);
    setModalBody(body);
    setOnConfirm(() => confirmFn);
    setModalOpen(true);
  };

  const processRowUpdate = async (
    newRow: GridRowModel<RowType>,
    oldRow: GridRowModel<RowType>,
  ) => {
    const diff: Record<string, unknown> = {};
    for (const field of config.editableFields ?? []) {
      if (newRow[field] !== oldRow[field]) {
        diff[field] = newRow[field];
      }
    }

    if (!Object.keys(diff).length) {
      return oldRow;
    }

    try {
      const response = await fetch(`${endpointBase}-data/${newRow.pk}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diff),
      });

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Update failed");
      }

      toast.success(`Saved PK ${newRow.pk}`);
      return newRow;
    } catch (error) {
      toast.error(`Save failed - ${(error as Error).message}`);
      return oldRow;
    }
  };

  const askDelete = (row: RowType, refetchLocal: () => void) => {
    fetch(`${endpointBase}/delete/${row.pk}?dry_run=True`, { method: "DELETE" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Delete preview failed");
        }
        return response.json() as Promise<{ deleted_nodes: number[] }>;
      })
      .then(({ deleted_nodes: deletedNodes }) => {
        const deps = deletedNodes.filter((pk) => pk !== row.pk);

        let body: React.ReactNode = (
          <p>
            Delete PK {row.pk} and {deps.length} dependents?{" "}
            <b>The deletion is irreversible.</b>
            <br />
            <br />
            {deps.join(", ")}
          </p>
        );

        if (config.includeDeleteGroupNodesOption) {
          body = (
            <>
              {body}
              <FormControlLabel
                sx={{ mt: 2 }}
                control={
                  <Checkbox
                    onChange={(event) =>
                      setDeleteGroupNodes(event.target.checked)
                    }
                  />
                }
                label="Also delete all nodes in this group"
              />
            </>
          );
        }

        const confirmFn = () => {
          const url =
            `${endpointBase}/delete/${row.pk}` +
            (config.includeDeleteGroupNodesOption && deleteGroupNodes
              ? "?delete_nodes=True"
              : "");

          fetch(url, { method: "DELETE" })
            .then(
              async (response) =>
                response.json() as Promise<{
                  deleted?: boolean;
                  message?: string;
                }>,
            )
            .then(({ deleted, message }) => {
              if (deleted) {
                toast.success(message ?? "Deleted successfully");
              } else {
                toast.error("Delete failed");
              }
            })
            .finally(() => {
              refetchLocal();
            });
        };

        openConfirmModal("Confirm deletion", body, confirmFn);
      })
      .catch(() => toast.error("Could not fetch delete preview"));
  };

  const columns: GridColDef<RowType>[] = [
    ...config.columns(linkPrefix),
    {
      field: "actions",
      headerName: "Actions",
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<RowType>) => (
        <>
          {config.buildExtraActions?.(params.row, {
            actionBase,
            refetch,
            openConfirmModal,
          })}
          {(config.includeDeleteButton ?? true) ? (
            <Tooltip title="Delete">
              <IconButton
                color="error"
                onClick={() => askDelete(params.row, refetch)}
              >
                <Delete />
              </IconButton>
            </Tooltip>
          ) : null}
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: "1rem" }}>
      <h2>{title}</h2>

      <DataGrid
        rows={rows}
        rowCount={rowCount}
        getRowId={(row) => row.pk}
        paginationMode="server"
        sortingMode="server"
        filterMode="server"
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        sortModel={sortModel}
        onSortModelChange={setSortModel}
        filterModel={filterModel}
        onFilterModelChange={setFilter}
        pageSizeOptions={[15, 30, 50]}
        columns={columns}
        columnVisibilityModel={
          columnVisibilityModel as GridColumnVisibilityModel
        }
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        editMode="cell"
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={(error) =>
          toast.error((error as Error).message)
        }
        sortingOrder={["desc", "asc"]}
        slots={{ pagination: MuiFooter, toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        autoHeight
      />

      <ToastContainer autoClose={3000} />

      <ConfirmDeleteModal
        open={modalOpen}
        title={modalTitle}
        body={modalBody}
        onClose={() => setModalOpen(false)}
        onConfirm={() => {
          onConfirm();
          setModalOpen(false);
        }}
      />
    </div>
  );
}
