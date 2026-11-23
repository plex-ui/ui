import { Fragment, useState } from 'react';
import { Separator, Text, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const DETAILS = [
  ['Version', '0.9.0'],
  ['Published', '2 days ago'],
  ['Bundle', '48 kB'],
  ['License', 'MIT'],
] as const;

/**
 * The React page's Overview: a package's details as the rows of a list, parted by horizontal separators, or as a strip
 * of the same details parted by vertical ones. The example stands alone, as the React example has no Phone preview of
 * its own.
 */
export const Overview = docsDemo(function Overview() {
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [decorative, setDecorative] = useState(true);
  const vertical = orientation === 'vertical';
  // The web's text-tertiary class, not the phone's tertiary label
  const tertiary = useTheme().color('--color-text-tertiary');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="orientation" options={['horizontal', 'vertical'] as const} value={orientation} onChange={setOrientation} />
        <DemoControlBoolean name="decorative" value={decorative} onChange={setDecorative} />
      </div>
      <RNScreen bare>
        <View
          style={{
            flexDirection: vertical ? 'row' : 'column',
            alignItems: vertical ? 'center' : 'stretch',
            alignSelf: vertical ? 'center' : 'stretch',
            gap: vertical ? 16 : 8,
            maxWidth: 384,
          }}
        >
          {DETAILS.map(([term, value], i) => (
            <Fragment key={term}>
              {i > 0 && <Separator orientation={orientation} decorative={decorative} />}
              <View style={{ flexDirection: vertical ? 'column' : 'row', justifyContent: 'space-between', gap: vertical ? 2 : undefined }}>
                <Text size="sm" weight={vertical ? 'medium' : undefined} style={vertical ? { lineHeight: 17 } : undefined}>
                  {term}
                </Text>
                <Text size="sm" color={tertiary} style={vertical ? { lineHeight: 17 } : undefined}>
                  {value}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      </RNScreen>
    </>
  );
});
