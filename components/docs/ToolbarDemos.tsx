'use client';

import { useState, type ReactNode } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { DotsHorizontal, Filter, Plus, PlusLg, Search, SearchSm, Translate } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { Page } from '@plexui/ui/components/Page';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Toolbar, type BarBackground, type ToolbarTitleAlign, type ToolbarTitleStyle } from '@plexui/ui/components/Toolbar';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from './ButtonDemos';
import { DemoControlsBottom, usePreviewEmbed } from './PreviewEmbed';
import s from './PageDemos.module.css';
import t from './ToolbarDemos.module.css';

const ROWS = Array.from({ length: 24 }, (_, index) => `Order ${1024 + index}`);

function Frame({ children }: { children: ReactNode }) {
  return <div data-demo-stage className={s.Stage}><div className={s.Frame}>{children}</div></div>;
}

/** Orders in the rows of a FieldGroup: an iOS list on a phone, a bordered list on a desktop. */
export function Rows() {
  return (
    <FieldGroup>
      {ROWS.map((row) => (
        <div key={row} data-row className={t.Row}>
          <span>{row}</span>
          <span className={t.Value}>Paid</span>
        </div>
      ))}
    </FieldGroup>
  );
}

const TITLE_STYLES = ['inline', 'large', 'compact-large', 'compact-medium'] as const satisfies readonly ToolbarTitleStyle[];
const TITLE_ALIGNS = ['center', 'start'] as const satisfies readonly ToolbarTitleAlign[];
// A row of the bar: the views of the orders, as a chat list shows its folders under its bar (owner 13.11)
const VIEWS = ['all', 'paid', 'unpaid', 'refunds'] as const;
// What the bottom bar holds: buttons round a main action, a search field and a plus, one action across the row
const BOTTOM = ['none', 'buttons', 'search', 'action'] as const;

/**
 * The Overview, with every setting of the bars: what the page's examples once showed one by one (Titles, Group,
 * Search, Bottom, Background) are its settings (owner 11.11: «в первом примере можно сразу показать все со всеми
 * настройками»). The top bar's controls stand above the preview and the bottom bar's under it (owner 09.11). Disabled
 * (a form's Cancel and Done), Search in the content (an Input under a large title) and Sheet (another host) keep
 * examples of their own: other content.
 */
