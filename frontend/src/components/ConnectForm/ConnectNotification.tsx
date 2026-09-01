import { Alert, Snackbar } from '@mui/material';

interface ConnectNotificationProps {
  open: boolean;
  setClose: () => void;
  messageSent: boolean;
  message: string;
}

const ConnectNotification = ({
  open,
  setClose,
  messageSent,
  message,
}: ConnectNotificationProps) => {
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      open={open}
      autoHideDuration={6000}
      onClose={setClose}
      sx={{ mr: 5, mb: 3 }}
    >
      <Alert
        variant="filled"
        onClose={setClose}
        // No `severity` used to mean MUI defaulted to `success`, so a failed
        // submit rendered the success checkmark next to a manually reddened
        // background (Portfolio#41). Passing `severity` supplies both the
        // color and the matching icon from the same source, so they can't
        // disagree again.
        severity={messageSent ? 'success' : 'error'}
        sx={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default ConnectNotification;
