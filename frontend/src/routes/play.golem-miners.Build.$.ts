import { createFileRoute } from '@tanstack/react-router';
import { apiUrl } from '~/lib/apiUrl';
import { serveGolemBuildFile } from '~/lib/golemBuild';

// /play/golem-miners/Build/<release tag>/<file>
export const Route = createFileRoute('/play/golem-miners/Build/$')({
  server: {
    handlers: {
      GET: ({ params }) =>
        serveGolemBuildFile(params._splat ?? '', {
          fetch: (input, init) => fetch(input, init),
          apiUrl: apiUrl(),
        }),
    },
  },
});
