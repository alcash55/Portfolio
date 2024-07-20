import { useState } from "react";
import useConnectNotification from "./useConnectNotification";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
});

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
  const sendMessage = async () => {
    // TODO: Get workflow id from repo
    try {
      await octokit.rest.actions.createWorkflowDispatch({
        owner: "alcash55",
        repo: "ac-composite-actions",
        workflow_id: "main.yml",
        ref: "main",
        inputs: {
          message: `
            ${name} has sent you a message
            email: ${email}
            message:${message}
          `,
        },
      });

      setOpen(true);
    } catch (e) {
      console.log(`Error: ${e}`);
      setOpen(false);
    }
  };

  return { setName, setEmail, setMessage, sendMessage, name, email, message };
};

export default useConnectForm;
