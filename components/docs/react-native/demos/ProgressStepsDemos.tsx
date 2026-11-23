import { useState } from 'react';
import { Button, ProgressSteps, Text, useTheme } from '@plexui/react-native';
import { Bolt, Email, Globe, Users } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from '../../ButtonDemos';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

const steps = [
  { title: 'Your details', description: 'Please provide your name and email', icon: <Email /> },
  { title: 'Company details', description: 'A few details about your company', icon: <Globe /> },
  { title: 'Invite your team', description: 'Start collaborating with your team', icon: <Users /> },
  { title: 'Add your socials', description: 'Share posts to your social accounts', icon: <Bolt /> },
];

const VARIANT_OPTIONS = ['default', 'minimal'] as const;
const SIZE_OPTIONS = ['sm', 'md', 'lg'] as const;
const COLOR_OPTIONS = ['default', 'success'] as const;
const CONNECTOR_OPTIONS = ['solid', 'dashed'] as const;
// The text of each step: its title and description, the title alone, or none (the indicators alone)
const TEXT_OPTIONS = ['full', 'title', 'none'] as const;

/**
 * The Overview, as the React page's Phone view: the steps stand vertically, as four columns cannot hold a description
 * on a phone, so `orientation`, a desktop setting there, is not offered. The minimal bar has no connector, icons or
 * text, and draws `sm` as `md`, so it offers `md` and `lg`; at the last step every connector is completed and solid,
 * so `connectorStyle` is not offered. Without text each step keeps its title for screen readers.
 */
export const Overview = docsDemo(function Overview() {
  const [variant, setVariant] = useState<(typeof VARIANT_OPTIONS)[number]>('default');
  const [current, setCurrent] = useState(2);
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('default');
  const [connectorStyle, setConnectorStyle] = useState<(typeof CONNECTOR_OPTIONS)[number]>('solid');
  const [icons, setIcons] = useState(false);
  const [text, setText] = useState<(typeof TEXT_OPTIONS)[number]>('full');
  const minimal = variant === 'minimal';
  const sizeOptions = minimal ? SIZE_OPTIONS.filter((option) => option !== 'sm') : SIZE_OPTIONS;
  const shownSize = minimal && size === 'sm' ? 'md' : size;
  const connectorShown = !minimal && current < steps.length;
  const shownConnector = connectorShown ? connectorStyle : 'solid';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANT_OPTIONS} value={variant} onChange={setVariant} />
        <DemoControlRow name="current">
          <SliderValueControl ariaLabel="current" min={1} max={steps.length} step={1} value={current} onChange={setCurrent} width="min(42vw, 340px)" />
        </DemoControlRow>
        <Segments name="size" options={sizeOptions} value={shownSize} onChange={setSize} />
        <Segments name="color" options={COLOR_OPTIONS} value={color} onChange={setColor} />
        {connectorShown && <Segments name="connectorStyle" options={CONNECTOR_OPTIONS} value={connectorStyle} onChange={setConnectorStyle} />}
        {!minimal && <DemoControlBoolean name="icons" value={icons} onChange={setIcons} />}
        {!minimal && <Segments name="text" options={TEXT_OPTIONS} value={text} onChange={setText} />}
      </div>
      <RNScreen minHeight={168}>
        {minimal ? (
          <View style={{ alignItems: 'center' }}>
            <ProgressSteps variant="minimal" current={current} total={steps.length} size={shownSize} color={color} />
          </View>
        ) : (
          <ProgressSteps current={current} orientation="vertical" size={size} color={color} connectorStyle={shownConnector}>
            {steps.map((step) => (
              <ProgressSteps.Step key={step.title} icon={icons ? step.icon : undefined}>
                {/* Without text the title stays for screen readers: an icon or a check has no name */}
                <ProgressSteps.Title visuallyHidden={text === 'none'}>{step.title}</ProgressSteps.Title>
                {text === 'full' && <ProgressSteps.Description>{step.description}</ProgressSteps.Description>}
              </ProgressSteps.Step>
            ))}
          </ProgressSteps>
        )}
      </RNScreen>
    </>
  );
});

const navigationSteps = ['Your details', 'Company details', 'Invite your team', 'Add your socials'];

/** With Navigation: the minimal bar over the step's name, and the buttons that move between the steps */
export function WithNavigation() {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  return (
    <View style={{ alignItems: 'center', gap: 24 }}>
      <ProgressSteps variant="minimal" current={step} total={totalSteps} />
      <View style={{ alignItems: 'center', gap: 4 }}>
        {/* The page's h3 (text-lg semibold, 18/28 in the text color) and the secondary text under it */}
        <Text accessibilityRole="header" size="lg" weight="semibold" align="center" color={theme.color('--color-text')} style={{ lineHeight: 28 }}>
          {`Step ${step} of ${totalSteps}`}
        </Text>
        <Text size="md" color={theme.color('--color-text-secondary')} align="center">
          {navigationSteps[Math.min(step - 1, totalSteps - 1)]}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 112 }}>
          <Button block color="secondary" variant="outline" disabled={step === 1} onPress={() => setStep((s) => Math.max(1, s - 1))}>
            Previous
          </Button>
        </View>
        <View style={{ width: 112 }}>
          <Button block color="primary" disabled={step === totalSteps} onPress={() => setStep((s) => Math.min(totalSteps, s + 1))}>
            Next
          </Button>
        </View>
      </View>
    </View>
  );
}
