import { PeopleSections } from '~/components/people/PeopleSections';
import { HOME } from '~/content/pages';
import { PageFrame } from './PageFrame';

export function HomePage() {
  return (
    <>
      <PageFrame>
        <h1 className="font-display text-hero max-w-[20ch] tracking-[-0.02em] text-balance">
          {HOME.h1}
        </h1>
        {/* HO-02 and HO-03 */}
        <p className="text-ink-2 mt-8 text-lg">
          Software engineer in Memphis, TN.
          <br />
          Go, TypeScript and React.
        </p>
      </PageFrame>
      <PeopleSections />
    </>
  );
}
