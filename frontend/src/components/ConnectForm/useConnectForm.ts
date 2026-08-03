import { useState } from 'react';

/**
 * Use Connect Form Hook that returns a set of functions to interact with the form
 * @returns { setName, setEmail, setMessage, sendMessage, name, email, message }
 */
const useConnectForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

  /**
   * Sends the message to the Portfolio backend, which validates it and forwards
   * it to Discord. The webhook URL is held server-side and never reaches the
   * browser bundle.
   * @returns {Promise<boolean>}
   */
  const sendMessage = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
      });

      return response.ok;
    } catch (e) {
      console.error('Failed to send message', e);
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
      { check: name, error: 'Please Fill out all required sections (name)' },
      { check: email, error: 'Please Fill out all required sections (Email)' },
      {
        check: message,
        error: 'Please Fill out all required sections (Message)',
      },
      { check: validateEmail(), error: 'Please enter a valid email address' },
    ];

    for (const check of checks) {
      if (!check.check) {
        return check.error;
      }
    }

    return '';
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
