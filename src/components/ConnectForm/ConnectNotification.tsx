import { Alert, Snackbar } from "@mui/material";

interface ConnectNotificationProps {
  open: boolean;
  setClose: () => void;
}

const ConnectNotification = ({ open, setClose }: ConnectNotificationProps) => {
  return (
    <Snackbar
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      open={open}
      autoHideDuration={5000}
      onClose={setClose}
    >
      <Alert variant="outlined" severity="success" onAbort={setClose}>
        Message sent successfully!
      </Alert>
    </Snackbar>
  );
};

export default ConnectNotification;
