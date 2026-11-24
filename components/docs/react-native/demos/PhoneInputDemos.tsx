import { useState } from 'react';
import { PhoneInput, Text } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { useNativePlatform } from '../platform';
import { RNScreen, docsDemo } from '../RNScreen';

const FORMATTING = ['platform', 'on', 'off'] as const;

// The docs see @plexui/react-native untyped (types/plexui-react-native.d.ts): the details the demo reads
type PhoneDetails = { possible: boolean; valid: boolean };

/**
 * Every setting on one field, after iOS's Add Phone Number (Settings): the region's row over the number's row; on
 * Android Material's region dropdown over the number's field. Under it the value the field gives: E.164, the region
 * and whether the number fits it.
 */
export const Overview = docsDemo(function Overview() {
  const android = useNativePlatform() === 'android';
  const [formatting, setFormatting] = useState<(typeof FORMATTING)[number]>('platform');
  const [flags, setFlags] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState(false);
  const [value, setValue] = useState('');
  const [country, setCountry] = useState('GB');
  const [details, setDetails] = useState<PhoneDetails | null>(null);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="formatting" options={FORMATTING} value={formatting} onChange={setFormatting} />
        <DemoControlBoolean name="flags" value={flags} onChange={setFlags} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="errorMessage" value={error} onChange={setError} />
      </div>
      <RNScreen grouped={!android} minHeight={360}>
        <PhoneInput
          value={value}
          onChange={(next: string, info: PhoneDetails) => {
            setValue(next);
            setDetails(info);
          }}
          country={country}
          onCountryChange={setCountry}
          formatting={formatting === 'platform' ? undefined : formatting === 'on'}
          flags={flags}
          disabled={disabled}
          errorMessage={error ? 'Enter a valid phone number.' : undefined}
          description="A verification code will be sent to this number."
        />
        <View style={{ marginTop: 24, paddingHorizontal: 20, gap: 4 }}>
          <Text variant="footnote" color="secondary" mono>
            value: {value ? JSON.stringify(value) : '""'}
          </Text>
          <Text variant="footnote" color="secondary" mono>
            country: {country} · possible: {String(details?.possible ?? false)} · valid: {String(details?.valid ?? false)}
          </Text>
        </View>
      </RNScreen>
    </>
  );
});
