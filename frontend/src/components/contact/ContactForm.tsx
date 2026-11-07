import { useCallback } from 'react';
import { LINKEDIN_URL } from '~/content/people';
import { FIELDS, LABELS, failureCopy, isRetryable, submitLabel } from './contactCopy';
import type { SendDeps } from './sendContact';
import { useContactForm } from './useContactForm';
import { LIMITS, MESSAGE_LIMIT } from './validate';

// px stays px and rem stays rem, as the old stylesheet had them: the root font size grows above
// 1440px wide, so a rem-based Tailwind step (gap-4, p-3.5) would drift from these there.
//
// The form sits in two bands that name themselves with a class, and the in-[] variants below
// restyle it from the outside: .pp-cform on the home page, .dband under a write-up.

// In the home band (.pp-cform), where a chapter fits one screen, the form tightens: a 12px gap
// and a shorter message box.
const CARD = [
  'grid gap-(--ct-gap) [--ct-gap:16px] min-[900px]:in-[.pp-cform]:[--ct-gap:12px]',
  'rounded-card border border-line bg-surface p-6 shadow-card',
].join(' ');

// The write-up band (.dband) form is shorter than the home chapter's: 20px of card padding on a
// phone and a fixed 24px from 768px (CARD's p-6 grows with the root size), and Name and Email on
// one row once the column can hold two fields. Only the <form> gets this. The "Message sent" card
// keeps CARD as it is.
const FORM_IN_BAND = [
  'in-[.dband]:p-[20px] min-[768px]:in-[.dband]:p-[24px]',
  'min-[1100px]:in-[.dband]:grid-cols-2',
  // Name and Email are the only children that hold an input. Everything else spans the row.
  'min-[1100px]:in-[.dband]:[&>:not(:has(>input))]:col-span-full',
].join(' ');

const HEADING = 'font-display text-[1.75rem] leading-[1.15]';
const FIELD = 'grid gap-[6px]';
// In the write-up band, a field with no error keeps an empty 6px slot below it, the room an inline
// error takes, so the rows do not jump when one appears.
const FIELD_IDLE = `${FIELD} in-[.dband]:after:content-['']`;

const CONTROL = [
  'w-full rounded-[14px] bg-paper',
  'text-base leading-[1.4] text-ink read-only:text-ink-2',
].join(' ');
// An error never rides on color alone: a thicker border, an icon and the text. The padding
// drops 0.5px a side so the thicker border does not move the text.
const CONTROL_OK = 'border-[1.5px] border-line-strong px-[14px] py-[12px]';
const CONTROL_BAD = 'border-2 border-error px-[13.5px] py-[11.5px]';
// Shorter in the home band (.pp-cform) and in the write-up band (.dband), which fit less height.
const MESSAGE_BOX = [
  'min-h-[150px] min-[900px]:in-[.pp-cform]:min-h-[104px]',
  'in-[.dband]:min-h-[112px]',
].join(' ');

const ERROR_BOX = 'rounded-[14px] border-2 border-error px-[16px] py-[14px]';
const SUMMARY_LINK = [
  'inline-flex min-h-11 items-center',
  'font-medium text-error underline underline-offset-[3px]',
].join(' ');
const ERROR_LINE = 'flex items-start gap-[6px] font-medium text-error';
const BANNER_LINE = 'flex items-start gap-[6px]';

// The base reset removes underlines, and these links sit in running text.
const INLINE_LINK = 'text-ink underline underline-offset-[3px]';

// The alert and status regions stay in the page so screen readers hear what they receive.
// While empty they would still add a grid gap each, so they leave the layout until written to.
const LIVE_REGION = 'empty:absolute empty:h-px empty:w-px empty:overflow-hidden';

const BUTTON = [
  'inline-flex min-h-[48px] w-full items-center justify-center',
  'rounded-full border-[1.5px] px-[24px]',
  'text-base leading-none font-medium',
  'cursor-pointer transition-[background-color] duration-(--duration-press) ease-linear',
  // In the write-up band the text line is 1.2 tall and padding replaces the fixed height.
  'in-[.dband]:min-h-12 in-[.dband]:py-[12px] in-[.dband]:leading-[1.2]',
  'min-[768px]:in-[.dband]:py-0',
].join(' ');
const BUTTON_PRIMARY = [
  'border-transparent bg-accent text-on-accent hover:bg-accent-hover',
  'aria-disabled:cursor-progress aria-disabled:opacity-80',
  'disabled:cursor-progress disabled:opacity-80',
].join(' ');
const BUTTON_SECONDARY = 'w-auto border-line-strong text-ink hover:bg-fill';

// Mount-time focus. Stable identity, so a re-render never pulls focus back.
function useFocusOnMount() {
  return useCallback((el: HTMLElement | null) => {
    el?.focus();
  }, []);
}

function ErrorIcon() {
  return (
    <svg
      className="mt-[0.15em] shrink-0"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r=".9" fill="currentColor" />
    </svg>
  );
}

