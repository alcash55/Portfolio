import { createFileRoute } from '@tanstack/react-router';
import { apiUrl } from '~/lib/apiUrl';
import { defaultEdgeCache, serveGolemLatest } from '~/lib/golemBuild';

// Which build the launcher at /play/golem-miners/ should load.
export const Route = createFileRoute('/play/golem-miners/latest.json')({
  server: {
    handlers: {
      GET: () =>
        serveGolemLatest({
          fetch: (input, init) => fetch(input, init),
          apiUrl: apiUrl(),
          cache: defaultEdgeCache(),
          now: () => Date.now(),
        }),
    },
  },
});
