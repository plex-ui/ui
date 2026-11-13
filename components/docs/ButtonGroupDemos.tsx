'use client';

import React, { useRef, useState } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { ButtonGroup } from '@plexui/ui/components/ButtonGroup';
import { Card } from '@plexui/ui/components/Card';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import {
  ArrowLeftSm,
  ArrowRight,
  ChevronDownMd,
  Clip,
  Copy,
  DotsHorizontal,
  FileCode,
  FileDocument,
  FileImage,
  Link,
  Mic,
  Minus,
  MinusLg,
  NotebookCheck,
  PencilSquare,
  Pens,
  Pin,
  Plus,
  PlusLg,
  PlusSm,
  Redo,
  SearchSm,
  Share,
  Sparkles,
  Tag,
  Undo,
} from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { Menu } from '@plexui/ui/components/Menu';
import { Page } from '@plexui/ui/components/Page';
import { Popover } from '@plexui/ui/components/Popover';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Select } from '@plexui/ui/components/Select';
import { Textarea } from '@plexui/ui/components/Textarea';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { usePhoneRows } from './PhoneRows';
import { Rows } from './ToolbarDemos';
import pageStyles from './PageDemos.module.css';

/* ------------------------------------------------------------------
 * Shared demo-control primitives (same shape ButtonDemos / InputDemos use)
 * ------------------------------------------------------------------ */

const SIZE_OPTIONS = ['sm', 'md', 'lg'] as const;
type DemoSize = (typeof SIZE_OPTIONS)[number];

/** `desktopOnly` where a phone group takes 44px at every size: beside a text field, or icon-only buttons alone. */
function SizeToggle({ value, onChange, desktopOnly = false }: { value: DemoSize; onChange: (v: DemoSize) => void; desktopOnly?: boolean }) {
  return (
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlRow name="size" desktopOnly={desktopOnly}>
        <SegmentedControl<DemoSize> value={value} onChange={onChange} aria-label="size" size="xs">
          {SIZE_OPTIONS.map((s) => (
            <SegmentedControl.Option key={s} value={s}>
              {s}
            </SegmentedControl.Option>
          ))}
        </SegmentedControl>
      </DemoControlRow>
    </div>
  );
}

function DemoStage({ children }: { children: React.ReactNode }) {
  return <div data-demo-stage>{children}</div>;
}


/** A phone screen in the frame of the Toolbar examples. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return <div data-demo-stage className={pageStyles.Stage}><div className={pageStyles.Frame}>{children}</div></div>;
}

const NOTE = [
  'Pack the tent, two sleeping bags and the small stove.',
  'Check the forecast on Friday morning before leaving.',
  'Fill both water bottles and the spare canister.',
  'Leave the route and the return time with a neighbour.',
];

/* ============================================================
   Overview — toolbar with nested groups + gap between subgroups
   ============================================================ */

export function ButtonGroupOverviewDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  // Phone: the bars of a note, as in Notes (IMG_5734, 5736): Back alone, the note's actions in one glass capsule
  // on top, the editing tools in one at the bottom beside New Note. A ButtonGroup in a Toolbar is that capsule.
  if (usePhoneRows()) {
    return (
      <PhoneFrame>
        <Page>
          <Toolbar>
            <Toolbar.Leading>
              <NavigationButton action="back" />
            </Toolbar.Leading>
            <Toolbar.Trailing>
              <ButtonGroup aria-label="Note actions">
                <Button color="secondary" variant="soft" uniform pill aria-label="Pin"><Pin /></Button>
                <Button color="secondary" variant="soft" uniform pill aria-label="Tag"><Tag /></Button>
                <Button color="secondary" variant="soft" uniform pill aria-label="More"><DotsHorizontal /></Button>
              </ButtonGroup>
            </Toolbar.Trailing>
          </Toolbar>
          <Page.Content>
            <div className="flex flex-col gap-3 text-[17px] leading-[22px]">
              <p className="text-[28px] leading-[34px] font-semibold">Weekend trip</p>
              {NOTE.map((line) => <p key={line}>{line}</p>)}
            </div>
          </Page.Content>
          <Toolbar placement="bottom">
            <Toolbar.Leading>
              <ButtonGroup aria-label="Editing tools">
                <Button color="secondary" variant="soft" uniform pill aria-label="Checklist"><NotebookCheck /></Button>
                <Button color="secondary" variant="soft" uniform pill aria-label="Attach"><Clip /></Button>
                <Button color="secondary" variant="soft" uniform pill aria-label="Markup"><Pens /></Button>
              </ButtonGroup>
            </Toolbar.Leading>
            <Toolbar.Trailing>
              <Button color="secondary" variant="soft" uniform pill aria-label="New note"><PencilSquare /></Button>
            </Toolbar.Trailing>
          </Toolbar>
        </Page>
      </PhoneFrame>
    );
  }
  return (
    <>
      <SizeToggle value={size} onChange={setSize} desktopOnly />
      <DemoStage>
      <ButtonGroup>
        <ButtonGroup>
          <Button
            variant="outline"
            color="secondary"
            pill={false}
            size={size}
            uniform
            aria-label="Go back"
          >
            <ArrowLeftSm />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" color="secondary" pill={false} size={size}>
            Pin
          </Button>
          <Button variant="outline" color="secondary" pill={false} size={size}>
            Tag
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" color="secondary" pill={false} size={size}>
            Bookmark
          </Button>
          <Button
            variant="outline"
            color="secondary"
            pill={false}
            size={size}
            uniform
            aria-label="More options"
          >
            <DotsHorizontal />
          </Button>
        </ButtonGroup>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}

