import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import useConnectForm from "./useConnectForm";
import ConnectNotification from "./ConnectNotification";
import useConnectNotification from "./useConnectNotification";

/**
 * Form in the connect section
 * @returns {JSX.Element}
 */
const ConnectForm = () => {
  const {
    setName,
    setEmail,
    setMessage,
    sendMessage,
    name,
    email,
    message,
    validateForm,
  } = useConnectForm();

  const { open, setOpen, setClose, messageSent, setMessageSent } =
    useConnectNotification();
  const formErrors = validateForm(name, email, message);
  const theme = useTheme();
  const largeMobile = useMediaQuery(theme.breakpoints.down(425));

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
      <Stack spacing={1} width={"100%"}>
        <Typography
          variant="h3"
          component="h2"
          sx={{
            fontSize: largeMobile ? "1.5rem" : "2rem",
            textAlign: "start",
            width: "100%",
            flexWrap: "nowrap",
          }}
        >
          Leave a message!
        </Typography>
        {formErrors && (
          <Typography variant="body1" component="h3" color={"rgb(244, 67, 54)"}>
            {formErrors}*
          </Typography>
        )}
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
          placeholder="Hey Alex, I'm interested in your work. I would love to connect and work together!"
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          variant="contained"
          disabled={formErrors.length ? true : false}
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
