'use client';

import { useState } from 'react';
import { ProgressSteps } from '@plexui/ui/components/ProgressSteps';
import { Button } from '@plexui/ui/components/Button';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Bolt, Email, Globe, Users } from '@plexui/ui/components/Icon';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { usePhoneRows } from './PhoneRows';

const steps = [
  { title: 'Your details', description: 'Please provide your name and email' },
  { title: 'Company details', description: 'A few details about your company' },
  { title: 'Invite your team', description: 'Start collaborating with your team' },
  { title: 'Add your socials', description: 'Share posts to your social accounts' },
];

const ORIENTATION_OPTIONS = ['horizontal', 'vertical'] as const;
const SIZE_OPTIONS = ['sm', 'md', 'lg'] as const;
const COLOR_OPTIONS = ['default', 'success'] as const;
const CONNECTOR_OPTIONS = ['solid', 'dashed'] as const;
const CURRENT_OPTIONS = ['1', '2', '3', '4'] as const;

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

export function ProgressStepsBaseDemoWithControls() {
  const [current, setCurrent] = useState<(typeof CURRENT_OPTIONS)[number]>('2');
  const [orientation, setOrientation] = useState<(typeof ORIENTATION_OPTIONS)[number]>('horizontal');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('default');
  const [connectorStyle, setConnectorStyle] = useState<(typeof CONNECTOR_OPTIONS)[number]>('solid');
  // Four steps side by side leave each description about 80px on a phone, so a phone shows them vertically
  const phone = usePhoneRows();

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="current">
          <SegmentedControl<(typeof CURRENT_OPTIONS)[number]>
            value={current}
            onChange={setCurrent}
            aria-label="current"
            size="xs"
          >
            {CURRENT_OPTIONS.map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="orientation" desktopOnly>
          <SegmentedControl<(typeof ORIENTATION_OPTIONS)[number]>
            value={orientation}
            onChange={setOrientation}
            aria-label="orientation"
            size="xs"
          >
            {ORIENTATION_OPTIONS.map((o) => (
              <SegmentedControl.Option key={o} value={o}>
                {o}
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
        <DemoControlRow name="connectorStyle">
          <SegmentedControl<(typeof CONNECTOR_OPTIONS)[number]>
            value={connectorStyle}
            onChange={setConnectorStyle}
            aria-label="connectorStyle"
            size="xs"
          >
            {CONNECTOR_OPTIONS.map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="py-8 px-4 w-full">
        <ProgressSteps
          current={Number(current)}
          orientation={phone ? 'vertical' : orientation}
          size={size}
          color={color}
          connectorStyle={connectorStyle}
          className="w-full"
        >
          {steps.map((step) => (
            <ProgressSteps.Step key={step.title}>
              <ProgressSteps.Title>{step.title}</ProgressSteps.Title>
              <ProgressSteps.Description>{step.description}</ProgressSteps.Description>
            </ProgressSteps.Step>
          ))}
        </ProgressSteps>
      </div>
    </>
  );
}

export function ProgressStepsSizesDemoWithControls() {
  const [current, setCurrent] = useState<(typeof CURRENT_OPTIONS)[number]>('2');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="current">
          <SegmentedControl<(typeof CURRENT_OPTIONS)[number]>
            value={current}
            onChange={setCurrent}
            aria-label="current"
            size="xs"
          >
            {CURRENT_OPTIONS.map((c) => (
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
      </div>
      <div data-demo-stage className="py-8 px-4 w-full">
        <ProgressSteps current={Number(current)} size={size} className="w-full">
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 1</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 2</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 3</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 4</ProgressSteps.Title>
          </ProgressSteps.Step>
        </ProgressSteps>
      </div>
    </>
  );
}

export function ProgressStepsMinimalDemoWithControls() {
  const [current, setCurrent] = useState<(typeof CURRENT_OPTIONS)[number]>('3');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('default');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="current">
          <SegmentedControl<(typeof CURRENT_OPTIONS)[number]>
            value={current}
            onChange={setCurrent}
            aria-label="current"
            size="xs"
          >
            {CURRENT_OPTIONS.map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c}
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
      </div>
      <div data-demo-stage className="py-10 px-4 flex justify-center">
        <ProgressSteps variant="minimal" current={Number(current)} total={4} color={color} />
      </div>
    </>
  );
}

export function ProgressStepsVerticalDemo() {
  return (
    <div className="w-full h-full flex items-center justify-center py-6 px-4">
      <div className="flex flex-wrap justify-center gap-20">
        <div>
          <div className="mb-4 text-tertiary text-sm">Default</div>
          <ProgressSteps current={2} orientation="vertical">
            {steps.map((step) => (
              <ProgressSteps.Step key={step.title}>
                <ProgressSteps.Title>{step.title}</ProgressSteps.Title>
                <ProgressSteps.Description>{step.description}</ProgressSteps.Description>
              </ProgressSteps.Step>
            ))}
          </ProgressSteps>
        </div>
        <div>
          <div className="mb-4 text-tertiary text-sm">With dashed connector</div>
          <ProgressSteps current={3} orientation="vertical" connectorStyle="dashed">
            {steps.map((step) => (
              <ProgressSteps.Step key={step.title}>
                <ProgressSteps.Title>{step.title}</ProgressSteps.Title>
                <ProgressSteps.Description>{step.description}</ProgressSteps.Description>
              </ProgressSteps.Step>
            ))}
          </ProgressSteps>
        </div>
      </div>
    </div>
  );
}

export function ProgressStepsWithIconsDemo() {
  // A phone shows the steps vertically, where each description has room
  const phone = usePhoneRows();
  return (
    <div className="py-6 px-4 w-full">
      <ProgressSteps current={3} orientation={phone ? 'vertical' : 'horizontal'} className="w-full">
        <ProgressSteps.Step icon={<Email />}>
          <ProgressSteps.Title>Your details</ProgressSteps.Title>
          <ProgressSteps.Description>Please provide your name and email</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step icon={<Globe />}>
          <ProgressSteps.Title>Company details</ProgressSteps.Title>
          <ProgressSteps.Description>Website and location</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step icon={<Users />}>
          <ProgressSteps.Title>Invite your team</ProgressSteps.Title>
          <ProgressSteps.Description>Start collaborating</ProgressSteps.Description>
        </ProgressSteps.Step>
        <ProgressSteps.Step icon={<Bolt />}>
          <ProgressSteps.Title>Get started</ProgressSteps.Title>
          <ProgressSteps.Description>Ready to go</ProgressSteps.Description>
        </ProgressSteps.Step>
      </ProgressSteps>
    </div>
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

export function ProgressStepsIconsOnlyDemo() {
  return (
    <div className="py-6 px-4 w-full">
      <ProgressSteps current={2} className="w-full">
        <ProgressSteps.Step />
        <ProgressSteps.Step />
        <ProgressSteps.Step />
        <ProgressSteps.Step />
      </ProgressSteps>
    </div>
  );
}

export function ProgressStepsSuccessColorDemo() {
  return (
    <div className="flex flex-col gap-12 py-6 px-4 w-full max-w-[900px]">
      <div>
        <div className="mb-4 text-tertiary text-sm">Default</div>
        <ProgressSteps current={3} className="w-full">
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 1</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 2</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 3</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 4</ProgressSteps.Title>
          </ProgressSteps.Step>
        </ProgressSteps>
      </div>
      <div>
        <div className="mb-4 text-tertiary text-sm">Success</div>
        <ProgressSteps current={3} color="success" className="w-full">
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 1</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 2</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 3</ProgressSteps.Title>
          </ProgressSteps.Step>
          <ProgressSteps.Step>
            <ProgressSteps.Title>Step 4</ProgressSteps.Title>
          </ProgressSteps.Step>
        </ProgressSteps>
      </div>
    </div>
  );
}
