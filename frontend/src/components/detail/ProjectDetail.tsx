import { Link, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Diagram, Gallery, RevealVideo } from '../figures';
import { DETAILS, nextAfter, type Detail, type DetailSlug, type Media } from '~/content/projects';
import { BackIcon, ExternalIcon, ForwardIcon } from './icons';
import { MessageBand } from './MessageBand';
import { RichText } from './RichText';
import './detail.css';

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
      <nav className="crumb" aria-label="Breadcrumb">
        <div className="crumb-in">
          <Link to="/" hash={section}>
            <BackIcon />
            <span>All {section}</span>
          </Link>
          <span className="sep" aria-hidden="true">
            /
          </span>
          <span className="cur" aria-current="page">
            {detail.name}
          </span>
        </div>
      </nav>
      <div className="pg">
        <section className="top" aria-labelledby="h1">
          <h1 id="h1" ref={heading} tabIndex={-1}>
            {detail.name}
          </h1>
          <div className="top-g">
            <div>
              <p className="sum">{detail.summary}</p>
              {detail.status ? (
                <p className="status">
                  <b>{detail.status.role}</b> {detail.status.text}
                </p>
              ) : null}
              <p className="stack">
                <span className="sr">Stack: </span>
                {detail.stack}
              </p>
            </div>
            <Actions detail={detail} />
          </div>
        </section>

        <section className="sec" aria-labelledby="h-ad">
          <div className="panel">
            <Diagram
              name={detail.name}
              diagram={detail.diagram}
              title="Architecture"
              titleId="h-ad"
            />
          </div>
        </section>

        <MediaSection name={detail.name} media={detail.media} />

        <section className="sec built" aria-labelledby="h-wb">
          <h2 id="h-wb">What I built</h2>
          <div className="ps">
            {detail.built.map((paragraph) => (
              <p key={paragraph}>
                <RichText text={paragraph} />
              </p>
            ))}
          </div>
        </section>

        <section className="sec" aria-labelledby="h-wm">
          <h2 id="h-wm">What I measured</h2>
          <ul className="facts">
            {detail.facts.map((fact) => (
              <li key={fact.lead} className="fact">
                <span className="lead">
                  <RichText text={fact.lead} />
                </span>
                <span className="body">
                  <RichText text={fact.body} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sec" aria-label={`Next ${detail.kind}`}>
          {next ? (
            <Link
              className="next"
              to={next.kind === 'project' ? '/projects/$slug' : '/experience/$slug'}
              params={{ slug: next.slug }}
            >
              <span>Next: {next.name}</span>
              <ForwardIcon />
            </Link>
          ) : (
            <Link className="next" to="/" hash={section}>
              <span>All {section}</span>
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
  return (
    <div className="acts">
      {detail.links.map((link, i) => (
        <a
          key={link.href}
          className={i === 0 ? 'btn btn-primary' : 'btn btn-2'}
          href={link.href}
          target="_blank"
          rel="noopener"
        >
          {link.label} <span className="sr">(opens in a new tab)</span>
          <ExternalIcon />
        </a>
      ))}
      {detail.notice ? <span className="note">{detail.notice}</span> : null}
      {detail.playNote ? <p className="itch-n">{detail.playNote}</p> : null}
    </div>
  );
}

function MediaSection({ name, media }: { name: string; media: Media }) {
  switch (media.kind) {
    case 'none':
      return null;
    case 'reveal':
      return (
        <section className="sec" aria-label="Media">
          <RevealVideo
            name={name}
            src={media.src}
            poster={media.poster}
            posterSwap={media.posterSwap}
            label={media.label}
            caption={media.caption}
          />
        </section>
      );
    case 'gallery':
      return (
        <section className="sec" aria-label="Media">
          <Gallery name={name} slides={media.slides} />
        </section>
      );
    default: {
      const unhandled: never = media;
      return unhandled;
    }
  }
}

/**
 * Moves focus to the h1 when the visitor arrives from another page, so a screen
 * reader announces the new page. The first load is left alone: the browser
 * already starts at the top, and focus there would show a ring nobody asked for.
 */
function useFocusOnNavigation(slug: DetailSlug) {
  const ref = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  useEffect(() => {
    const arrivedFrom = router.state.resolvedLocation?.pathname;
    if (arrivedFrom && arrivedFrom !== router.state.location.pathname) ref.current?.focus();
  }, [slug, router]);
  return ref;
}
