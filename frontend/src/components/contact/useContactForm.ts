import { useMutation } from '@tanstack/react-query';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { useHydrated } from '~/components/shell/useHydrated';
import { analytics } from '~/lib/analytics';
import { defaultSendDeps } from './defaultDeps';
import { EMPTY_VALUES, FIELDS, LABELS } from './contactCopy';
import { sendContact, type SendDeps } from './sendContact';
import {
  MESSAGE_LIMIT,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactValues,
} from './validate';

// Shown after this long without a reply, so a cold API host reads as slow, not broken.
const SLOW_HINT_MS = 4000;

function withField(errors: ContactErrors, field: ContactField, message?: string): ContactErrors {
  const next = { ...errors };
  if (message === undefined) delete next[field];
  else next[field] = message;
  return next;
}

/**
 * Everything the contact form does: field state, validation timing, the send,
 * and the "slow server" hint. The component only turns this into markup.
 */
export function useContactForm(deps?: SendDeps) {
  const uid = useId();
  const hydrated = useHydrated();
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    message: `${uid}-message`,
  } satisfies Record<ContactField, string>;

  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<ContactErrors>({});
  const [blurNote, setBlurNote] = useState('');
  const [summaryTries, setSummaryTries] = useState(0);
  const [slow, setSlow] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [returns, setReturns] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const pressingSend = useRef(false);

  const mutation = useMutation({
    mutationFn: (submission: ContactValues & { website: string }) =>
      sendContact(submission, deps ?? defaultSendDeps()),
    onSuccess: (outcome) => {
      if (outcome.ok) analytics.capture('contact_submitted');
    },
  });
  const sending = mutation.isPending;
  const result = mutation.data;
  const sent = result?.ok === true;
  const failure = result && !result.ok ? result.kind : null;

  useEffect(() => {
    if (!sending) return;
    const timer = setTimeout(() => setSlow(true), SLOW_HINT_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [sending]);

  // "Send another message" brings the form back, with focus on its first field.
  useEffect(() => {
    if (returns > 0) nameRef.current?.focus();
  }, [returns]);

  const count = values.message.length;
  const errorFields = FIELDS.filter((f) => errors[f] !== undefined);

  function onChange(field: ContactField) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { ...values, [field]: event.target.value };
      setValues(next);
      // Errors appear on blur and on submit. Typing only clears one once it is fixed.
      if (errors[field] !== undefined && validateContact(next)[field] === undefined) {
        setErrors(withField(errors, field));
      }
    };
  }

  function onBlur(field: ContactField) {
    return () => {
      // An error that appears while the pointer is down on Send moves the button, and
      // the release lands on empty space, so the click is lost. Send validates it all.
      if (pressingSend.current) return;
      const message = validateContact(values)[field];
      setErrors(withField(errors, field, message));
      setBlurNote(message === undefined ? '' : `${LABELS[field]}: ${message}`);
    };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    // The DOM is the source of truth at submit. Autofill and early typing can fill a
    // field without a change event React saw, so state alone can read empty over a full form.
    const data = new FormData(event.currentTarget);
    const read = (field: ContactField) => {
      const entry = data.get(field);
      return typeof entry === 'string' ? entry : '';
    };
    const current: ContactValues = {
      name: read('name'),
      email: read('email'),
      message: read('message'),
    };
    setValues(current);
    const found = validateContact(current);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setSummaryTries((n) => n + 1);
      return;
    }
    setErrors({});
    setSentTo(current.email.trim());
    mutation.mutate({ ...current, website });
  }

  function focusField(field: ContactField) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      document.getElementById(ids[field])?.focus();
    };
  }

  function sendAnother() {
    mutation.reset();
    setValues(EMPTY_VALUES);
    setWebsite('');
    setErrors({});
    setBlurNote('');
    setSummaryTries(0);
    setReturns((n) => n + 1);
  }

  const sendButton = {
    onPointerDown: () => {
      pressingSend.current = true;
    },
    onPointerUp: () => {
      pressingSend.current = false;
    },
    onPointerLeave: () => {
      pressingSend.current = false;
    },
  };

  return {
    ids,
    hydrated,
    values,
    website,
    setWebsite,
    errors,
    errorFields,
    showSummary: summaryTries > 0 && errorFields.length > 0,
    summaryTries,
    blurNote,
    count,
    over: count > MESSAGE_LIMIT,
    slow,
    sending,
    sent,
    sentTo,
    failure,
    nameRef,
    sendButton,
    onChange,
    onBlur,
    onSubmit,
    focusField,
    sendAnother,
  };
}
