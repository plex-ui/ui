'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Badge } from '@plexui/ui/components/Badge';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Page, type PageWidth } from '@plexui/ui/components/Page';
import { DemoControlBoolean, controlsTableStyle, Segments } from './ButtonDemos';
import { usePhoneRows } from './PhoneRows';
import { DemoControlsBottom } from './PreviewEmbed';
import type { BarBackground } from '@plexui/ui/components/Toolbar';
import { BarBackgroundRow, Rows } from './ToolbarDemos';
import s from './PageDemos.module.css';

// The frame of a preview is narrower than both widths, so at their real size all three look alike.
const HALF_WIDTHS = { '--page-width-wide': '640px', '--page-width-column': '384px' } as CSSProperties;

function Frame({ children }: { children: ReactNode }) {
  return <div data-demo-stage className={s.Stage}><div className={s.Frame}>{children}</div></div>;
}

const WIDTH_OPTIONS = ['full', 'wide', 'column'] as const satisfies readonly PageWidth[];
const SURFACE_OPTIONS = ['plain', 'grouped'] as const;

/** The Overview, with every setting of a page: what the page's examples once showed one by one (Heading, Fill,
 * Background, Widths) are its settings (owner 11.11: «в первом примере можно сразу показать все со всеми
 * настройками»). A setting stands where it acts: `width` and `fill` on desktop (a phone page takes the screen's
 * width and scrolls as a whole), `surface` and the bars' `background` on a phone (desktop colors stay), `divider`
 * on desktop without `fill` (a filled page does not scroll under its header) and, on a phone, under a glass or hard
 * header. The footer and its background follow the stage, as
 * what sits at the bottom of the screen (owner 09.11). A hidden setting keeps its choice; the preview takes its
 * default. */
export function PageOverviewDemo() {
  const [width, setWidth] = useState<PageWidth>('full');
  const [surface, setSurface] = useState<(typeof SURFACE_OPTIONS)[number]>('plain');
  const [top, setTop] = useState<BarBackground>('glass');
  const [divider, setDivider] = useState(true);
  const [leading, setLeading] = useState(false);
  const [subtitle, setSubtitle] = useState(false);
  const [actions, setActions] = useState(true);
  const [fill, setFill] = useState(false);
  const [footer, setFooter] = useState(false);
  const [bottom, setBottom] = useState<BarBackground>('soft');
  const phone = usePhoneRows();
  // On a phone a soft or blur header draws no line, so the divider is a desktop setting there; on a desktop a
  // filled page does not scroll under its header, so the line never comes and the divider is a phone setting
  const unlined = top === 'soft' || top === 'blur';
  const shownFill = !phone && fill;
  const title = <Page.Title>Orders</Page.Title>;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="width" options={WIDTH_OPTIONS} value={width} onChange={setWidth} desktopOnly />
        <Segments name="surface" options={SURFACE_OPTIONS} value={surface} onChange={setSurface} phoneOnly />
        <BarBackgroundRow name="background (top)" value={top} onChange={setTop} phoneOnly />
        <DemoControlBoolean name="divider" value={divider} onChange={setDivider} phoneOnly={fill} desktopOnly={unlined} />
        <DemoControlBoolean name="leading" value={leading} onChange={setLeading} />
        <DemoControlBoolean name="subtitle" value={subtitle} onChange={setSubtitle} />
        <DemoControlBoolean name="actions" value={actions} onChange={setActions} />
        <DemoControlBoolean name="fill" value={fill} onChange={setFill} desktopOnly />
      </div>
      <Frame>
        <Page style={HALF_WIDTHS} width={phone ? 'full' : width} surface={surface}>
          <Page.Header background={top} divider={(phone ? unlined : fill) ? true : divider}>
            <Page.Bar>
              {leading && (
                <Page.Leading>
                  <NavigationButton action="back" />
                </Page.Leading>
              )}
              {subtitle ? (
                <Page.Heading>
                  {title}
                  <Page.Subtitle>
                    <Badge color="info" size="sm" variant="outline">24 open</Badge>
                    <span>Updated now</span>
                  </Page.Subtitle>
                </Page.Heading>
              ) : title}
              {actions && (
                <Page.Actions>
                  <Button color="primary" pill size="md">New order</Button>
                </Page.Actions>
              )}
            </Page.Bar>
          </Page.Header>
          <Page.Content fill={shownFill}>
            {shownFill ? (
              <div className="min-h-0 flex-1 overflow-auto pb-6">
                <Rows />
              </div>
            ) : <Rows />}
          </Page.Content>
          {footer && (
            <Page.Footer background={bottom}>
              <Button color="primary" pill block>Export orders</Button>
            </Page.Footer>
          )}
        </Page>
      </Frame>
      <DemoControlsBottom style={controlsTableStyle}>
        <DemoControlBoolean name="footer" value={footer} onChange={setFooter} />
        {footer && <BarBackgroundRow name="background (bottom)" value={bottom} onChange={setBottom} phoneOnly />}
      </DemoControlsBottom>
    </>
  );
}
