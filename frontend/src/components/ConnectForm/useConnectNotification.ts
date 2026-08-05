import { useState } from 'react';

/**
 * Hook to manage the state of the connect notification
 * @returns { open, setOpen, setClose, messageSent, setMessageSent, notificationText, setNotificationText }
 */
const useConnectNotification = () => {
  const [open, setOpen] = useState(false);
  const [messageSent, setMessageSent] = useState<boolean>(true);
  // The specific copy shown in the snackbar, set per the status-code error
  // mapping (or the success message) right before the snackbar opens.
  const [notificationText, setNotificationText] = useState('');

  /**
   * Close the notification
   */
  const setClose = () => {
    setOpen(false);
  };

  return {
    open,
    setOpen,
    setClose,
    messageSent,
    setMessageSent,
    notificationText,
    setNotificationText,
  };
};

export default useConnectNotification;