export function ContactForm({ deps }: { deps?: SendDeps }) {
  const {
    ids,
    hydrated,
    values,
    website,
    setWebsite,
    errors,
    errorFields,
    showSummary,
    summaryTries,
    blurNote,
    count,
    over,
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
  } = useContactForm(deps);
  const focusOnMount = useFocusOnMount();

  if (sent) {
    return (
      <div className={`${CARD} justify-items-start`}>
        <h3 className={HEADING} tabIndex={-1} ref={focusOnMount}>
          Message sent.
        </h3>
        <p className="wrap-anywhere">Thanks for writing. I will reply to {sentTo}.</p>
        <button type="button" className={`${BUTTON} ${BUTTON_SECONDARY}`} onClick={sendAnother}>
          Send another message
        </button>
        <LinkedInLine />
      </div>
    );
  }

  return (
    <div className="grid gap-[16px]">
      <form
        className={`${CARD} ${FORM_IN_BAND}`}
        method="post"
        aria-label="Message Alex"
        noValidate
        onSubmit={onSubmit}
      >
        {showSummary ? (
          <div className={`grid gap-[8px] ${ERROR_BOX}`} key={summaryTries}>
            <h3 className={HEADING} tabIndex={-1} ref={focusOnMount}>
              Check these fields before sending.
            </h3>
            <ul className="pl-5">
              {errorFields.map((f) => (
                <li key={f}>
                  <a className={SUMMARY_LINK} href={`#${ids[f]}`} onClick={focusField(f)}>
                    {errors[f]}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-[0.9375rem] text-ink-2">All fields are required.</p>

        {FIELDS.map((f) => {
          const error = errors[f];
          const describedBy = [
            error ? `${ids[f]}-err` : null,
            f === 'message' ? `${ids[f]}-cnt` : null,
          ]
            .filter((id): id is string => id !== null)
            .join(' ');
          const tone = error ? CONTROL_BAD : CONTROL_OK;
          const shared = {
            id: ids[f],
            name: f,
            value: values[f],
            required: true,
            // Read-only until React owns the form, so nothing typed early is lost.
            readOnly: sending || !hydrated,
            'aria-invalid': error ? (true as const) : undefined,
            'aria-describedby': describedBy || undefined,
            onChange: onChange(f),
            onBlur: onBlur(f),
          };
          return (
            <div className={error ? FIELD : FIELD_IDLE} key={f}>
              <label className="text-[0.9375rem] font-medium" htmlFor={ids[f]}>
                {LABELS[f]} <span className="font-normal text-ink-2">(required)</span>
              </label>
              {f === 'message' ? (
                // No maxlength here: a paste past the limit shows the count over it
                // and the message below, instead of cutting the text without a word.
                <textarea {...shared} className={`${CONTROL} ${tone} ${MESSAGE_BOX}`} />
              ) : f === 'name' ? (
                <input
                  {...shared}
                  className={`${CONTROL} ${tone} min-h-12`}
                  ref={nameRef}
                  type="text"
                  autoComplete="name"
                  maxLength={LIMITS.name}
                />
              ) : (
                <input
                  {...shared}
                  className={`${CONTROL} ${tone} min-h-12`}
                  type="email"
                  autoComplete="email"
                  maxLength={LIMITS.email}
                />
              )}
              {error ? (
                <p className={`${ERROR_LINE} text-[0.9375rem]`} id={`${ids[f]}-err`}>
                  <ErrorIcon />
                  {error}
                </p>
              ) : null}
              {f === 'message' ? (
                <span
                  className={`justify-self-end text-[0.8125rem] ${over ? 'flex items-center gap-[6px] font-medium text-error' : 'text-ink-3'}`}
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
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div role="alert" className={LIVE_REGION}>
          {failure ? (
            <div className={`grid gap-[4px] ${ERROR_BOX}`}>
              <p className={ERROR_LINE}>
                <ErrorIcon />
                {failureCopy(failure)}
              </p>
              {isRetryable(failure) ? (
                <p className={BANNER_LINE}>Your message is still in the form.</p>
              ) : null}
              <LinkedInLine />
            </div>
          ) : null}
        </div>

        <div
          role="status"
          aria-label="Send status"
          className={`text-[0.9375rem] text-ink-2 ${LIVE_REGION}`}
        >
          {slow ? (
            <>
              <p>Waking the server. This can take up to a minute.</p>
              <LinkedInLine />
            </>
          ) : null}
        </div>

        <div role="status" aria-label="Field check" className="sr">
          {blurNote}
        </div>

        <button
          type="submit"
          className={`${BUTTON} ${BUTTON_PRIMARY}`}
          // Without JS a native POST reaches the page URL, not the API, and drops the message.
          disabled={!hydrated}
          aria-disabled={sending ? 'true' : undefined}
          {...sendButton}
        >
          {submitLabel(sending, failure)}
        </button>
      </form>
      <LinkedInLine />
    </div>
  );
}

/** The way in that needs no server: LinkedIn. The site shows no email address. */
function LinkedInLine() {
  return (
    <p className="text-[0.9375rem] text-ink-2">
      Or message me on{' '}
      <a className={INLINE_LINK} href={LINKEDIN_URL} target="_blank" rel="noopener">
        LinkedIn<span className="sr"> (opens in a new tab)</span>
      </a>
      .
    </p>
  );
}