export function ToolbarOverviewDemo() {
  const [search, setSearch] = useState(false);
  const [title, setTitle] = useState(true);
  const [titleStyle, setTitleStyle] = useState<ToolbarTitleStyle>('inline');
  const [titleAlign, setTitleAlign] = useState<ToolbarTitleAlign>('center');
  const [subtitle, setSubtitle] = useState(false);
  const [group, setGroup] = useState(false);
  const [row, setRow] = useState(false);
  const [view, setView] = useState<(typeof VIEWS)[number]>('all');
  const [topBackground, setTopBackground] = useState<BarBackground>('glass');
  const [bottom, setBottom] = useState<(typeof BOTTOM)[number]>('none');
  const [bottomBackground, setBottomBackground] = useState<BarBackground>('soft');
  // A title, unless a search field takes its place or the bar holds its controls alone
  const named = !search && title;
  const compact = named && (titleStyle === 'compact-large' || titleStyle === 'compact-medium');
  // One search field to a screen: with one in the top bar, the bottom bar does not offer its own (and falls back)
  const bottomOptions = search ? BOTTOM.filter((option) => option !== 'search') : BOTTOM;
  const shownBottom = search && bottom === 'search' ? 'none' : bottom;

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="search" value={search} onChange={setSearch} />
        {!search && <DemoControlBoolean name="title" value={title} onChange={setTitle} />}
        {named && <Segments name="titleStyle" options={TITLE_STYLES} value={titleStyle} onChange={setTitleStyle} />}
        {named && titleStyle === 'inline' && <Segments name="titleAlign" options={TITLE_ALIGNS} value={titleAlign} onChange={setTitleAlign} />}
        {named && !compact && <DemoControlBoolean name="subtitle" value={subtitle} onChange={setSubtitle} />}
        {!search && <DemoControlBoolean name="group" value={group} onChange={setGroup} />}
        <DemoControlBoolean name="row" value={row} onChange={setRow} />
        <BarBackgroundRow name="background (top)" value={topBackground} onChange={setTopBackground} />
      </div>
      <Frame>
        <Page surface="grouped">
          <Toolbar titleStyle={named ? titleStyle : undefined} titleAlign={named && titleStyle === 'inline' ? titleAlign : undefined} background={topBackground}>
            {search ? (
              <Toolbar.Content fill>
                <Input variant="soft" pill placeholder="Search" aria-label="Search orders" startAdornment={<SearchSm />} />
              </Toolbar.Content>
            ) : (
              <>
                {!compact && (
                  <Toolbar.Leading>
                    <NavigationButton action="back" />
                  </Toolbar.Leading>
                )}
                {named && <Toolbar.Title subtitle={subtitle && !compact ? '24 orders' : undefined}>Orders</Toolbar.Title>}
              </>
            )}
            <Toolbar.Trailing>
              {search ? (
                <NavigationButton action="close" aria-label="Close search" />
              ) : group ? (
                <Toolbar.Group aria-label="Order actions">
                  <Button color="secondary" variant="soft" uniform pill aria-label="Translate"><Translate /></Button>
                  <Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>
                </Toolbar.Group>
              ) : (
                <NavigationButton action={named && titleStyle === 'large' ? 'confirm' : 'close'} />
              )}
            </Toolbar.Trailing>
            {row && (
              <Toolbar.Row>
                <SegmentedControl aria-label="Orders" value={view} onChange={setView}>
                  <SegmentedControl.Option value="all">All</SegmentedControl.Option>
                  <SegmentedControl.Option value="paid">Paid</SegmentedControl.Option>
                  <SegmentedControl.Option value="unpaid" badge={{ content: 3, pill: true }}>Unpaid</SegmentedControl.Option>
                  <SegmentedControl.Option value="refunds">Refunds</SegmentedControl.Option>
                </SegmentedControl>
              </Toolbar.Row>
            )}
          </Toolbar>
          <Page.Content>
            <Rows />
          </Page.Content>
          {shownBottom !== 'none' && (
            <Toolbar placement="bottom" background={bottomBackground}>
              {shownBottom === 'buttons' ? (
                <>
                  <Toolbar.Leading>
                    <Button color="secondary" variant="soft" uniform pill aria-label="Filter"><Filter /></Button>
                  </Toolbar.Leading>
                  <Toolbar.Content>
                    <Button color="primary" pill>New order</Button>
                  </Toolbar.Content>
                  {/* With a search field in the top bar, no second way to search */}
                  {!search && (
                    <Toolbar.Trailing>
                      <Button color="secondary" variant="soft" uniform pill aria-label="Search"><Search /></Button>
                    </Toolbar.Trailing>
                  )}
                </>
              ) : shownBottom === 'search' ? (
                <>
                  <Toolbar.Content fill>
                    <Input variant="soft" pill placeholder="Search" aria-label="Search orders" startAdornment={<SearchSm />} />
                  </Toolbar.Content>
                  <Toolbar.Trailing>
                    <Button color="secondary" variant="soft" uniform pill iconSize="sm" aria-label="New order"><PlusLg /></Button>
                  </Toolbar.Trailing>
                </>
              ) : (
                <Toolbar.Content fill>
                  <Button color="primary" pill block><Plus /> New order</Button>
                </Toolbar.Content>
              )}
            </Toolbar>
          )}
        </Page>
      </Frame>
      {/* The bottom bar's controls stand under the preview, on its side (owner 09.11) */}
      <DemoControlsBottom style={controlsTableStyle}>
        <Segments name="bottom" options={bottomOptions} value={shownBottom} onChange={setBottom} />
        {shownBottom !== 'none' && <BarBackgroundRow name="background (bottom)" value={bottomBackground} onChange={setBottomBackground} />}
      </DemoControlsBottom>
    </>
  );
}

