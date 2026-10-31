import { Link } from '@tanstack/react-router';
import { PageFrame } from './PageFrame';

interface ContentPageProps {
  h1: string;
  /** PD-01: "All projects" on a project page, "All experience" on an experience page. */
  back: { label: string; hash: 'projects' | 'experience' };
}

export function ContentPage({ h1, back }: ContentPageProps) {
  return (
    <PageFrame>
      <Link
        to="/"
        hash={back.hash}
        className="text-ink-2 hover:text-ink inline-flex min-h-11 items-center text-[0.9375rem] font-medium underline underline-offset-4"
      >
        {back.label}
      </Link>
      <h1 className="font-display text-page mt-6 tracking-[-0.015em] text-balance">{h1}</h1>
    </PageFrame>
  );
}
