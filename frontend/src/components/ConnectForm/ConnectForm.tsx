import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import useConnectForm from './useConnectForm';
import ConnectNotification from './ConnectNotification';
import useConnectNotification from './useConnectNotification';
import { CONTACT_SUCCESS_MESSAGE, getContactErrorMessage } from './contactErrors';
import { ANALYTICS_EVENTS, useAnalytics } from '../../hooks/useAnalytics';

// Don't show the slow-request copy for a normal-latency request: it's alarming
// to see it flash by on a request that resolves in 200ms. Only switch to it
// once the request has genuinely been hanging for a while.
//
// The wording deliberately does not mention the hosting plan. `keep-alive.yml`
// pings the API every 10 minutes to stop Render spinning it down, so a cold
// start is already mitigated. It is not eliminated, because GitHub queues
// scheduled runs and can delay them, so the hint still earns its place.
const COLD_START_HINT_DELAY_MS = 4000;

/**
 * Form in the connect section
 * @returns {JSX.Element}
 */
const ConnectForm = () => {
  const capture = useAnalytics();
  const {
    setName,
    setEmail,
    setMessage,
    setWebsite,
    sendMessage,
    name,
    email,
    message,
    website,
    validateForm,
    getFieldErrors,
  } = useConnectForm();

  // Refs to the underlying <input>/<textarea> elements so an attempted
  // submit while invalid can move focus to the first field that needs
  // fixing, instead of leaving a keyboard user stranded on Send.
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const {
    open,
    setOpen,
    setClose,
    messageSent,
    setMessageSent,
    notificationText,
    setNotificationText,
  } = useConnectNotification();
  const formErrors = validateForm(name, email, message);
  const fieldErrors = getFieldErrors(name, email, message);
  // Tracked per-field so a field only shows its own error once the user has
  // interacted with that specific field -- not the moment any other field
  // is touched.
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [showColdStartHint, setShowColdStartHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const theme = useTheme();
  const largeMobile = useMediaQuery(theme.breakpoints.down(425));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (sending) return;

    if (formErrors) {
      // Reveal every field's error on an attempted submit, not just the
      // ones the user happened to already touch.
      setNameTouched(true);
      setEmailTouched(true);
      setMessageTouched(true);
      // Send stays focusable while invalid (see the button below), so an
      // activation while invalid can land here from mouse or keyboard.
      // Surface the validation state by moving focus to the first invalid
      // field, in the same name -> email -> message priority validateForm
      // uses, rather than doing nothing.
      const firstInvalidRef = fieldErrors.name
        ? nameInputRef
        : fieldErrors.email
          ? emailInputRef
          : messageInputRef;
      firstInvalidRef.current?.focus();
      return;
    }

    setSending(true);
    setShowColdStartHint(false);
    hintTimerRef.current = setTimeout(() => setShowColdStartHint(true), COLD_START_HINT_DELAY_MS);

    try {
      const result = await sendMessage();

      if (result.ok) {
        // Only on an accepted submission, never on attempt. A count that
        // includes failed sends measures the backend's uptime, not whether
        // anyone actually got in touch.
        capture(ANALYTICS_EVENTS.CONTACT_SUBMITTED);
        setMessageSent(true);
        setNotificationText(CONTACT_SUCCESS_MESSAGE);
        setName('');
        setEmail('');
        setMessage('');
        setWebsite('');
        setNameTouched(false);
        setEmailTouched(false);
        setMessageTouched(false);
      } else {
        setMessageSent(false);
        setNotificationText(getContactErrorMessage(result.kind));
      }
    } finally {
      clearTimeout(hintTimerRef.current);
      setShowColdStartHint(false);
      setSending(false);
      setOpen(true);
    }
  };

  return (
    <>
      <Stack
        component="form"
        noValidate
        onSubmit={handleSubmit}
        spacing={1}
        sx={{
          width: '100%',
        }}
      >
        <Typography
          variant="h3"
          component="h3"
          sx={{
            fontSize: largeMobile ? '1.5rem' : '2rem',
            textAlign: 'start',
            width: '100%',
            flexWrap: 'nowrap',
          }}
        >
          Leave a message!
        </Typography>
        <Box sx={{ width: '100%', display: 'flex', gap: 1 }}>
          <TextField
            id="name"
            label="Name"
            placeholder="John Doe"
            autoComplete="name"
            required
            value={name}
            error={nameTouched && !!fieldErrors.name}
            helperText={nameTouched && fieldErrors.name ? fieldErrors.name : ' '}
            onChange={(e) => {
              setNameTouched(true);
              setName(e.target.value);
            }}
            inputRef={nameInputRef}
          />
          <TextField
            id="email"
            label="Email"
            placeholder="email@example.com"
            autoComplete="email"
            required
            value={email}
            error={emailTouched && !!fieldErrors.email}
            helperText={emailTouched && fieldErrors.email ? fieldErrors.email : ' '}
            onChange={(e) => {
              setEmailTouched(true);
              setEmail(e.target.value);
            }}
            inputRef={emailInputRef}
          />
        </Box>
        <TextField
          id="message"
          label="Message"
          required
          multiline
          rows={4}
          placeholder="Hey Alex, I'm interested in your work. I would love to connect and work together!"
          value={message}
          error={messageTouched && !!fieldErrors.message}
          helperText={messageTouched && fieldErrors.message ? fieldErrors.message : ' '}
          onChange={(e) => {
            setMessageTouched(true);
            setMessage(e.target.value);
          }}
          inputRef={messageInputRef}
        />
        {/* Honeypot (F3): a real bot fills every input it finds; a human never
            sees or reaches this one. Hidden with off-screen CSS positioning
            (not display:none/hidden, which some bots skip), and removed from
            the tab order and the accessibility tree. Always submitted -- left
            empty, it's a no-op; left non-empty, the backend silently drops
            the message instead of forwarding it to Discord. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
        />
        <Button
          type="submit"
          variant="contained"
          // Native `disabled` is reserved for the transient "request in
          // flight" state, where removing Send from the tab order for a
          // moment is expected. While the form is merely invalid, Send stays
          // focusable (aria-disabled, not disabled) so a keyboard user
          // tabbing an empty form still reaches it -- activating it while
          // invalid reveals the field errors and moves focus to the first
          // one (see handleSubmit) instead of doing nothing. An invalid form
          // still cannot be submitted; it just no longer disappears.
          disabled={sending}
          aria-disabled={formErrors && !sending ? true : undefined}
          sx={
            formErrors && !sending
              ? {
                  backgroundColor: (theme) => theme.palette.action.disabledBackground,
                  color: (theme) => theme.palette.action.disabled,
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: (theme) => theme.palette.action.disabledBackground,
                    boxShadow: 'none',
                  },
                }
              : undefined
          }
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {sending ? (showColdStartHint ? 'Waking up the server…' : 'Sending…') : 'Send'}
        </Button>
        {sending && showColdStartHint && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
            }}
          >
            Still sending. This can take a moment.
          </Typography>
        )}
      </Stack>
      <ConnectNotification
        open={open}
        setClose={setClose}
        messageSent={messageSent}
        message={notificationText}
      />
    </>
  );
};

export default ConnectForm;
