import { useMutation } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { CONTACT_EMAIL } from '~/content/people';
import './contact.css';
import { CopyEmailButton } from './CopyEmailButton';
import { defaultSendDeps } from './defaultDeps';
import { sendContact, type ContactErrorKind, type SendDeps } from './sendContact';
import {
  LIMITS,
  MESSAGE_LIMIT,
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactValues,
} from './validate';


// Shown after this long without a reply, so a cold API host reads as slow, not broken.
const SLOW_HINT_MS = 4000;

const FIELDS: readonly ContactField[] = ['name', 'email', 'message'];
const LABELS: Record<ContactField, string> = { name: 'Name', email: 'Email', message: 'Message' };
const EMPTY: ContactValues = { name: '', email: '', message: '' };

function failureCopy(kind: ContactErrorKind): string {
  switch (kind) {
    case 'validation':
      return 'Please check your details and try again.';
    case 'too_large':
      return `That message is too long. The limit is ${MESSAGE_LIMIT} characters.`;
    case 'rate_limited':
      return 'Too many messages. Wait a moment and try again.';
    case 'server_error':
    case 'timeout':
      return "Couldn't send that. Try again in a minute.";
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

/** Only these failures leave the visitor with a message worth retrying as is. */
function isRetryable(kind: ContactErrorKind): boolean {
  return kind === 'server_error' || kind === 'timeout';
}

function withField(errors: ContactErrors, field: ContactField, message?: string): ContactErrors {
  const next = { ...errors };
  if (message === undefined) delete next[field];
  else next[field] = message;
  return next;
}

// Mount-time focus. Stable identity, so a re-render never pulls focus back.
function useFocusOnMount() {
  return useCallback((el: HTMLElement | null) => {
    el?.focus();
  }, []);
}

function ErrorIcon() {
  return (
    <svg className="ct-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r=".9" fill="currentColor" />
    </svg>
  );
}

export function ContactForm({ deps }: { deps?: SendDeps }) {
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    message: `${uid}-message`,
  } satisfies Record<ContactField, string>;

  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<ContactErrors>({});
  const [blurNote, setBlurNote] = useState('');
  const [summaryTries, setSummaryTries] = useState(0);
  const [slow, setSlow] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [returns, setReturns] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const focusOnMount = useFocusOnMount();

  const mutation = useMutation({
    mutationFn: (submission: ContactValues & { website: string }) =>
      sendContact(submission, deps ?? defaultSendDeps()),
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

  useEffect(() => {
    if (returns > 0) nameRef.current?.focus();
  }, [returns]);

  const count = values.message.length;
  const over = count > MESSAGE_LIMIT;
  const errorFields = FIELDS.filter((f) => errors[f] !== undefined);
  const showSummary = summaryTries > 0 && errorFields.length > 0;

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
      const message = validateContact(values)[field];
      setErrors(withField(errors, field, message));
      setBlurNote(message === undefined ? '' : `${LABELS[field]}: ${message}`);
    };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const found = validateContact(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setSummaryTries((n) => n + 1);
      return;
    }
    setErrors({});
    setSentTo(values.email.trim());
    mutation.mutate({ ...values, website });
  }

  function focusField(field: ContactField) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      document.getElementById(ids[field])?.focus();
    };
  }

  function sendAnother() {
    mutation.reset();
    setValues(EMPTY);
    setWebsite('');
    setErrors({});
    setBlurNote('');
    setSummaryTries(0);
    setReturns((n) => n + 1);
  }

  if (sent) {
    return (
      <div className="ct-card ct-sent">
        <h3 className="ct-h" tabIndex={-1} ref={focusOnMount}>
          Message sent.
        </h3>
        <p>Thanks for writing. I will reply to {sentTo}.</p>
        <button type="button" className="ct-btn ct-btn-2" onClick={sendAnother}>
          Send another message
        </button>
        <EmailLine />
      </div>
    );
  }

  const submitLabel = sending
    ? 'Sending'
    : failure && isRetryable(failure)
      ? 'Try again'
      : 'Send message';

  return (
    <div className="ct-wrap">
      <form className="ct-card" aria-label="Message Alex" noValidate onSubmit={onSubmit}>
        {showSummary ? (
          <div className="ct-esum" key={summaryTries}>
            <h3 className="ct-h" tabIndex={-1} ref={focusOnMount}>
              Check these fields before sending.
            </h3>
            <ul>
              {errorFields.map((f) => (
                <li key={f}>
                  <a href={`#${ids[f]}`} onClick={focusField(f)}>
                    {errors[f]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="ct-hint">All fields are required.</p>

        {FIELDS.map((f) => {
          const error = errors[f];
          const describedBy = [
            error ? `${ids[f]}-err` : null,
            f === 'message' ? `${ids[f]}-cnt` : null,
          ]
            .filter((id): id is string => id !== null)
            .join(' ');
          const shared = {
            id: ids[f],
            name: f,
            value: values[f],
            required: true,
            readOnly: sending,
            'aria-invalid': error ? (true as const) : undefined,
            'aria-describedby': describedBy || undefined,
            onChange: onChange(f),
            onBlur: onBlur(f),
          };
          return (
            <div className={error ? 'ct-fld ct-bad' : 'ct-fld'} key={f}>
              <label htmlFor={ids[f]}>
                {LABELS[f]} <span className="ct-rq">(required)</span>
              </label>
              {f === 'message' ? (
                // No maxlength here: a paste past the limit shows the count over it
                // and the message below, instead of cutting the text without a word.
                <textarea {...shared} />
              ) : f === 'name' ? (
                <input
                  {...shared}
                  ref={nameRef}
                  type="text"
                  autoComplete="name"
                  maxLength={LIMITS.name}
                />
              ) : (
                <input {...shared} type="email" autoComplete="email" maxLength={LIMITS.email} />
              )}
              {error ? (
                <p className="ct-err" id={`${ids[f]}-err`}>
                  <ErrorIcon />
                  {error}
                </p>
              ) : null}
              {f === 'message' ? (
                <span
                  className={over ? 'ct-cnt ct-over' : 'ct-cnt'}
                  id={`${ids[f]}-cnt`}
                  aria-live={over ? 'polite' : 'off'}
                >
                  {over ? <ErrorIcon /> : null}
                  {count} of {MESSAGE_LIMIT}
                </span>
              ) : null}
            </div>
          );
        })}

        {/* Honeypot. People never see or reach it. The API drops anything that fills it. */}
        <div className="ct-trap" aria-hidden="true">
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div role="alert" className="ct-banner-slot">
          {failure ? (
            <div className="ct-banner">
              <p>
                <ErrorIcon />
                {failureCopy(failure)}
              </p>
              {isRetryable(failure) ? <p>Your message is still in the form.</p> : null}
              <p>
                Or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            </div>
          ) : null}
        </div>

        <div role="status" aria-label="Send status" className="ct-slow">
          {slow ? (
            <>
              <p>Waking the server. This can take up to a minute.</p>
              <p>
                Or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            </>
          ) : null}
        </div>

        <div role="status" aria-label="Field check" className="sr">
          {blurNote}
        </div>

        <button
          type="submit"
          className="ct-btn ct-btn-primary"
          aria-disabled={sending ? 'true' : undefined}
        >
          {submitLabel}
        </button>
      </form>
      <EmailLine />
    </div>
  );
}

function EmailLine() {
  return (
    <p className="ct-line">
      Or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      <CopyEmailButton address={CONTACT_EMAIL} />
    </p>
  );
}
