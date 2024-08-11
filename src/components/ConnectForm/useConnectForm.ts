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
   * Sends the message discord channel using a webhook
   * @see https://github.com/alcash55/ac-composite-actions/tree/main/notifications/discord-messages
   * @returns {Promise<boolean>}
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
      return false;
    }
  };

  /**
   * Validates the email to check if it's valid
   * @see https://emailregex.com/
   * @param {string} - email
   * @returns {boolean}
   */
  const validateEmail = () => {
    if (!email) return false;

    const checkEmail =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (email.match(checkEmail)) {
      return true;
    } else {
      return false;
    }
  };

  /**
   * Validates the form to check if all required information is entered and email is valid
   * @returns {string}
   */
  const validateForm = (name: string, email: string, message: string) => {
    const checks = [
      { check: name, error: "Please Fill out all required sections (name)" },
      { check: email, error: "Please Fill out all required sections (Email)" },
      {
        check: message,
        error: "Please Fill out all required sections (Message)",
      },
      { check: validateEmail(), error: "Please enter a valid email address" },
    ];

    for (const check of checks) {
      if (!check.check) {
        return check.error;
      }
    }

    return "";
  };

  return {
    setName,
    setEmail,
    setMessage,
    sendMessage,
    name,
    email,
    message,
    validateForm,
  };
};

export default useConnectForm;