/** A dotted canvas under the floating controls. */
const CANVAS: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  backgroundImage: 'radial-gradient(var(--color-border-strong) 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
};

/* ============================================================
   Orientation — vertical stack for +/- stepper
   ============================================================ */

export function ButtonGroupOrientationDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  // Phone: the iOS 27 kit's vertical Button Group (Toolbars, _Buttons - 48pt, Preferred Axis=Vertical) floating
  // over a canvas, as map controls do; `mobileMaterial="glass"` asks for the capsule outside a Toolbar. A phone takes
  // the large plus and minus (owner 13.11), at the bar's smaller box: the plus of a Contacts bar, 17.67 of ink.
  if (usePhoneRows()) {
    return (
      <PhoneFrame>
        <div className="relative h-full" style={CANVAS}>
          <ButtonGroup
            orientation="vertical"
            mobileMaterial="glass"
            aria-label="Zoom controls"
            className="absolute top-[calc(var(--safe-area-inset-top,0px)+8px)] right-4"
          >
            <Button color="secondary" variant="soft" uniform pill iconSize="sm" aria-label="Zoom in"><PlusLg /></Button>
            <Button color="secondary" variant="soft" uniform pill iconSize="sm" aria-label="Zoom out"><MinusLg /></Button>
          </ButtonGroup>
        </div>
      </PhoneFrame>
    );
  }
  return (
    <>
      <SizeToggle value={size} onChange={setSize} desktopOnly />
      <DemoStage>
      <ButtonGroup orientation="vertical" aria-label="Zoom controls">
        <Button
          variant="outline"
          color="secondary"
          pill={false}
          size={size}
          uniform
          aria-label="Zoom in"
        >
          <PlusSm />
        </Button>
        <Button
          variant="outline"
          color="secondary"
          pill={false}
          size={size}
          uniform
          aria-label="Zoom out"
        >
          <Minus />
        </Button>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}

/* ============================================================
   Separator — Copy | Paste with an explicit divider
   ============================================================ */

export function ButtonGroupSeparatorDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  // Phone: Undo and Redo in the top bar of a drawing, as Preview's document bar holds its symbols (iOS 27.2: Back,
  // the title, one capsule). In a Toolbar the group is that capsule, which draws no line between its buttons.
  if (usePhoneRows()) {
    return (
      <PhoneFrame>
        <Page>
          <Toolbar>
            <Toolbar.Leading>
              <NavigationButton action="back" />
            </Toolbar.Leading>
            <Toolbar.Title>Sketch</Toolbar.Title>
            <Toolbar.Trailing>
              <ButtonGroup aria-label="History">
                <Button color="secondary" variant="soft" uniform pill aria-label="Undo"><Undo /></Button>
                <ButtonGroup.Separator />
                <Button color="secondary" variant="soft" uniform pill aria-label="Redo"><Redo /></Button>
              </ButtonGroup>
            </Toolbar.Trailing>
          </Toolbar>
          <Page.Content style={CANVAS} />
        </Page>
      </PhoneFrame>
    );
  }
  return (
    <>
      <SizeToggle value={size} onChange={setSize} desktopOnly />
      <DemoStage>
      <ButtonGroup>
        <Button variant="soft" color="secondary" pill={false} size={size}>
          <Undo /> Undo
        </Button>
        <ButtonGroup.Separator />
        <Button variant="soft" color="secondary" pill={false} size={size}>
          Redo <Redo />
        </Button>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}

