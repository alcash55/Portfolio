import type { ReactNode } from 'react';
import { ChecksFigure, Diagram, Gallery, RevealVideo } from '~/components/figures';
import { Home } from '~/components/home/Home';
import { PeopleSections } from '~/components/people/PeopleSections';
import { DETAILS, SOLEA_DIAGRAM, type DetailSlug } from '~/content/projects';
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
        />
      );
    case 'gallery':
      return <Gallery name={name} slides={media.slides} />;
    default: {
      const unhandled: never = media;
      return unhandled;
    }
  }
}

function diagramFigure(slug: DetailSlug): ReactNode {
  const { name, diagram } = DETAILS[slug];
  return <Diagram name={name} diagram={diagram} />;
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
            experience: <Diagram name="Solea Energy" diagram={SOLEA_DIAGRAM} />,
            'ncr-voyix': diagramFigure('ncr-voyix-docs'),
            'ncr-store-health': diagramFigure('starbucks-store-health'),
          }}
        />
      }
    />
  );
}
