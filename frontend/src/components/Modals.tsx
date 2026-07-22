import type { ReactNode } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

interface ConfirmDeleteModalProps {
  open: boolean;
  title?: string;
  body: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  open,
  title,
  body,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title || "Confirm deletion"}</DialogTitle>
      <DialogContent dividers>{body}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
