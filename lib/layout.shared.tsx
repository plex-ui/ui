import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      url: '/',
      transparentMode: 'top',
    },
    links: [{ text: 'Docs', url: '/docs', active: 'nested-url' }],
    githubUrl: 'https://github.com/plex-ui/ui',
  };
}
