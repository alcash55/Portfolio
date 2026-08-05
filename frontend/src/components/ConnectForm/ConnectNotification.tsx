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
        sx={{
          display: 'flex',
          alignItems: 'center',
          bgcolor: messageSent ? 'rgb(56, 142, 60)' : 'rgb(211, 47, 47)',
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