/* ============================================================
   Input — Input joined with a Button
   ============================================================ */

export function ButtonGroupInputDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  // Phone: the bottom bar of a list, as Contacts holds its search field and New Contact (iOS 27.2): in a Toolbar the
  // field and the button come apart, each a glass shape of the bar's 48px, 12px apart. A phone searches as you type,
  // so the button beside the field is an action of its own.
  if (usePhoneRows()) {
    return (
      <PhoneFrame>
        <Page>
          <Toolbar>
            <Toolbar.Leading>
              <NavigationButton action="back" />
            </Toolbar.Leading>
            <Toolbar.Title>Orders</Toolbar.Title>
          </Toolbar>
          <Page.Content>
            <Rows />
          </Page.Content>
          <Toolbar placement="bottom">
            <Toolbar.Content fill>
              <ButtonGroup aria-label="Search orders">
                <Input variant="soft" pill placeholder="Search" aria-label="Search orders" startAdornment={<SearchSm />} />
                <Button color="secondary" variant="soft" uniform pill iconSize="sm" aria-label="New order"><PlusLg /></Button>
              </ButtonGroup>
            </Toolbar.Content>
          </Toolbar>
        </Page>
      </PhoneFrame>
    );
  }
  return (
    <>
      <SizeToggle value={size} onChange={setSize} desktopOnly />
      <DemoStage>
      <ButtonGroup>
        <Input placeholder="Search docs..." size={size} />
        <Button variant="outline" color="secondary" pill={false} size={size} aria-label="Search">
          <SearchSm />
        </Button>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}

/* ============================================================
   Input Group — message composer with leading action + inline voice toggle
   ============================================================ */

export function ButtonGroupInputGroupDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const voice = (
    <Input.AdornmentButton
      color={voiceEnabled ? 'caution' : undefined}
      aria-label="Toggle voice mode"
      aria-pressed={voiceEnabled}
      onClick={() => setVoiceEnabled((prev) => !prev)}
    >
      <Mic />
    </Input.AdornmentButton>
  );
  // Phone: the composer of Messages (iOS 27.2, New Message) at the bottom of the screen. With
  // mobileMaterial="glass" the plus is a 40px glass circle and the field a 40px glass capsule, 12px apart.
  if (usePhoneRows()) {
    return (
      <PhoneFrame>
        <Page>
          <Toolbar>
            <Toolbar.Title>New Message</Toolbar.Title>
            <Toolbar.Trailing>
              <NavigationButton action="close" />
            </Toolbar.Trailing>
          </Toolbar>
          <Page.Content />
          <Page.Footer>
            <ButtonGroup mobileMaterial="glass" aria-label="Message">
              <ButtonGroup>
                <Button color="secondary" variant="soft" uniform pill iconSize="sm" aria-label="Add attachment"><PlusLg /></Button>
              </ButtonGroup>
              <ButtonGroup>
                <Input
                  pill
                  aria-label="Message"
                  placeholder={voiceEnabled ? 'Listening…' : 'Text Message'}
                  disabled={voiceEnabled}
                  endAdornment={voice}
                />
              </ButtonGroup>
            </ButtonGroup>
          </Page.Footer>
        </Page>
      </PhoneFrame>
    );
  }

  return (
    <>
      <SizeToggle value={size} onChange={setSize} desktopOnly />
      <DemoStage>
      <ButtonGroup style={{ width: '100%', maxWidth: 280 }}>
        <ButtonGroup>
          <Button
            variant="outline"
            color="secondary"
            pill
            size={size}
            uniform
            aria-label="Add attachment"
          >
            <Plus />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Input
            pill
            size={size}
            placeholder={voiceEnabled ? 'Recording your idea…' : 'Describe a component…'}
            disabled={voiceEnabled}
            endAdornment={voice}
          />
        </ButtonGroup>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}

/* ============================================================
   Dropdown Menu — primary action + chevron trigger wired to Menu
   ============================================================ */

