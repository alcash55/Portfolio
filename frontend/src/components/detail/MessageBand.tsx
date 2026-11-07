import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { LINKEDIN_URL } from '~/content/people';
import { CLEAR_OF_CHROME, PAGE_FRAME, PILL } from './pageStyles';

// The dband class is a hook, not a style. ContactForm restyles itself inside it with in-[.dband].
const BAND = [
  'dband mx-(--panel-gap) mt-[56px] rounded-stage border border-line-soft bg-band',
  CLEAR_OF_CHROME,
].join(' ');
// Stacked on a phone. From 900px the heading sits beside the form and the padding widens.
const BAND_INNER = [
  `${PAGE_FRAME} grid gap-[28px] pt-[32px] pb-[40px]`,
  'min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] min-[900px]:items-start',
  'min-[900px]:gap-[64px] min-[900px]:px-[48px] min-[900px]:pt-[40px] min-[900px]:pb-[48px]',
].join(' ');
const HEADING = 'font-display text-band-title tracking-[-0.015em] [word-spacing:0.06em]';

interface MessageBandProps {
  /** The contact form. Without one, the band offers a link to the home page's form and LinkedIn. */
  form?: ReactNode;
}

/** The closing band on every project and experience page (PD-18 to PD-20). */
export function MessageBand({ form }: MessageBandProps) {
  return (
    <section className={BAND} id="contact" aria-labelledby="h-ct">
      <div className={BAND_INNER}>
        <h2 id="h-ct" tabIndex={-1} className={HEADING}>
          Want to talk about this work?
        </h2>
        {form ?? (
          <div className="flex flex-wrap items-center gap-x-[24px] gap-y-[12px]">
            <Link className={PILL.primary} to="/" hash="contact" data-msg>
              Message Alex
            </Link>
            <a className="text-ink-2" href={LINKEDIN_URL} target="_blank" rel="noopener">
              LinkedIn<span className="sr"> (opens in a new tab)</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
