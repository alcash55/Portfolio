import type { QueryClient } from '@tanstack/react-query';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import geistFont from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import newsreaderFont from '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2?url';
import { Shell } from '~/components/shell/Shell';
import { NotFoundRoute } from '~/components/pages/NotFound';
import { themeInitScript } from '~/lib/theme';
import appCss from '~/styles.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'color-scheme', content: 'light dark' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      // Preload only the latin subsets the first paint uses. The CSS lists the rest by unicode-range.
      { rel: 'preload', as: 'font', type: 'font/woff2', href: geistFont, crossOrigin: 'anonymous' },
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: newsreaderFont,
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
    ],
    // Inline and first in <head> so a saved dark choice is set before first paint.
    scripts: [{ children: themeInitScript }],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFoundRoute,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // The theme script sets data-theme on <html> before React hydrates, which React would flag.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