function ExportMenuItems() {
  return (
    <>
      <Menu.Item onSelect={() => {}}>
        <FileImage /> PNG image
      </Menu.Item>
      <Menu.Item onSelect={() => {}}>
        <FileCode /> SVG vector
      </Menu.Item>
      <Menu.Item onSelect={() => {}}>
        <FileDocument /> PDF document
      </Menu.Item>
      <Menu.Separator />
      <Menu.Item onSelect={() => {}}>
        <Copy /> Copy as code
      </Menu.Item>
      <Menu.Item onSelect={() => {}}>
        <Link /> Copy share link
      </Menu.Item>
    </>
  );
}

/** A phone screen whose top bar holds a group: Back, the title and the group, as Preview's document bar (iOS 27.2). */
function BarScreen({ title, group, children }: { title: string; group: React.ReactNode; children?: React.ReactNode }) {
  return (
    <PhoneFrame>
      <Page>
        <Toolbar>
          <Toolbar.Leading>
            <NavigationButton action="back" />
          </Toolbar.Leading>
          <Toolbar.Title>{title}</Toolbar.Title>
          <Toolbar.Trailing>{group}</Toolbar.Trailing>
        </Toolbar>
        <Page.Content>{children}</Page.Content>
      </Page>
    </PhoneFrame>
  );
}

const REPORT = [
  'Orders grew 12% over the quarter, led by the new subscription plans.',
  'Refunds fell to 1.4% after the checkout changes in August.',
  'Support answered 94% of tickets within a day.',
];

