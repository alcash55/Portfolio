import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

const ADDRESS = 'alex.e.cash28@gmail.com'; // PD-20

interface MessageBandProps {
  /** The contact form. Without one, the band offers a link to the home page's form and the address. */
  form?: ReactNode;
}

/** The closing band on every project and experience page (PD-18 to PD-20). */
export function MessageBand({ form }: MessageBandProps) {
  return (
    <section className="dband" id="contact" aria-labelledby="h-ct">
      <div className="dband-in">
        <h2 id="h-ct" tabIndex={-1}>
          Want to talk about this work?
        </h2>
        {form ?? (
          <div className="dband-links">
            <Link className="btn btn-primary" to="/" hash="contact">
              Message Alex
            </Link>
            <a className="dband-mail" href={`mailto:${ADDRESS}`}>
              {ADDRESS}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
