import { createFileRoute } from '@tanstack/react-router';
import { serveGolemAsset } from '~/lib/golemBuild';

export const Route = createFileRoute('/play/golem-miners/Build/$')({
  server: {
    handlers: {
      GET: ({ params }) => serveGolemAsset(params._splat ?? '', fetch),
    },
  },
});
