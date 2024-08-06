import { useState } from "react";

/**
 * Hook to manage the state of the connectnotification
 * @returns { open, setOpen, setClose }
 */
const useConnectNotification = () => {
  const [open, setOpen] = useState(false);
  const [messageSent, setMessageSent] = useState<boolean>(true);

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
  };
};

export default useConnectNotification;
