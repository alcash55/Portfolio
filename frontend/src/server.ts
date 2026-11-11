import {
  createServerEntry,
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';
import { waitUntil } from 'cloudflare:workers';
import { readAnalyticsConfig } from '~/lib/analytics';
import { logCrawlerVisit } from '~/lib/crawlerLog';

// Same handler the default entry builds. This file exists only to see requests first.
const startFetch = createStartHandler(defaultStreamHandler);
const config = readAnalyticsConfig(import.meta.env);

export default createServerEntry({
  fetch(request, options) {
    // Wrapped because Workers throws "Illegal invocation" when fetch is passed on bare.
    logCrawlerVisit(request, { config, send: (url, init) => fetch(url, init), waitUntil });
    return startFetch(request, options);
  },
});
