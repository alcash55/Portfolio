import { useState } from "react";

const useConnectForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const sendMessage = () => {
    console.log({ name: name, email: email, message: message });
  };

  return { setName, setEmail, setMessage, sendMessage, name, email, message };
};

export default useConnectForm;
