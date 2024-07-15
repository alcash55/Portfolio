import { useState } from "react";

/**
 * Use Connect Form Hook that returns a set of functions to interact with the form
 * @returns { setName, setEmail, setMessage, sendMessage, name, email, message }
 */
const useConnectForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  /**
   * Todo: send message to discord using composite action
   * @see https://github.com/alcash55/ac-composite-actions/tree/main/notifications/discord-messages
   */
  const sendMessage = () => {
    console.log({ name: name, email: email, message: message });
  };

  return { setName, setEmail, setMessage, sendMessage, name, email, message };
};

export default useConnectForm;
