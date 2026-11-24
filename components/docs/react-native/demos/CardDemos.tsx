import { useContext, useState, type ReactNode } from 'react';
import { Button, Card, IconButton, Text, Toolbar, useTheme } from '@plexui/react-native';
import { MoreIcon } from './MoreIcon';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DemoControlBoolean, DemoControlSelect, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { NativeScreenTitleContext } from '../platform';

const VARIANTS = ['outline', 'solid', 'ghost'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;
const FOOTERS = ['none', 'one', 'two'] as const;

/**
 * A grouped screen of an app, as the React page's Phone view stands its card on a grouped Page: the screen's top bar
 * without a title, then the content within the 16pt margins, from the top down.
 */
function GroupedScreen({ bar, children }: { bar: boolean; children: ReactNode }) {
  const android = useTheme().isAndroid;
  const insets = useSafeAreaInsets();
  return (
    <>
      {bar ? <Toolbar background="none" /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: android ? 12 : 16, paddingBottom: insets.bottom + 16, gap: 12 }}>
        {children}
      </ScrollView>
    </>
  );
}

/**
 * One card with every setting, as the React page's Overview: its look (`variant`, `size`), its parts (description,
 * content, footer, action) and a card that is one button. A card that is a button holds no buttons of its own, so the
 * footer and the action are offered without `onPress`. On iOS an outline card is a section of an inset grouped list
 * on the grouped background; on Android a Material 3 card.
 */
export const Overview = docsDemo(function Overview() {
  const { page } = useContext(NativeScreenTitleContext);
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('outline');
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [description, setDescription] = useState(true);
  const [content, setContent] = useState(false);
  const [footer, setFooter] = useState<(typeof FOOTERS)[number]>('two');
  const [action, setAction] = useState(false);
  const [pressable, setPressable] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANTS} value={variant} onChange={setVariant} />
        <Segments name="size" options={SIZES} value={size} onChange={setSize} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="content" value={content} onChange={setContent} />
        {!pressable && <Segments name="footer" options={FOOTERS} value={footer} onChange={setFooter} />}
        {!pressable && <DemoControlBoolean name="action" value={action} onChange={setAction} />}
        <DemoControlBoolean name="onPress" value={pressable} onChange={setPressable} />
      </div>
      <RNScreen screen grouped minHeight={168}>
        <GroupedScreen bar={page}>
          <Card variant={variant} size={size} onPress={pressable ? () => {} : undefined} accessibilityLabel={pressable ? 'Project activity' : undefined}>
            <Card.Header>
              <Card.Title>Project activity</Card.Title>
              {description && <Card.Description>Your team opened 12 issues and closed 8 pull requests over the last 7 days.</Card.Description>}
              {action && !pressable && (
                <Card.Action>
                  <IconButton icon={<MoreIcon />} color="secondary" variant="ghost" size="sm" accessibilityLabel="More" />
                </Card.Action>
              )}
            </Card.Header>
            {content && (
              <Card.Content>
                <Text variant="subheadline">Most of the work landed on Tuesday, in the release branch.</Text>
              </Card.Content>
            )}
            {footer !== 'none' && !pressable && (
              <Card.Footer>
                <Button color="primary" variant="solid" size="sm">
                  View report
                </Button>
                {footer === 'two' && (
                  <Button color="secondary" variant="outline" size="sm">
                    Dismiss
                  </Button>
                )}
              </Card.Footer>
            )}
          </Card>
        </GroupedScreen>
      </RNScreen>
    </>
  );
});

const COLORS = ['accent', 'primary', 'info', 'success', 'warning', 'caution', 'danger', 'discovery'] as const;

/**
 * A card filled with a color of the palette, an offer that stands out on the screen: the title, the description and
 * the description in the color made to stand on that fill.
 */
export const Colored = docsDemo(function Colored() {
  const { page } = useContext(NativeScreenTitleContext);
  const [color, setColor] = useState<(typeof COLORS)[number]>('accent');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="color" options={COLORS} value={color} onChange={setColor} />
      </div>
      <RNScreen screen grouped minHeight={168}>
        <GroupedScreen bar={page}>
          <Card color={color}>
            <Card.Header>
              <Card.Title>Upgrade to Pro</Card.Title>
              <Card.Description>Unlimited projects, a shared library and priority support for your team.</Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button color="secondary" variant="solid" size="sm">
                See plans
              </Button>
            </Card.Footer>
          </Card>
        </GroupedScreen>
      </RNScreen>
    </>
  );
});
