import { useContext, useState, type ReactNode } from 'react';
import { Button, Card, IconButton, ProgressScale, Text, Toolbar, useTheme } from '@plexui/react-native';
import { MoreIcon } from './MoreIcon';
import { Clock } from '@plexui/react-native/icons';
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

const RESULTS = [
  { title: 'Sleep', value: '7 h 40', share: 72, text: 'Within your usual range for the last two weeks.' },
  { title: 'Steps', value: '8,412', share: 48, text: 'About the same as last week.' },
  { title: 'Resting heart rate', value: '58', share: 30, text: 'A little lower than your average.' },
] as const;
const BANDS = ['Low', 'Usual', 'High'];

/**
 * Group: results as cards, each a title with its value at the end, a scale under them and a line about it, joined in
 * one inset grouped section as Health's summaries; `joined` off sets them apart.
 */
export const Group = docsDemo(function Group() {
  const { page } = useContext(NativeScreenTitleContext);
  const [joined, setJoined] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="joined" value={joined} onChange={setJoined} />
      </div>
      <RNScreen screen grouped minHeight={560}>
        <GroupedScreen bar={page}>
          <Card.Group joined={joined}>
            {RESULTS.map((result) => (
              <Card key={result.title}>
                <Card.Header>
                  <Card.Title>{result.title}</Card.Title>
                  <Card.Value>{result.value}</Card.Value>
                </Card.Header>
                <ProgressScale aria-label={result.title} bands={BANDS} value={result.share} />
                <Card.Content>
                  <Text>{result.text}</Text>
                </Card.Content>
              </Card>
            ))}
          </Card.Group>
        </GroupedScreen>
      </RNScreen>
    </>
  );
});

const FILLS = ['picture', 'gradient'] as const;

/**
 * Suggestion: a media card as Fitness+ and Journal suggest a session, the media filling the card, Title 2 and a line
 * over a scrim from its foot, the time and Start at the end (Android: Material's elevated card, the words under the
 * media). `fill` gradient draws the media from two colors where there is no picture.
 */
export const Suggestion = docsDemo(function Suggestion() {
  const { page } = useContext(NativeScreenTitleContext);
  const [fill, setFill] = useState<(typeof FILLS)[number]>('gradient');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="fill" options={FILLS} value={fill} onChange={setFill} />
      </div>
      <RNScreen screen grouped minHeight={620}>
        <GroupedScreen bar={page}>
          <SuggestionCard fill={fill} />
        </GroupedScreen>
      </RNScreen>
    </>
  );
});

/** The suggestion card, inside the screen: its theme is the screen's platform's */
function SuggestionCard({ fill }: { fill: (typeof FILLS)[number] }) {
  const theme = useTheme();
  return (
    <Card variant={theme.isAndroid ? 'elevated' : 'outline'}>
      <Card.Media
        size="lg"
        source={fill === 'picture' ? { uri: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=70' } : undefined}
        fill={fill === 'gradient' ? 'linear-gradient(160deg, #ff8a5c 0%, #c2185b 100%)' : undefined}
        title="Morning stretch"
        description="Loosen up before the day starts"
        meta={
          <>
            <Clock size={16} />
            <Text variant="footnote">10 min</Text>
          </>
        }
        action={
          <Button size="sm" pill color={theme.isAndroid ? 'secondary' : 'primary'} variant={theme.isAndroid ? 'soft' : 'solid'}>
            Start
          </Button>
        }
      />
    </Card>
  );
}
