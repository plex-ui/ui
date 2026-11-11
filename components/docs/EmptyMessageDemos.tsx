'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { ArrowUpRight, Explore, Plus } from '@plexui/ui/components/Icon';
import { TextLink } from '@plexui/ui/components/TextLink';
import { EmptyMessage } from '@plexui/ui/components/EmptyMessage';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';

const FILL_OPTIONS = ['static', 'absolute', 'none'] as const;
const SIZE_OPTIONS = ['md', 'sm'] as const;
const ALIGN_OPTIONS = ['center', 'start'] as const;
const COLOR_OPTIONS = ['secondary', 'danger', 'warning'] as const;
const ACTION_OPTIONS = ['one', 'two', 'link', 'none'] as const;

const preventDefault = (event: React.MouseEvent) => event.preventDefault();

function Segments<T extends string>({ name, options, value, onChange }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>
            {option}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );
}

/** The Overview, with every setting of the message: what the page's examples once showed one by one (Composition,
 * Error message, Warning message, No results, Compact, Left aligned) are its settings (owner 11.11: «в первом примере
 * можно сразу показать все со всеми настройками»). A message needs a title or a description, so `description` is
 * offered only with a title, as on the Alert page. The icon and the title take their own `color` (a warning icon over
 * a plain title, as the Warning message), each offered with its part. The icon's own `size` acts in a message of the
 * default size (a small message gives its icon the small badge). `actions` are buttons, two buttons, or a text link
 * (the Warning message's "Learn more"). A setting that is not offered keeps its choice and shows its default, as in
 * the Vue demo. */
export function EmptyMessageOverviewDemo() {
  const [fill, setFill] = useState<(typeof FILL_OPTIONS)[number]>('static');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [align, setAlign] = useState<(typeof ALIGN_OPTIONS)[number]>('center');
  const [icon, setIcon] = useState(true);
  const [iconSize, setIconSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [iconColor, setIconColor] = useState<(typeof COLOR_OPTIONS)[number]>('secondary');
  const [title, setTitle] = useState(true);
  const [titleColor, setTitleColor] = useState<(typeof COLOR_OPTIONS)[number]>('secondary');
  const [description, setDescription] = useState(true);
  const [actions, setActions] = useState<(typeof ACTION_OPTIONS)[number]>('one');
  const shownDescription = !title || description;
  const sizedIcon = size === 'md';
  const buttonSize = size === 'sm' ? 'md' : 'xl';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="fill" options={FILL_OPTIONS} value={fill} onChange={setFill} />
        <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
        <Segments name="align" options={ALIGN_OPTIONS} value={align} onChange={setAlign} />
        <DemoControlBoolean name="icon" value={icon} onChange={setIcon} />
        {icon && sizedIcon && <Segments name="iconSize" options={SIZE_OPTIONS} value={iconSize} onChange={setIconSize} />}
        {icon && <Segments name="iconColor" options={COLOR_OPTIONS} value={iconColor} onChange={setIconColor} />}
        <DemoControlBoolean name="title" value={title} onChange={setTitle} />
        {title && <Segments name="titleColor" options={COLOR_OPTIONS} value={titleColor} onChange={setTitleColor} />}
        {title && <DemoControlBoolean name="description" value={description} onChange={setDescription} />}
        <Segments name="actions" options={ACTION_OPTIONS} value={actions} onChange={setActions} />
      </div>
      <div
        data-demo-stage
        className="flex-1 w-full py-12 flex items-center justify-center"
        style={fill === 'absolute' ? { position: 'relative', minHeight: 200 } : undefined}
      >
        <EmptyMessage fill={fill} size={size} align={align}>
          {icon && (
            <EmptyMessage.Icon color={iconColor} size={sizedIcon ? iconSize : 'md'}>
              <Explore />
            </EmptyMessage.Icon>
          )}
          {title && <EmptyMessage.Title color={titleColor}>No projects yet</EmptyMessage.Title>}
          {shownDescription && <EmptyMessage.Description>Create your first project to get started</EmptyMessage.Description>}
          {actions === 'link' ? (
            <EmptyMessage.ActionRow className="text-sm">
              <TextLink href="#" onClick={preventDefault}>
                Learn more <ArrowUpRight />
              </TextLink>
            </EmptyMessage.ActionRow>
          ) : actions !== 'none' && (
            <EmptyMessage.ActionRow>
              <Button color="primary" size={buttonSize}>
                <Plus className="mr-[-2px]" />
                New project
              </Button>
              {actions === 'two' && <Button color="secondary" variant="outline" size={buttonSize}>Browse templates</Button>}
            </EmptyMessage.ActionRow>
          )}
        </EmptyMessage>
      </div>
    </>
  );
}
