'use client';

import React, { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { ArrowUpRight, Explore, Group, Mic, Plus, Search, Sparkle } from '@plexui/ui/components/Icon';
import { TextLink } from '@plexui/ui/components/TextLink';
import { Card } from '@plexui/ui/components/Card';
import { EmptyMessage } from '@plexui/ui/components/EmptyMessage';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';

const FILL_OPTIONS = ['static', 'absolute', 'none'] as const;
const COLOR_OPTIONS = ['secondary', 'danger', 'warning'] as const;
const SIZE_OPTIONS = ['sm', 'md'] as const;

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',
  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

const CONTENT_OPTIONS = ['title + description', 'title', 'description'] as const;
const ICON_OPTIONS = ['on', 'off'] as const;

export function EmptyMessageBaseDemo() {
  const [fill, setFill] = useState<(typeof FILL_OPTIONS)[number]>('static');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('secondary');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [content, setContent] = useState<(typeof CONTENT_OPTIONS)[number]>('title + description');
  const [icon, setIcon] = useState<(typeof ICON_OPTIONS)[number]>('on');

  const showIcon = icon === 'on';
  const showTitle = content === 'title' || content === 'title + description';
  const showDescription = content === 'description' || content === 'title + description';

  const stageContent = (
    <EmptyMessage fill={fill}>
      {showIcon && (
        <EmptyMessage.Icon color={color} size={size}>
          <Explore />
        </EmptyMessage.Icon>
      )}
      {showTitle && (
        <EmptyMessage.Title color={color}>No projects yet</EmptyMessage.Title>
      )}
      {showDescription && (
        <EmptyMessage.Description>
          Create your first project to get started
        </EmptyMessage.Description>
      )}
      <EmptyMessage.ActionRow>
        <Button color="primary" onClick={() => {}} size={size === 'sm' ? 'md' : 'lg'}>
          <Plus className="mr-[-2px]" />
          New project
        </Button>
      </EmptyMessage.ActionRow>
    </EmptyMessage>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="fill">
          <SegmentedControl<(typeof FILL_OPTIONS)[number]>
            value={fill}
            onChange={setFill}
            aria-label="fill"
            size="xs"
          >
            {FILL_OPTIONS.map((f) => (
              <SegmentedControl.Option key={f} value={f}>
                {f}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="color">
          <SegmentedControl<(typeof COLOR_OPTIONS)[number]>
            value={color}
            onChange={setColor}
            aria-label="color"
            size="xs"
          >
            {COLOR_OPTIONS.map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZE_OPTIONS)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZE_OPTIONS.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="icon">
          <SegmentedControl<(typeof ICON_OPTIONS)[number]>
            value={icon}
            onChange={setIcon}
            aria-label="icon"
            size="xs"
          >
            {ICON_OPTIONS.map((i) => (
              <SegmentedControl.Option key={i} value={i}>
                {i}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="content">
          <SegmentedControl<(typeof CONTENT_OPTIONS)[number]>
            value={content}
            onChange={setContent}
            aria-label="content"
            size="xs"
          >
            {CONTENT_OPTIONS.map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div
        data-demo-stage
        className="flex-1 w-full py-12 flex items-center justify-center"
        style={fill === 'absolute' ? { position: 'relative', minHeight: 200 } : undefined}
      >
        {stageContent}
      </div>
    </>
  );
}

export function EmptyMessageErrorDemo() {
  return (
    <EmptyMessage>
      <EmptyMessage.Icon color="danger">
        <Mic />
      </EmptyMessage.Icon>
      <EmptyMessage.Title color="danger">
        Enable microphone access in your browser&apos;s settings.
      </EmptyMessage.Title>
    </EmptyMessage>
  );
}

export function EmptyMessageEmptyDemo() {
  return (
    <div className="w-full">
      <EmptyMessage fill="none">
        <EmptyMessage.Icon size="sm">
          <Search />
        </EmptyMessage.Icon>
        <EmptyMessage.Description>
          No icons found matching <span className="font-semibold">&quot;pizza&quot;</span>
        </EmptyMessage.Description>
      </EmptyMessage>
    </div>
  );
}

export function EmptyMessageWarningDemo() {
  return (
    <EmptyMessage>
      <EmptyMessage.Icon color="warning">
        <Sparkle />
      </EmptyMessage.Icon>
      <EmptyMessage.Title>o1-preview is in beta</EmptyMessage.Title>
      <EmptyMessage.Description>
        System instructions and model configuration are not available yet. Responses may take
        longer.
      </EmptyMessage.Description>
      <EmptyMessage.ActionRow className="text-sm">
        <TextLink href="/">
          Learn more
          <ArrowUpRight />
        </TextLink>
      </EmptyMessage.ActionRow>
    </EmptyMessage>
  );
}

export function EmptyMessageCompactDemo() {
  return (
    <div className="w-[320px]">
      <Card>
        <Card.Header>
          <Card.Title>Members</Card.Title>
        </Card.Header>
        <Card.Content>
          <EmptyMessage size="sm" fill="none">
            <EmptyMessage.Icon size="sm">
              <Group />
            </EmptyMessage.Icon>
            <EmptyMessage.Title>No members yet</EmptyMessage.Title>
            <EmptyMessage.Description>Invite people to work on this project.</EmptyMessage.Description>
            <EmptyMessage.ActionRow>
              <Button color="secondary" variant="soft" size="sm">
                Invite
              </Button>
            </EmptyMessage.ActionRow>
          </EmptyMessage>
        </Card.Content>
      </Card>
    </div>
  );
}

export function EmptyMessageStartDemo() {
  return (
    <div className="w-[320px]">
      <Card>
        <Card.Header>
          <Card.Title>Tags</Card.Title>
        </Card.Header>
        <Card.Content>
          <EmptyMessage size="sm" align="start" fill="none">
            <EmptyMessage.Description>No tags added.</EmptyMessage.Description>
          </EmptyMessage>
        </Card.Content>
      </Card>
    </div>
  );
}
