import { useState } from "react";

/**
 * Hook to manage the state of the connectnotification
 * @returns { open, setOpen, setClose }
 */
const useConnectNotification = () => {
  const [open, setOpen] = useState(false);

  /**
   * Close the notification
   */
  const setClose = () => {
    setOpen(false);
  };

  return { open, setOpen, setClose };
};

export default useConnectNotification;
