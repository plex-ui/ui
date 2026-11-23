import { useState } from 'react';
import { Badge, Button } from '@plexui/react-native';
import { Flask } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlSelect, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const COLORS = ['secondary', 'success', 'warning', 'danger', 'info', 'discovery', 'caution'] as const;
// The React page's soft, solid and outline, and React Native's counter (an unread count)
const VARIANTS = ['soft', 'solid', 'outline', 'counter'] as const;
const SIZES = ['sm', 'md', 'lg', 'xl'] as const;
// What leads the text: nothing or an icon. The React page also offers a loading indicator, which a React Native
// Badge cannot size and color (see the page's details)
const LEADING_OPTIONS = ['none', 'icon'] as const;
const LABELS = { none: 'New', icon: 'Beta' } as const;
// A badge with a cross is a tag the reader added and can take back
const TAG_LABELS = { none: 'Design', icon: 'Research' } as const;

/**
 * One badge with every setting, as the React page's Overview: `color` and `variant` style it, `size` and `pill` shape
 * it, `leading` puts an icon before the text, and `onRemove` adds the cross and makes the badge a tag; pressing it
 * removes the badge, and Show again brings it back. iOS and Android draw the same Plex badge.
 */
export const Overview = docsDemo(function Overview() {
  const [color, setColor] = useState<(typeof COLORS)[number]>('info');
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('soft');
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [pill, setPill] = useState(false);
  const [leading, setLeading] = useState<(typeof LEADING_OPTIONS)[number]>('none');
  const [onRemove, setOnRemove] = useState(false);
  const [shown, setShown] = useState(true);
  const counter = variant === 'counter';
  // A counter shows a count: no icon, no cross
  const label = counter ? '12' : (onRemove ? TAG_LABELS : LABELS)[leading];
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="color" options={COLORS} value={color} onChange={setColor} />
        <Segments name="variant" options={VARIANTS} value={variant} onChange={setVariant} />
        {/* A counter has one size and one shape */}
        {!counter && <Segments name="size" options={SIZES} value={size} onChange={setSize} />}
        {!counter && <DemoControlBoolean name="pill" value={pill} onChange={setPill} />}
        {!counter && <Segments name="leading" options={LEADING_OPTIONS} value={leading} onChange={setLeading} />}
        {!counter && <DemoControlBoolean name="onRemove" value={onRemove} onChange={setOnRemove} />}
      </div>
      <RNScreen minHeight={168}>
        <View style={{ alignSelf: 'center' }}>
          {shown ? (
            <Badge
              color={color}
              variant={variant}
              size={size}
              pill={pill}
              removeLabel={`Remove ${label}`}
              onRemove={onRemove && !counter ? () => setShown(false) : undefined}
            >
              {leading === 'icon' && !counter && <Flask />}
              {label}
            </Badge>
          ) : (
            <Button color="secondary" variant="outline" size="sm" onPress={() => setShown(true)}>
              Show again
            </Button>
          )}
        </View>
      </RNScreen>
    </>
  );
});
