'use client';

import type { ReactNode } from 'react';
import { Page } from '@plexui/ui/components/Page';
import { phoneSectionClassName } from './phoneRowsTemplate';
import { usePreviewEmbed } from './PreviewEmbed';

/**
 * In a Phone preview (with `phonePresentation="screen"`), an example that is a card or a list is a screen: a
 * grouped Page, on which a Card is a section of an iOS inset grouped list (Card.module.css). With `section`, the
 * example sits in such a section itself, as the rows of an Accordion do. Elsewhere the example renders as it is.
 */
export function PhoneScreen({ children, section = false }: { children: ReactNode; section?: boolean }) {
  if (usePreviewEmbed() === null) return children;
  // The stage tells the phone frame the example fills the screen itself (no preview padding around it)
  return (
    <div data-demo-stage>
      <Page surface="grouped" className="h-dvh">
        <Page.Content>{section ? <div className={phoneSectionClassName}>{children}</div> : children}</Page.Content>
      </Page>
    </div>
  );
}
