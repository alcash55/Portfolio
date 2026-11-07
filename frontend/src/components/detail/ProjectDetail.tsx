import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { Diagram, Gallery } from '../figures';
import { DETAILS, nextAfter, type Detail, type DetailSlug, type Media } from '~/content/projects';
import { homeAnchor } from '~/lib/homeAnchor';
import { Breadcrumb } from './Breadcrumb';
import { ExternalIcon, ForwardIcon } from './icons';
import { MessageBand } from './MessageBand';
import { CLEAR_OF_CHROME, PAGE_FRAME, PILL } from './pageStyles';
import { RichText } from './RichText';
import { useFocusOnNavigation } from './useFocusOnNavigation';

const PAGE = `${PAGE_FRAME} ${CLEAR_OF_CHROME}`;

const TOP = 'pt-[32px] pb-[8px]';
const TITLE = [
  'font-display text-page tracking-[-0.02em] [word-spacing:0.06em]',
  'text-balance wrap-anywhere',
].join(' ');
const TOP_GRID = [
  'mt-[24px] grid gap-[24px]',
  'min-[768px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[768px]:items-start',
  'min-[768px]:gap-[48px]',
].join(' ');
const SUMMARY = 'max-w-[46ch] text-[1.0625rem] leading-[1.5] text-ink-2';
const STATUS = [
  'mt-[16px] max-w-[54ch] rounded-[14px] border border-line bg-fill',
  'px-[16px] py-[12px] text-[0.9375rem]',
].join(' ');
const STACK = 'mt-[14px] max-w-[60ch] text-[0.9375rem] text-ink-3';

// Buttons stack on a phone and sit in a row from 768px.
const ACTIONS = [
  'flex flex-col gap-[12px]',
  'min-[768px]:flex-row min-[768px]:flex-wrap min-[768px]:items-center',
].join(' ');
const NOTICE =
  'inline-flex min-h-11 flex-wrap items-center gap-x-[0.5em] gap-y-[0.25em] text-ink-2';
// The play note describes the browser build, which hides below 1024px with its link.
const PLAY_NOTE = 'basis-full text-[0.9375rem] text-ink-2 max-[1023px]:hidden';
const DESKTOP_ONLY = 'max-[1023px]:hidden';

// Every section sets its h2 from above, because the Diagram renders its own heading inside one.
const SECTION_HEADING =
  '[&_h2]:font-display [&_h2]:text-section [&_h2]:tracking-[-0.015em] [&_h2]:[word-spacing:0.06em]';
const SECTION = `mt-[56px] ${SECTION_HEADING}`;
const PANEL = [
  'rounded-stage bg-wash px-[16px] py-[24px]',
  'min-[768px]:px-[32px] min-[768px]:py-[40px]',
].join(' ');

// The heading sits beside the paragraphs, or the stats, from 900px.
const SPLIT = [
  `${SECTION} grid gap-[20px]`,
  'min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] min-[900px]:gap-[48px]',
].join(' ');
const PARAGRAPH = 'max-w-[62ch] text-[1.0625rem] leading-[1.6]';

// Two columns from 560px, so a figure keeps room for "7 GB to 198 MB" and the rows stay short.
const STATS = 'grid gap-x-[32px] min-[560px]:grid-cols-2';
const STAT = 'border-t border-line py-[20px]';
const STAT_FIGURE = [
  'block font-display text-[2.25rem] leading-[1.05] tracking-[-0.02em]',
  '[word-spacing:0.05em] wrap-anywhere min-[768px]:text-[2.75rem]',
].join(' ');
const STAT_LABEL = 'mt-[8px] block max-w-[36ch] text-[0.9375rem] leading-[1.5] text-ink-2';

const NEXT_LINK = [
  'flex min-h-[80px] items-center justify-between gap-[16px]',
  'rounded-stage border border-line bg-band px-[24px] py-[20px]',
  'transition-[background-color] duration-(--duration-color) ease-(--ease-color) hover:bg-wash',
].join(' ');
const NEXT_LABEL = 'font-display text-next tracking-[-0.02em] [word-spacing:0.05em] wrap-anywhere';

interface ProjectDetailProps {
  slug: DetailSlug;
  /** The contact form for the closing band. B2's form goes here. */
  form?: ReactNode;
}

