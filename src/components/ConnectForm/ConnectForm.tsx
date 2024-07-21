import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import useConnectForm from "./useConnectForm";
import ConnectNotification from "./ConnectNotification";
import useConnectNotification from "./useConnectNotification";

/**
 * Form in the connect section
 * @returns {JSX.Element}
 */
const ConnectForm = () => {
  const { setName, setEmail, setMessage, sendMessage, name, email, message } =
    useConnectForm();
  const { open, setOpen, setClose } = useConnectNotification();

  return (
    <Stack spacing={1}>
      <Typography variant="h5" component="h1">
        Lets Work Together!
      </Typography>
      <Box sx={{ width: "100%", display: "flex", gap: 1 }}>
        <TextField
          label="Name"
          placeholder="John Doe"
          required
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Email"
          placeholder="email@example.com"
          required
          onChange={(e) => setEmail(e.target.value)}
        />
      </Box>
      <TextField
        label="Message"
        multiline
        rows={4}
        placeholder="Type your message here..."
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button
        variant="contained"
        disabled={name && email ? false : true}
        onClick={sendMessage}
      >
        Send
      </Button>
      <ConnectNotification open={open} setClose={setClose} />
    </Stack>
  );
};

export default ConnectForm;
