'use client';

import { useState } from 'react';
import { ProgressSteps } from '@plexui/ui/components/ProgressSteps';
import { Button } from '@plexui/ui/components/Button';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Bolt, Email, Globe, Users } from '@plexui/ui/components/Icon';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { usePhoneRows } from './PhoneRows';
import { SliderValueControl } from './SliderValueControl';

const steps = [
  { title: 'Your details', description: 'Please provide your name and email', icon: <Email /> },
  { title: 'Company details', description: 'A few details about your company', icon: <Globe /> },
  { title: 'Invite your team', description: 'Start collaborating with your team', icon: <Users /> },
  { title: 'Add your socials', description: 'Share posts to your social accounts', icon: <Bolt /> },
];

const VARIANT_OPTIONS = ['default', 'minimal'] as const;
const ORIENTATION_OPTIONS = ['horizontal', 'vertical'] as const;
const SIZE_OPTIONS = ['sm', 'md', 'lg'] as const;
const COLOR_OPTIONS = ['default', 'success'] as const;
const CONNECTOR_OPTIONS = ['solid', 'dashed'] as const;
// The text of each step: its title and description, the title alone, or none (the indicators alone, when the step's
// details are shown elsewhere)
const TEXT_OPTIONS = ['full', 'title', 'none'] as const;

function Segments<T extends string>({ name, options, value, onChange, desktopOnly = false }: { name: string; options: readonly T[]; value: T; onChange: (value: T) => void; desktopOnly?: boolean }) {
  return (
    <DemoControlRow name={name} desktopOnly={desktopOnly}>
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

export function ProgressStepsHeroDemo() {
  return (
    <div className="py-2 px-4 w-full">
      <ProgressSteps current={2} className="w-full">
        {steps.map((step) => (
          <ProgressSteps.Step key={step.title}>
            <ProgressSteps.Title>{step.title}</ProgressSteps.Title>
            <ProgressSteps.Description>{step.description}</ProgressSteps.Description>
          </ProgressSteps.Step>
        ))}
      </ProgressSteps>
    </div>
  );
}

/** The Overview, with every setting of the progress steps: what the page's examples once showed one by one (Sizes,
 * Vertical, With Icons, Minimal, Icons Only, Colors) are its settings (owner 11.11: «в первом примере можно сразу
 * показать все со всеми настройками»). current is a number, so a slider of 1–4 with its value, as Storybook's range
 * control (owner 11.11 on Textarea's rows). A setting shows only where it acts: the minimal bar has no orientation,
 * connector, icons or text, only its segments, so those four are settings of the default variant; it draws sm as md, so
 * it offers md and lg. A dash draws the connectors ahead of the current step, so at the last step there is none to
 * dash and connectorStyle is not offered. Four columns leave a description about 80px on a phone, so a phone shows the
 * steps vertically and has no orientation setting. Without text each step keeps its title for screen readers. */
export function ProgressStepsOverviewDemo() {
  const phone = usePhoneRows();
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('default');
  const [current, setCurrent] = useState(2);
  const [orientation, setOrientation] = useState<(typeof ORIENTATION_OPTIONS)[number]>('horizontal');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('default');
  const [connectorStyle, setConnectorStyle] = useState<(typeof CONNECTOR_OPTIONS)[number]>('solid');
  const [icons, setIcons] = useState(false);
  const [text, setText] = useState<(typeof TEXT_OPTIONS)[number]>('full');
  const minimal = variant === 'minimal';
  // The minimal bar draws sm as md, so it offers md and lg; a size it does not offer shows as md
  const sizeOptions = minimal ? SIZE_OPTIONS.filter((option) => option !== 'sm') : SIZE_OPTIONS;
  const shownSize = minimal && size === 'sm' ? 'md' : size;
  // A dash draws the connectors ahead of the current step: at the last step every connector is completed and solid
  const connectorShown = !minimal && current < steps.length;
  const shownConnector = connectorShown ? connectorStyle : 'solid';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
        <DemoControlRow name="current">
          <SliderValueControl ariaLabel="current" min={1} max={steps.length} step={1} value={current} onChange={setCurrent} width="min(42vw, 340px)" />
        </DemoControlRow>
        {!minimal && <Segments name="orientation" options={ORIENTATION_OPTIONS} value={orientation} onChange={setOrientation} desktopOnly />}
        <Segments name="size" options={sizeOptions} value={shownSize} onChange={setSize} />
        <Segments name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />
        {connectorShown && <Segments name="connectorStyle" options={CONNECTOR_OPTIONS} value={connectorStyle} onChange={setConnectorStyle} />}
        {!minimal && <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />}
        {!minimal && <Segments name="text" options={TEXT_OPTIONS} value={text} onChange={setText} />}
      </div>
      <div data-demo-stage className="py-8 px-4 w-full flex justify-center">
        {minimal ? (
          <ProgressSteps variant="minimal" current={current} total={steps.length} size={shownSize} color={color} />
        ) : (
          <ProgressSteps
            current={current}
            orientation={phone ? 'vertical' : orientation}
            size={size}
            color={color}
            connectorStyle={shownConnector}
            className="w-full"
          >
            {steps.map((step) => (
              <ProgressSteps.Step key={step.title} icon={icons ? step.icon : undefined}>
                {/* Without text the title stays for screen readers: an icon or a check has no name */}
                <ProgressSteps.Title visuallyHidden={text === 'none'}>{step.title}</ProgressSteps.Title>
                {text === 'full' && <ProgressSteps.Description>{step.description}</ProgressSteps.Description>}
              </ProgressSteps.Step>
            ))}
          </ProgressSteps>
        )}
      </div>
    </>
  );
}

export function ProgressStepsWithNavigationDemo() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const navigationSteps = [
    { title: 'Your details' },
    { title: 'Company details' },
    { title: 'Invite your team' },
    { title: 'Add your socials' },
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <ProgressSteps variant="minimal" current={step} total={totalSteps} />
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          Step {step} of {totalSteps}
        </h3>
        <p className="text-secondary mt-1">
          {navigationSteps[Math.min(step - 1, totalSteps - 1)].title}
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          color="secondary"
          variant="outline"
          className="w-28"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          Previous
        </Button>
        <Button
          color="primary"
          className="w-28"
          onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
          disabled={step === totalSteps}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