/** A project or experience page, from the breadcrumb to the closing band. */
export function ProjectDetail({ slug, form }: ProjectDetailProps) {
  const detail = DETAILS[slug];
  const next = nextAfter(slug);
  const section = detail.kind === 'project' ? 'projects' : 'experience';
  const heading = useFocusOnNavigation(slug);

  return (
    <>
      {/* The chapter this write-up opens from, so Back lands where the visitor left. */}
      <Breadcrumb hash={homeAnchor(slug)} backLabel={`All ${section}`} current={detail.name} />
      <div className={PAGE}>
        <section className={TOP} aria-labelledby="h1">
          <h1 id="h1" ref={heading} tabIndex={-1} className={TITLE}>
            {detail.name}
          </h1>
          <div className={TOP_GRID}>
            <div>
              <p className={SUMMARY}>{detail.summary}</p>
              {detail.status ? (
                <p className={STATUS}>
                  <b className="font-semibold">{detail.status.role}</b> {detail.status.text}
                </p>
              ) : null}
              <p className={STACK}>
                <span className="sr">Stack: </span>
                {detail.stack}
              </p>
            </div>
            <Actions detail={detail} />
          </div>
        </section>

        <section className={SECTION} aria-labelledby="h-ad">
          <div className={PANEL}>
            <Diagram
              name={detail.name}
              diagram={detail.diagram}
              title="Architecture"
              titleId="h-ad"
            />
          </div>
        </section>

        <MediaSection name={detail.name} media={detail.media} />

        <section className={SPLIT} aria-labelledby="h-wb">
          <h2 id="h-wb">What I built</h2>
          <div className="grid gap-[18px]">
            {detail.built.map((paragraph) => (
              <p key={paragraph} className={PARAGRAPH}>
                <RichText text={paragraph} />
              </p>
            ))}
          </div>
        </section>

        {detail.stats?.length ? (
          <section className={SPLIT} aria-labelledby="h-wm">
            <h2 id="h-wm">What I measured</h2>
            <ul className={STATS}>
              {detail.stats.map((stat) => (
                <li key={stat.figure} className={STAT}>
                  <span className={STAT_FIGURE}>{stat.figure}</span>
                  <span className={STAT_LABEL}>
                    <RichText text={stat.label} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={SECTION} aria-label={`Next ${detail.kind}`}>
          {next ? (
            <Link
              className={NEXT_LINK}
              to={next.kind === 'project' ? '/projects/$slug' : '/experience/$slug'}
              params={{ slug: next.slug }}
            >
              <span className={NEXT_LABEL}>Next: {next.name}</span>
              <ForwardIcon />
            </Link>
          ) : (
            <Link className={NEXT_LINK} to="/" hash={section}>
              <span className={NEXT_LABEL}>All {section}</span>
              <ForwardIcon />
            </Link>
          )}
        </section>
      </div>
      <MessageBand form={form} />
    </>
  );
}

function Actions({ detail }: { detail: Detail }) {
  // Pages with nothing to show here (the two NCR write-ups) leave the column out.
  if (detail.links.length === 0 && !detail.notice && !detail.playNote) return null;
  return (
    <div className={ACTIONS}>
      {detail.links.map((link, i) => (
        <a
          key={link.href}
          className={`${i === 0 ? PILL.primary : PILL.secondary}${link.desktopOnly ? ` ${DESKTOP_ONLY}` : ''}`}
          href={link.href}
          target="_blank"
          rel="noopener"
        >
          {link.label} <span className="sr">(opens in a new tab)</span>
          <ExternalIcon />
        </a>
      ))}
      {detail.notice ? <span className={NOTICE}>{detail.notice}</span> : null}
      {detail.playNote ? <p className={PLAY_NOTE}>{detail.playNote}</p> : null}
    </div>
  );
}

/**
 * The home chapter already plays this page's recording, so repeating it here added a
 * 1,180 px banner that said nothing new. A page shows media only when it has more than
 * the home chapter does: a gallery with several clips.
 */
export function MediaSection({ name, media }: { name: string; media: Media }) {
  if (media.kind !== 'gallery' || media.slides.length < 2) return null;
  return (
    <section className={SECTION} aria-label="Media">
      <Gallery name={name} slides={media.slides} />
    </section>
  );
}
