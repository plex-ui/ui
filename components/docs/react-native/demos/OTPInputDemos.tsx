import { useState } from 'react';
import { OTPInput, Text, useTheme } from '@plexui/react-native';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

type Preset = 'empty' | 'filled' | 'custom';
const GROUPINGS = ['none', '3+3'] as const;
type Grouping = (typeof GROUPINGS)[number];

/**
 * The Overview, with every setting of the React page's: a code is entered in a verification step, so the field
 * stands under the step's title and the recipient the code went to. Empty or Filled replaces the code with a preset,
 * `grouping` splits the cells into two groups of three, and the error and disabled settings keep the code entered.
 */
export const Overview = docsDemo(function Overview() {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [grouping, setGrouping] = useState<Grouping>('none');
  const preset: Preset = value === '' ? 'empty' : value === '488030' ? 'filled' : 'custom';
  const applyPreset = (next: Preset) => {
    if (next !== 'custom') setValue(next === 'filled' ? '488030' : '');
  };
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="preset">
          <SegmentedControl<Preset> value={preset} onChange={applyPreset} aria-label="preset" size="xs">
            <SegmentedControl.Option value="empty">Empty</SegmentedControl.Option>
            <SegmentedControl.Option value="filled">Filled</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <Segments name="grouping" options={GROUPINGS} value={grouping} onChange={setGrouping} />
        <DemoControlBoolean name="error" value={error} onChange={setError} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen minHeight={168}>
        <VerificationStep value={value} onChange={setValue} grouping={grouping} error={error} disabled={disabled} />
      </RNScreen>
    </>
  );
});

/** The step's title, the recipient and the code, inside the screen so that they take its theme */
function VerificationStep({ value, onChange, grouping, error, disabled }: {
  value: string;
  onChange: (value: string) => void;
  grouping: Grouping;
  error: boolean;
  disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 24 }}>
      <View style={{ gap: 4 }}>
        <Text size="lg" weight="semibold" align="center">
          Enter the code
        </Text>
        {/* The React example's secondary text (`text-secondary`), not the translucent label of a list */}
        <Text size="sm" color={theme.colors.textSecondary} align="center">
          We sent a 6-digit code to alex.johnson@example.com
        </Text>
      </View>
      <OTPInput
        aria-label="Verification code"
        value={value}
        onChange={onChange}
        grouping={grouping === '3+3' ? [3, 3] : undefined}
        invalid={error}
        errorMessage={error ? 'Invalid verification code.' : undefined}
        disabled={disabled}
      />
    </View>
  );
}
