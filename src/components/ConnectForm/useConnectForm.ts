import { useState } from "react";

/**
 * Use Connect Form Hook that returns a set of functions to interact with the form
 * @returns { setName, setEmail, setMessage, sendMessage, name, email, message }
 */
const useConnectForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL ?? "";

  /**
   * @see https://github.com/alcash55/ac-composite-actions/tree/main/notifications/discord-messages
   */
  const sendMessage = async () => {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatar_url: "",
          username: "Portfolio Bot",
          content: `${name} has sent you a message\n email: ${email}\n message:${message}`,
        }),
      });

      if (response.ok) {
        return true;
      }
    } catch (e) {
      console.log(`Error: ${e}`);
    } finally {
      return false;
    }
  };

  return { setName, setEmail, setMessage, sendMessage, name, email, message };
};

export default useConnectForm;
