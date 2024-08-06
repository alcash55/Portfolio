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

  const { open, setOpen, setClose, messageSent, setMessageSent } =
    useConnectNotification();

  const handleClick = async () => {
    const message = await sendMessage();

    if (!message) {
      setMessageSent(false);
    } else {
      setMessageSent(true);
    }
    setOpen(true);
  };

  return (
    <>
      <Stack spacing={1}>
        <Typography variant="h5" component="h1">
          Lets Work Together!
        </Typography>
        <Box sx={{ width: "100%", display: "flex", gap: 1 }}>
          <TextField
            id="name"
            label="Name"
            placeholder="John Doe"
            autoComplete="name"
            required
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            id="email"
            label="Email"
            placeholder="email@example.com"
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </Box>
        <TextField
          id="message"
          label="Message"
          required
          multiline
          rows={4}
          placeholder="Type your message here..."
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          variant="contained"
          disabled={name && email && message ? false : true}
          onClick={handleClick}
        >
          Send
        </Button>
      </Stack>
      <ConnectNotification
        open={open}
        setClose={setClose}
        messageSent={messageSent}
      />
    </>
  );
};

export default ConnectForm;
