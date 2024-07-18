import { useState } from "react";
import useConnectNotification from "./useConnectNotification";

/**
 * Use Connect Form Hook that returns a set of functions to interact with the form
 * @returns { setName, setEmail, setMessage, sendMessage, name, email, message }
 */
const useConnectForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { setOpen } = useConnectNotification();

  /**
   * Todo: send message to discord using composite action
   * @see https://github.com/alcash55/ac-composite-actions/tree/main/notifications/discord-messages
   */
  const sendMessage = () => {
    // TODO: show notification on success and error
    console.log({ name: name, email: email, message: message });
  };

  return { setName, setEmail, setMessage, sendMessage, name, email, message };
};

export default useConnectForm;