/** A search field under a large title, at the top of the content, as Files and a search tab draw it. */
export function ToolbarSearchLargeTitleDemo() {
  const [query, setQuery] = useState('');
  return (
    <Frame>
      <Page surface="grouped">
        <Toolbar titleStyle="large">
          <Toolbar.Title>Orders</Toolbar.Title>
          <Toolbar.Trailing>
            <Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>
          </Toolbar.Trailing>
        </Toolbar>
        <Page.Content>
          <Input
            type="search"
            variant="soft"
            pill
            placeholder="Search"
            aria-label="Search orders"
            startAdornment={<SearchSm />}
            value={query}
            onChange={(evt) => setQuery(evt.target.value)}
            onClear={() => setQuery('')}
            className="mb-2.5"
          />
          <Rows />
        </Page.Content>
      </Page>
    </Frame>
  );
}

export const BAR_BACKGROUNDS = ['soft', 'hard', 'glass', 'blur'] as const satisfies readonly BarBackground[];

/** One `background` row of the bar demos: a SegmentedControl over the bar backgrounds. */
export function BarBackgroundRow({ name, value, onChange, phoneOnly = false }: { name: string; value: BarBackground; onChange: (value: BarBackground) => void; phoneOnly?: boolean }) {
  return (
    <DemoControlRow name={name} phoneOnly={phoneOnly}>
      <SegmentedControl<BarBackground> aria-label={name} size="xs" value={value} onChange={onChange}>
        {BAR_BACKGROUNDS.map((background) => <SegmentedControl.Option key={background} value={background}>{background}</SegmentedControl.Option>)}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/**
 * The `background` controls of the bar demos around their stage: the top and the bottom bar each take their own,
 * glass and soft by default as the bars themselves, and each control stands on the side of its bar (owner 09.11).
 */
export function BarBackgroundControls({ top, onTopChange, bottom, onBottomChange, phoneOnly = false, children }: { top: BarBackground; onTopChange: (value: BarBackground) => void; bottom: BarBackground; onBottomChange: (value: BarBackground) => void; phoneOnly?: boolean; children: React.ReactNode }) {
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <BarBackgroundRow name="background (top)" value={top} onChange={onTopChange} phoneOnly={phoneOnly} />
      </div>
      {children}
      <DemoControlsBottom style={controlsTableStyle}>
        <BarBackgroundRow name="background (bottom)" value={bottom} onChange={onBottomChange} phoneOnly={phoneOnly} />
      </DemoControlsBottom>
    </>
  );
}

export function ToolbarDisabledDemo() {
  const [disabled, setDisabled] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <Frame>
        <Page surface="grouped">
          <Toolbar>
            <Toolbar.Leading>
              <Button color="secondary" variant="soft" pill>Cancel</Button>
            </Toolbar.Leading>
            <Toolbar.Title>New order</Toolbar.Title>
            <Toolbar.Trailing>
              <NavigationButton action="confirm" disabled={disabled} />
            </Toolbar.Trailing>
          </Toolbar>
          <Page.Content>
            <Rows />
          </Page.Content>
          <Toolbar placement="bottom">
            <Toolbar.Leading>
              <Button color="secondary" variant="soft" uniform pill aria-label="Filter" disabled={disabled}><Filter /></Button>
            </Toolbar.Leading>
            <Toolbar.Content>
              <Button color="primary" pill disabled={disabled}>Place order</Button>
            </Toolbar.Content>
            <Toolbar.Trailing>
              <Toolbar.Group aria-label="Order actions">
                <Button color="secondary" variant="soft" uniform pill aria-label="Translate" disabled={disabled}><Translate /></Button>
                <Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>
              </Toolbar.Group>
            </Toolbar.Trailing>
          </Toolbar>
        </Page>
      </Frame>
    </>
  );
}

export function ToolbarSheetDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  const [open, setOpen] = useState(phonePreview);

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <Dialog open={phonePreview || open} onOpenChange={setOpen}>
        <Dialog.Trigger>
          <Button color="secondary" variant="outline">Show orders</Button>
        </Dialog.Trigger>
        <Dialog.Content mobileVariant="sheet" surface="grouped" onOpenAutoFocus={(event) => { if (phonePreview) event.preventDefault(); }}>
          <Toolbar>
            <Toolbar.Leading>
              <Dialog.Close>
                <NavigationButton action="close" />
              </Dialog.Close>
            </Toolbar.Leading>
            <Toolbar.Title>Orders</Toolbar.Title>
          </Toolbar>
          <Dialog.Header>
            <Dialog.Title>Orders</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Rows />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
