import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

export function ConfirmDeleteModal({ open, body, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm deletion</DialogTitle>
      <DialogContent dividers>{body}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
}
