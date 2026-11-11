'use client';

import React, { useState } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { ButtonGroup } from '@plexui/ui/components/ButtonGroup';
import { Card } from '@plexui/ui/components/Card';
import {
  ArrowLeftSm,
  ArrowRight,
  ArrowRightSm,
  ChevronDownMd,
  Clip,
  Copy,
  DotsHorizontal,
  FileCode,
  FileDocument,
  FileImage,
  Filter,
  Link,
  Mic,
  Minus,
  NotebookCheck,
  PencilSquare,
  Pens,
  Pin,
  Plus,
  PlusSm,
  Redo,
  SearchSm,
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
  // over a canvas, as map controls do; `mobileMaterial="glass"` asks for the capsule outside a Toolbar.
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
            <Button color="secondary" variant="soft" uniform pill aria-label="Zoom in"><Plus /></Button>
            <Button color="secondary" variant="soft" uniform pill aria-label="Zoom out"><Minus /></Button>
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
   Nested — two groups side-by-side (pagination + arrow nav)
   ============================================================ */

export function ButtonGroupNestedDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  return (
    <>
      <SizeToggle value={size} onChange={setSize} />
      <DemoStage>
      <ButtonGroup aria-label="Pager">
        <ButtonGroup>
          <Button variant="outline" color="secondary" pill={false} size={size}>
            1
          </Button>
          <Button variant="outline" color="secondary" pill={false} size={size}>
            2
          </Button>
          <Button variant="outline" color="secondary" pill={false} size={size}>
            3
          </Button>
          <Button variant="outline" color="secondary" pill={false} size={size}>
            4
          </Button>
          <Button variant="outline" color="secondary" pill={false} size={size}>
            5
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button
            variant="outline"
            color="secondary"
            pill={false}
            size={size}
            uniform
            aria-label="Previous page"
          >
            <ArrowLeftSm />
          </Button>
          <Button
            variant="outline"
            color="secondary"
            pill={false}
            size={size}
            uniform
            aria-label="Next page"
          >
            <ArrowRightSm />
          </Button>
        </ButtonGroup>
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
  return (
    <>
      <SizeToggle value={size} onChange={setSize} />
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
   Split — primary action + inline extra-action trigger
   ============================================================ */

export function ButtonGroupSplitDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  return (
    <>
      <SizeToggle value={size} onChange={setSize} />
      <DemoStage>
      <ButtonGroup>
        <Button variant="soft" color="secondary" pill={false} size={size}>
          <Filter /> Filter
        </Button>
        <ButtonGroup.Separator />
        <Button
          variant="soft"
          color="secondary"
          pill={false}
          size={size}
          uniform
          aria-label="Add filter"
        >
          <Plus />
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
            endAdornment={
              <Input.AdornmentButton
                color={voiceEnabled ? 'caution' : undefined}
                aria-label="Toggle voice mode"
                aria-pressed={voiceEnabled}
                onClick={() => setVoiceEnabled((prev) => !prev)}
              >
                <Mic />
              </Input.AdornmentButton>
            }
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

export function ButtonGroupDropdownMenuDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  return (
    <>
      <SizeToggle value={size} onChange={setSize} />
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

export function ButtonGroupSelectDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  const [unit, setUnit] = useState('kg');

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

export function ButtonGroupPopoverDemo() {
  const [size, setSize] = useState<DemoSize>('sm');
  return (
    <>
      <SizeToggle value={size} onChange={setSize} />
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
          </Popover.Content>
        </Popover>
      </ButtonGroup>
      </DemoStage>
    </>
  );
}