function ReportText() {
  return (
    <div className="flex flex-col gap-3 text-[17px] leading-[22px]">
      {REPORT.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}

export function ButtonGroupDropdownMenuDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  // Phone: the action and its menu as symbols in one capsule of the top bar, as iOS 27.2 sets a bar's symbols (+,
  // Share, More in one glass). iOS never puts a label and a symbol in one capsule, and a bar opens a menu from More (…),
  // never from a bare chevron (owner 13.11).
  if (usePhoneRows()) {
    return (
      <BarScreen
        title="Report"
        group={
          <ButtonGroup aria-label="Export">
            <Button color="secondary" variant="soft" uniform pill aria-label="Export"><Share /></Button>
            <Menu>
              <Menu.Trigger>
                <Button color="secondary" variant="soft" uniform pill aria-label="More export options"><DotsHorizontal /></Button>
              </Menu.Trigger>
              <Menu.Content align="end" minWidth={200}>
                <ExportMenuItems />
              </Menu.Content>
            </Menu>
          </ButtonGroup>
        }
      >
        <ReportText />
      </BarScreen>
    );
  }
  return (
    <>
      <SizeToggle value={size} onChange={setSize} desktopOnly />
      <DemoStage>
      <ButtonGroup>
        <Button variant="outline" color="secondary" pill={false} size={size}>
          Export
        </Button>
        <Menu>
          <Menu.Trigger>
            <Button
              variant="outline"
              color="secondary"
              pill={false}
              size={size}
              uniform
              aria-label="More export options"
            >
              <ChevronDownMd />
            </Button>
          </Menu.Trigger>
          <Menu.Content align="end" minWidth={200}>
            <ExportMenuItems />
          </Menu.Content>
        </Menu>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}

/* ============================================================
   Select — currency picker joined to an amount input + send
   ============================================================ */

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg · Kilogram' },
  { value: 'lb', label: 'lb · Pound' },
  { value: 'oz', label: 'oz · Ounce' },
];

/** The units as a phone row names them: the row's value is the whole word. */
const UNIT_NAMES = [
  { value: 'kg', label: 'Kilograms' },
  { value: 'lb', label: 'Pounds' },
  { value: 'oz', label: 'Ounces' },
];

export function ButtonGroupSelectDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  const [unit, setUnit] = useState('kg');
  // Phone: iOS has no bar of a menu, a field and a button (owner 13.11: «это боттом бар разве такой бывает?»). An iOS
  // 27.2 form sets a value and its unit as rows of a list: the unit is the pop-up at the end of its row, as on the
  // Select page, and the bar's confirm logs the weight.
  if (usePhoneRows()) {
    return (
      <PhoneFrame>
        <Page surface="grouped">
          <Toolbar>
            <Toolbar.Leading>
              <NavigationButton action="close" />
            </Toolbar.Leading>
            <Toolbar.Title>Weight</Toolbar.Title>
            <Toolbar.Trailing>
              <NavigationButton action="confirm" aria-label="Log weight" />
            </Toolbar.Trailing>
          </Toolbar>
          <Page.Content>
            <FieldGroup>
              <Field row label="Weight">
                <Input placeholder="2.50" inputMode="decimal" />
              </Field>
              <Field row label="Unit">
                <Select options={UNIT_NAMES} value={unit} onChange={(opt) => setUnit(opt.value)} block={false} align="end" />
              </Field>
            </FieldGroup>
          </Page.Content>
        </Page>
      </PhoneFrame>
    );
  }

  return (
    <>
      <SizeToggle value={size} onChange={setSize} desktopOnly />
      <DemoStage>
      <ButtonGroup>
        <ButtonGroup>
          <Select
            options={UNIT_OPTIONS}
            value={unit}
            onChange={(opt) => setUnit(opt.value)}
            variant="outline"
            pill={false}
            size={size}
            block={false}
          />
          <Input placeholder="2.50" size={size} inputMode="decimal" />
        </ButtonGroup>
        <ButtonGroup>
          <Button
            variant="outline"
            color="secondary"
            pill={false}
            size={size}
            uniform
            aria-label="Log weight"
          >
            <ArrowRight />
          </Button>
        </ButtonGroup>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}

/* ============================================================
   Popover — trailing trigger opens a popover panel
   ============================================================ */

function GeneratePanel() {
  return (
    <Card variant="ghost" size="sm">
      <Card.Header>
        <Card.Title>Generate a component</Card.Title>
        <Card.Description>Describe what to build in plain English.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Textarea placeholder="A login form with email and password…" rows={3} />
      </Card.Content>
      <Card.Footer>
        <Card.Description>Plex will draft the code and preview it live.</Card.Description>
      </Card.Footer>
    </Card>
  );
}

export function ButtonGroupPopoverDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLDivElement>(null);
  // Phone: as the Dropdown menu, the action and More as symbols in one capsule of the top bar. A panel of fields from a
  // bar button is a sheet on a phone, as the Popover page's Column configuration opens its options (owner 13.11:
  // no hand-set padding; the sheet's header and body set it). Its field is a row of a grouped list, as Dialog's Edit
  // profile: a text area is a vertical row with a ghost Textarea, the note is the list's footer and the header's
  // confirm runs it (owner 13.11: «нет таких инпутов в plexui»). Focus goes to the title, so no keyboard comes up.
  if (usePhoneRows()) {
    return (
      <BarScreen
        title="Draft"
        group={
          <ButtonGroup aria-label="Generate">
            <Button color="secondary" variant="soft" uniform pill aria-label="Generate"><Sparkles /></Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <Dialog.Trigger>
                <Button color="secondary" variant="soft" uniform pill aria-label="More generate options"><DotsHorizontal /></Button>
              </Dialog.Trigger>
              <Dialog.Content mobileVariant="sheet" surface="grouped" onOpenAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
                <Dialog.Header>
                  <div ref={heading} tabIndex={-1} className="outline-none"><Dialog.Title>Generate a component</Dialog.Title></div>
                  <Dialog.Description className="sr-only">Describe what to build in plain English.</Dialog.Description>
                  <Dialog.HeaderAction>
                    <NavigationButton action="confirm" aria-label="Generate" onClick={() => setOpen(false)} />
                  </Dialog.HeaderAction>
                </Dialog.Header>
                <Dialog.Body>
                  <FieldGroup footer="Describe what to build in plain English.">
                    <Field row orientation="vertical" label="Component" hideLabel>
                      <Textarea variant="ghost" placeholder="A login form with email and password…" rows={3} />
                    </Field>
                  </FieldGroup>
                </Dialog.Body>
              </Dialog.Content>
            </Dialog>
          </ButtonGroup>
        }
      >
        <ReportText />
      </BarScreen>
    );
  }
  return (
    <>
      <SizeToggle value={size} onChange={setSize} desktopOnly />
      <DemoStage>
      <ButtonGroup>
        <Button variant="outline" color="secondary" pill={false} size={size}>
          <Sparkles /> Generate
        </Button>
        <Popover>
          <Popover.Trigger>
            <Button
              variant="outline"
              color="secondary"
              pill={false}
              size={size}
              uniform
              aria-label="More generate options"
            >
              <ChevronDownMd />
            </Button>
          </Popover.Trigger>
          <Popover.Content minWidth={320} side="bottom" align="end" className="p-4">
            <GeneratePanel />
          </Popover.Content>
        </Popover>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}
