import type { ReactNode } from 'react';
import { ChecksFigure, Gallery, HomeDiagram, RevealVideo } from '~/components/figures';
import { Home } from '~/components/home/Home';
import { PeopleSections } from '~/components/people/PeopleSections';
import { DETAILS, HOME_DIAGRAMS, type DetailSlug } from '~/content/projects';
import type { ProjectSlug } from '~/content/pages';

function mediaFigure(slug: DetailSlug): ReactNode {
  const { name, media } = DETAILS[slug];
  switch (media.kind) {
    case 'none':
      return undefined;
    case 'reveal':
      return (
        <RevealVideo
          name={name}
          src={media.src}
          poster={media.poster}
          posterSwap={media.posterSwap}
          label={media.label}
          caption={media.caption}
          framed
        />
      );
    case 'gallery':
      return <Gallery name={name} slides={media.slides} framed />;
    default: {
      const unhandled: never = media;
      return unhandled;
    }
  }
}

const PROJECT_FIGURES: Partial<Record<ProjectSlug, ReactNode>> = {
  'portfolio-website': mediaFigure('portfolio-website'),
  'game-competition-website': mediaFigure('game-competition-website'),
  // The AC page has no checks figure, so the home chapter is the only place it shows.
  'ac-composite-actions': <ChecksFigure />,
  clipper: mediaFigure('clipper'),
  'golem-miners': mediaFigure('golem-miners'),
  'vscode-royalty-theme': mediaFigure('vscode-royalty-theme'),
};

export function HomePage() {
  return (
    <Home
      figures={PROJECT_FIGURES}
      after={
        <PeopleSections
          figures={{
            experience: <HomeDiagram diagram={HOME_DIAGRAMS.solea} />,
            'ncr-voyix': <HomeDiagram diagram={HOME_DIAGRAMS['ncr-voyix']} />,
            'ncr-store-health': <HomeDiagram diagram={HOME_DIAGRAMS['ncr-store-health']} />,
          }}
        />
      }
    />
  );
}
